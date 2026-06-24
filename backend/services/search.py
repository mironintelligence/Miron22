import os
from typing import List, Dict, Any, Optional
import psycopg2
from psycopg2.extras import RealDictCursor


def _sanitize_query(text: str) -> str:
    value = (text or "").replace("\x00", " ").strip()
    value = " ".join(value.split())
    return value[:500]


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
            filters.append("court ILIKE %s")
            params.append(f"%{court}%")
        if chamber:
            filters.append("chamber ILIKE %s")
            params.append(f"%{chamber}%")
        if not filters:
            return "", params
        return " AND " + " AND ".join(filters), params

    def _keyword_search(self, cur, query: str, filter_sql: str, params: List[Any], limit: int):
        sql = f"""
            SELECT id,
                   full_text AS clean_text,
                   summary,
                   file_no AS case_number,
                   decision_no AS decision_number,
                   CASE WHEN full_text ILIKE '%%ONAMA%%' THEN 'ONAMA'
                        WHEN full_text ILIKE '%%BOZMA%%' THEN 'BOZMA' ELSE '' END AS outcome,
                   court, chamber, decision_date,
                   ts_rank_cd(to_tsvector('turkish', full_text),
                              plainto_tsquery('turkish', %s)) AS keyword_rank
            FROM decisions
            WHERE to_tsvector('turkish', full_text) @@ plainto_tsquery('turkish', %s)
            {filter_sql}
            ORDER BY keyword_rank DESC
            LIMIT %s
        """
        cur.execute(sql, [query, query] + params + [limit])
        return {str(row["id"]): dict(row) for row in cur.fetchall()}

    def _ilike_search(self, cur, query: str, filter_sql: str, params: List[Any], limit: int):
        q = f"%{query}%"
        sql = f"""
            SELECT id,
                   full_text AS clean_text,
                   summary,
                   file_no AS case_number,
                   decision_no AS decision_number,
                   CASE WHEN full_text ILIKE '%%ONAMA%%' THEN 'ONAMA'
                        WHEN full_text ILIKE '%%BOZMA%%' THEN 'BOZMA' ELSE '' END AS outcome,
                   court, chamber, decision_date,
                   0.0 AS keyword_rank
            FROM decisions
            WHERE (
                full_text ILIKE %s
                OR COALESCE(summary, '') ILIKE %s
                OR COALESCE(decision_no, '') ILIKE %s
                OR COALESCE(file_no, '') ILIKE %s
            )
            {filter_sql}
            ORDER BY decision_date DESC NULLS LAST
            LIMIT %s
        """
        cur.execute(sql, [q, q, q, q] + params + [limit])
        return {str(row["id"]): dict(row) for row in cur.fetchall()}

    def search(self, query: str, year: Optional[int] = None, court: Optional[str] = None, chamber: Optional[str] = None, limit: int = 50) -> Dict[str, Any]:
        q = _sanitize_query(query)
        if not q:
            return {"query": "", "results": [], "message": "empty_query"}

        filter_sql, params = self._build_filters(year, court, chamber)

        try:
            conn = self._connect()
        except Exception as e:
            print(f"[ERROR] DB Connection failed: {e}")
            return {"query": q, "results": [], "message": "db_connection_failed"}

        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            # Decisions table uses full_text + GIN FTS; no embedding column exists.
            keyword = self._keyword_search(cur, q, filter_sql, params, limit)
            if not keyword:
                keyword = self._ilike_search(cur, q, filter_sql, params, limit)

            if not keyword:
                return {"query": q, "results": [], "message": "no_results"}

            max_kw = 0.0
            for row in keyword.values():
                try:
                    max_kw = max(max_kw, float(row.get("keyword_rank") or 0.0))
                except Exception:
                    pass

            results = []
            for row in keyword.values():
                kw_score = float(row.get("keyword_rank") or 0.0)
                kw_norm = 0.0 if max_kw <= 0 else kw_score / max_kw
                row["semantic_score"] = 0.0
                row["keyword_rank"] = kw_norm
                row["final_score"] = kw_norm
                results.append(row)

            sorted_results = sorted(results, key=lambda x: x.get("final_score", 0.0), reverse=True)
            return {"query": q, "results": sorted_results[:10]}

        except Exception as e:
            print(f"[ERROR] Search query failed: {e}")
            return {"query": q, "results": [], "message": "search_execution_failed"}
        finally:
            if cur:
                cur.close()
            if conn:
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

    def search(self, query: str, year: Optional[int] = None, court: Optional[str] = None, chamber: Optional[str] = None, limit: int = 10) -> Dict[str, Any]:
        return self._engine.search(query=query, year=year, court=court, chamber=chamber, limit=limit)


search_engine = YargitaySearchEngine()
