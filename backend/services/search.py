import os
from typing import List, Dict, Any, Optional
import psycopg2
from psycopg2.extras import RealDictCursor

try:
    from backend.openai_client import get_openai_client
except ImportError:
    from openai_client import get_openai_client

def _sanitize_query(text: str) -> str:
    value = (text or "").replace("\x00", " ").strip()
    value = " ".join(value.split())
    return value[:500]

def _vector_literal(vec: List[float]) -> str:
    return "[" + ",".join(f"{v:.8f}" for v in vec) + "]"

def get_embedding(text: str) -> List[float]:
    client = get_openai_client()
    if not client:
        raise RuntimeError("OpenAI client not configured")
    payload = text.replace("\n", " ")
    resp = client.embeddings.create(input=[payload], model="text-embedding-3-large")
    return resp.data[0].embedding

class YargitaySearchEngine:
    def __init__(self, db_url: Optional[str] = None):
        self.db_url = db_url or os.getenv("DATABASE_URL")

    def _connect(self):
        if not self.db_url:
            raise RuntimeError("DATABASE_URL missing")
        return psycopg2.connect(self.db_url)

    def _build_filters(self, year: Optional[int], court: Optional[str], chamber: Optional[str]):
        filters = []
        params: List[Any] = []
        if year:
            filters.append("EXTRACT(YEAR FROM decision_date) = %s")
            params.append(year)
        if court:
            filters.append("court = %s")
            params.append(court)
        if chamber:
            filters.append("chamber = %s")
            params.append(chamber)
        if not filters:
            return "", params
        return " AND " + " AND ".join(filters), params

    def _semantic_search(self, cur, vector: str, filter_sql: str, params: List[Any], limit: int):
        sql = f"""
            SELECT id, clean_text, summary, outcome, decision_number, case_number, court, chamber, decision_date,
                1 - (embedding <=> %s::vector) AS semantic_score
            FROM decisions
            WHERE 1=1 {filter_sql}
            ORDER BY embedding <=> %s::vector
            LIMIT %s
        """
        cur.execute(sql, [vector] + params + [vector, limit])
        return {row["id"]: dict(row) for row in cur.fetchall()}

    def _keyword_search(self, cur, query: str, filter_sql: str, params: List[Any], limit: int):
        sql = f"""
            SELECT id, clean_text, summary, outcome, decision_number, case_number, court, chamber, decision_date,
                ts_rank_cd(to_tsvector('turkish', clean_text), plainto_tsquery('turkish', %s)) AS keyword_rank
            FROM decisions
            WHERE to_tsvector('turkish', clean_text) @@ plainto_tsquery('turkish', %s)
            {filter_sql}
            ORDER BY keyword_rank DESC
            LIMIT %s
        """
        cur.execute(sql, [query, query] + params + [limit])
        return {row["id"]: dict(row) for row in cur.fetchall()}

    def search(self, query: str, year: Optional[int] = None, court: Optional[str] = None, chamber: Optional[str] = None, limit: int = 50) -> Dict[str, Any]:
        q = _sanitize_query(query)
        if not q:
            return {"query": "", "results": [], "message": "empty_query"}
        embedding = get_embedding(q)
        vector = _vector_literal(embedding)
        filter_sql, params = self._build_filters(year, court, chamber)
        conn = self._connect()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            semantic = self._semantic_search(cur, vector, filter_sql, params, limit)
            keyword = self._keyword_search(cur, q, filter_sql, params, limit)
            merged: Dict[str, Dict[str, Any]] = {}
            all_ids = set(semantic.keys()) | set(keyword.keys())
            max_kw = 0.0
            for row in keyword.values():
                try:
                    max_kw = max(max_kw, float(row.get("keyword_rank") or 0.0))
                except Exception:
                    pass
            for row_id in all_ids:
                base = {}
                sem_score = 0.0
                kw_score = 0.0
                if row_id in semantic:
                    base.update(semantic[row_id])
                    sem_score = float(semantic[row_id].get("semantic_score") or 0.0)
                if row_id in keyword:
                    base.update(keyword[row_id])
                    kw_score = float(keyword[row_id].get("keyword_rank") or 0.0)
                kw_norm = 0.0 if max_kw <= 0 else kw_score / max_kw
                final_score = (sem_score * 0.65) + (kw_norm * 0.35)
                base["semantic_score"] = sem_score
                base["keyword_rank"] = kw_norm
                base["final_score"] = final_score
                merged[row_id] = base
            sorted_results = sorted(merged.values(), key=lambda x: x.get("final_score", 0.0), reverse=True)
            if not sorted_results:
                semantic_only = self._semantic_search(cur, vector, filter_sql, params, 10)
                semantic_sorted = sorted(
                    semantic_only.values(),
                    key=lambda x: x.get("semantic_score", 0.0),
                    reverse=True,
                )
                for item in semantic_sorted:
                    item["keyword_rank"] = 0.0
                    item["final_score"] = float(item.get("semantic_score") or 0.0)
                return {"query": q, "results": semantic_sorted[:10], "message": "semantic_fallback" if semantic_sorted else "no_results"}
            return {"query": q, "results": sorted_results[:10]}
        finally:
            cur.close()
            conn.close()

