from fastapi import APIRouter, Query
from typing import Optional, List
from db import get_db_cursor
from openai_client import get_openai_client, get_embedding_client
from llm_gateway import chat_completions_create
from pydantic import BaseModel

router = APIRouter(prefix="/api/yargitay", tags=["Yargıtay Search & RAG"])

def get_embedding(text: str):
    client = get_embedding_client()
    if not client:
        return None
    try:
        response = client.embeddings.create(input=text, model="text-embedding-3-small")
        return response.data[0].embedding
    except Exception as e:
        print(f"Embedding error: {e}")
        return None

@router.get("/search")
def search_decisions(
    q: str = Query(..., description="Arama metni"),
    year: Optional[int] = Query(None),
    chamber: Optional[str] = Query(None),
    limit: int = Query(15, le=50),
):
    """
    Yargıtay ve Danıştay kararı tam metin araması (Turkish GIN full-text search).
    """
    q = (q or "").strip()
    if not q:
        return []

    where_clauses = [
        "court IN ('Yargıtay', 'Yargitay', 'Danıştay')",
        "to_tsvector('turkish', full_text) @@ plainto_tsquery('turkish', %s)",
    ]
    params: list = [q]

    if year:
        where_clauses.append("decision_date >= %s AND decision_date < %s")
        params += [f"{year}-01-01", f"{year + 1}-01-01"]

    if chamber:
        where_clauses.append("chamber ILIKE %s")
        params.append(f"%{chamber}%")

    where_sql = " AND ".join(where_clauses)
    # second %s for ts_rank, then LIMIT
    params += [q, limit]

    sql = f"""
        SELECT id, court, chamber, file_no, decision_no, decision_date, summary, full_text,
               CASE WHEN full_text ILIKE '%%ONAMA%%' THEN 'ONAMA'
                    WHEN full_text ILIKE '%%BOZMA%%' THEN 'BOZMA'
                    ELSE '' END AS outcome,
               ts_rank(to_tsvector('turkish', full_text),
                       plainto_tsquery('turkish', %s)) AS score
        FROM decisions
        WHERE {where_sql}
        ORDER BY score DESC
        LIMIT %s
    """

    results: List[dict] = []
    try:
        with get_db_cursor(write=False) as cur:
            cur.execute(sql, params)
            rows = cur.fetchall() or []

        if not rows:
            # FTS sonuç vermediyse ILIKE fallback
            ilike = f"%{q}%"
            fallback_params = [ilike, ilike, ilike]
            fallback_where = ["court IN ('Yargıtay', 'Yargitay', 'Danıştay')"]
            if year:
                fallback_where.append("decision_date >= %s AND decision_date < %s")
                fallback_params += [f"{year}-01-01", f"{year + 1}-01-01"]
            if chamber:
                fallback_where.append("chamber ILIKE %s")
                fallback_params.append(f"%{chamber}%")
            fallback_params.append(limit)
            fallback_sql = f"""
                SELECT id, court, chamber, file_no, decision_no, decision_date, summary, full_text,
                       CASE WHEN full_text ILIKE '%%ONAMA%%' THEN 'ONAMA'
                            WHEN full_text ILIKE '%%BOZMA%%' THEN 'BOZMA'
                            ELSE '' END AS outcome,
                       0.0 AS score
                FROM decisions
                WHERE {' AND '.join(fallback_where)}
                  AND (summary ILIKE %s OR full_text ILIKE %s OR decision_no ILIKE %s)
                LIMIT %s
            """
            with get_db_cursor(write=False) as cur:
                cur.execute(fallback_sql, fallback_params)
                rows = cur.fetchall() or []

        for r in rows:
            summary = r.get("summary") or (r.get("full_text") or "")[:200]
            results.append({
                "id": str(r.get("id") or ""),
                "court": r.get("court") or "Yargıtay",
                "chamber": r.get("chamber") or "",
                "decision_number": r.get("decision_no") or "",
                "case_number": r.get("file_no") or "",
                "date": str(r.get("decision_date") or ""),
                "summary": summary[:300],
                "full_text": (r.get("full_text") or "")[:3000],
                "outcome": r.get("outcome") or "",
                "final_score": float(r.get("score") or 0),
            })
    except Exception as e:
        print(f"[yargitay_search] search error: {e}")

    return {"results": results, "total": len(results)}


class AiAnalysisRequest(BaseModel):
    decision_text: str
    question: Optional[str] = None


@router.post("/analyze")
def analyze_decision(payload: AiAnalysisRequest):
    """Seçilen kararın detaylı AI analizi."""
    client = get_openai_client()  # Groq via OpenAI SDK (llm_gateway fallback handles routing)
    if not client:
        return {"analysis": "AI servisi şu an kullanılamıyor."}

    prompt = f"""
Aşağıdaki Yargıtay karar metnini analiz et:

METİN:
{payload.decision_text[:5000]}

SORU (Varsa): {payload.question or "—"}

Şu başlıklar altında Markdown formatında analiz yap:
1. **Hukuki Sorun:** Dava konusu ne?
2. **Mahkemenin Mantığı:** Yargıtay hangi gerekçeyle bu sonuca varmış?
3. **Kritik İlkeler:** Hangi hukuk ilkeleri vurgulanmış?
4. **Avukat İçin İpucu:** Benzer bir davada nelere dikkat edilmeli?
"""

    try:
        completion = chat_completions_create(
            client,
            model="deepseek-r1-distill-llama-70b",
            messages=[{"role": "user", "content": prompt}],
        )
        return {"analysis": completion.choices[0].message.content}
    except Exception as e:
        return {"analysis": f"Hata oluştu: {str(e)}"}
