from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field

try:
    from backend.auth import get_supabase_client
except ImportError:
    from auth import get_supabase_client

from rag_engine import analyze_case_risk

router = APIRouter(prefix="/api", tags=["analyze"])


def get_current_user(authorization: str = Header(default="")) -> Dict[str, Any]:
    auth = (authorization or "").strip()
    if not auth.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bearer token gerekli.")

    token = auth.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bearer token gerekli.")

    client = get_supabase_client()
    try:
        resp = client.auth.get_user(token)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e) or "Token doğrulanamadı.")

    data = getattr(resp, "user", None) or getattr(resp, "data", None) or resp
    if isinstance(data, dict):
        user = data.get("user") or data
        if isinstance(user, dict) and user.get("id"):
            return user
    d = getattr(data, "__dict__", None)
    if isinstance(d, dict) and d.get("id"):
        return d
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token doğrulanamadı.")


class AnalyzeCasePayload(BaseModel):
    case_description: str = Field(min_length=10, max_length=20_000)


@router.post("/analyze-case-risk")
def analyze_case(payload: AnalyzeCasePayload, _user: Dict[str, Any] = Depends(get_current_user)):
    try:
        return analyze_case_risk(payload.case_description)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e) or "Analiz başarısız.")