class HybridSearchEngine:
    def __init__(self, db_url: Optional[str] = None):
        self._engine = YargitaySearchEngine(db_url=db_url)

    def hybrid_search(
        self,
        query: str,
        alpha: float = 0.65,
        year: Optional[int] = None,
        court: Optional[str] = None,
        chamber: Optional[str] = None,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        r = self._engine.search(query=query, year=year, court=court, chamber=chamber, limit=max(limit, 10))
        out: List[Dict[str, Any]] = []
        for item in (r.get("results") or [])[:limit]:
            if not isinstance(item, dict):
                continue
            content = item.get("clean_text") or item.get("summary") or ""
            out.append(
                {
                    "id": item.get("id"),
                    "content": content,
                    "score": float(item.get("final_score") or 0.0),
                    "semantic_score": float(item.get("semantic_score") or 0.0),
                    "keyword_rank": float(item.get("keyword_rank") or 0.0),
                    "meta": {
                        "court": item.get("court"),
                        "chamber": item.get("chamber"),
                        "decision_number": item.get("decision_number"),
                        "case_number": item.get("case_number"),
                        "outcome": item.get("outcome"),
                        "decision_date": item.get("decision_date"),
                    },
                }
            )
        return out

    def search_vector(
        self,
        query: str,
        top_k: int = 5,
        year: Optional[int] = None,
        court: Optional[str] = None,
        chamber: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        q = _sanitize_query(query)
        if not q:
            return []
        embedding = get_embedding(q)
        vector = _vector_literal(embedding)
        filter_sql, params = self._engine._build_filters(year, court, chamber)
        conn = self._engine._connect()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            rows = self._engine._semantic_search(cur, vector, filter_sql, params, top_k)
            sorted_rows = sorted(rows.values(), key=lambda x: float(x.get("semantic_score") or 0.0), reverse=True)
            out: List[Dict[str, Any]] = []
            for row in sorted_rows[:top_k]:
                content = row.get("clean_text") or row.get("summary") or ""
                out.append(
                    {
                        "score": float(row.get("semantic_score") or 0.0),
                        "doc": {
                            "id": row.get("id"),
                            "content": content,
                            "meta": {
                                "court": row.get("court"),
                                "chamber": row.get("chamber"),
                                "decision_number": row.get("decision_number"),
                                "case_number": row.get("case_number"),
                                "outcome": row.get("outcome"),
                                "decision_date": row.get("decision_date"),
                            },
                        },
                    }
                )
            return out
        finally:
            cur.close()
            conn.close()

search_engine = YargitaySearchEngine()
