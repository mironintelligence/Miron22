from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, Query

from services.search import search_engine

router = APIRouter(prefix="/api/search", tags=["Search"])


@router.get("/decisions")
def search_decisions(
    q: str = Query(..., description="Arama metni"),
    year: Optional[int] = Query(None),
    court: Optional[str] = Query(None),
    chamber: Optional[str] = Query(None),
) -> Dict[str, Any]:
    query = (q or "").strip()
    if not query:
        raise HTTPException(status_code=400, detail="empty_query")

    try:
        result = search_engine.search(query=query, year=year, court=court, chamber=chamber)
    except Exception:
        result = {"query": query, "results": [], "message": "search_unhandled_error"}
    out = {"query": result.get("query") or query, "results": []}

    for item in result.get("results") or []:
        if not isinstance(item, dict):
            continue
        out["results"].append(
            {
                "id": item.get("id"),
                "court": item.get("court"),
                "chamber": item.get("chamber"),
                "decision_number": item.get("decision_number"),
                "case_number": item.get("case_number"),
                "date": item.get("decision_date"),
                "summary": item.get("summary"),
                "full_text": item.get("clean_text"),
                "semantic_score": item.get("semantic_score"),
                "keyword_rank": item.get("keyword_rank"),
                "final_score": item.get("final_score"),
                "outcome": item.get("outcome"),
            }
        )

    return out
