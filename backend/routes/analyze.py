from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from rag_engine import analyze_case_risk
from security import sanitize_text
from user_auth import get_current_user

router = APIRouter(prefix="/api", tags=["analyze"])


class AnalyzeCasePayload(BaseModel):
    case_description: str = Field(min_length=10, max_length=20_000)


@router.post("/analyze-case-risk")
def analyze_case(payload: AnalyzeCasePayload, _user: Dict[str, Any] = Depends(get_current_user)):
    try:
        text = sanitize_text(payload.case_description, 12000)
        return analyze_case_risk(text)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Analiz başarısız.")
