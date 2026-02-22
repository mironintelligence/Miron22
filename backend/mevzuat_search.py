from fastapi import APIRouter, HTTPException, Depends, status, Header
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
import os
import json
import re

try:
    from backend.openai_client import get_openai_client
except ImportError:
    from openai_client import get_openai_client

try:
    from backend.auth import get_supabase_client
except ImportError:
    from auth import get_supabase_client

try:
    from backend.services.search import search_engine
except ImportError:
    from services.search import search_engine

try:
    from backend.security import sanitize_text
except ImportError:
    from security import sanitize_text

router = APIRouter(prefix="/api/mevzuat", tags=["mevzuat"])

def get_current_user(authorization: str = Header(default="")) -> Dict[str, Any]:
    auth = (authorization or "").strip()
    if not auth.lower().startswith("bearer "):
        return {"id": "guest"}
    token = auth.split(" ", 1)[1].strip()
    if not token:
        return {"id": "guest"}
    try:
        client = get_supabase_client()
        resp = client.auth.get_user(token)
        data = getattr(resp, "user", None) or getattr(resp, "data", None) or resp
        if isinstance(data, dict):
            return data
    except Exception:
        pass
    return {"id": "guest"}

class MevzuatSearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)
    law: Optional[str] = None
    article: Optional[str] = None
    article_text: Optional[str] = None

class MevzuatSearchResponse(BaseModel):
    analysis: Dict[str, Any]
    precedents: List[Dict[str, Any]]

def _extract_json(text: str) -> Dict[str, Any]:
    raw = (text or "").strip()
    try:
        return json.loads(raw)
    except Exception:
        pass
    m = re.search(r"\{[\s\S]*\}", raw)
    if not m:
        return {}
    try:
        return json.loads(m.group(0))
    except Exception:
        return {}

@router.post("/search", response_model=MevzuatSearchResponse)
def search_mevzuat(payload: MevzuatSearchRequest, user: Dict[str, Any] = Depends(get_current_user)):
    query = sanitize_text(payload.query, 600)
    law = sanitize_text(payload.law or "", 200)
    article = sanitize_text(payload.article or "", 50)
    article_text = sanitize_text(payload.article_text or "", 4000)
    if not query:
        raise HTTPException(status_code=400, detail="Query gerekli.")

    precedents = search_engine.search(query).get("results") or []
    client = get_openai_client()
    if not client:
        raise HTTPException(status_code=500, detail="AI client not configured")

    prompt = f"""
    Kullanıcı sorgusu: {query}
    Kanun: {law}
    Madde: {article}
    Madde Metni:
    {article_text}

    Görev:
    1) İlgili kanun maddelerini ve gerekçelerini çıkar.
    2) Çapraz atıf yapılan maddeleri belirle.
    3) Normlar hiyerarşisi çelişkisi varsa belirt.
    4) TBK, HMK, TTK, İİK arasındaki olası çatışmayı ve doğru madde riskini açıkla.
    5) Yanlış madde seçimi riskini somutlaştır.

    JSON formatı:
    {{
      "ilgili_maddeler": [{{"kanun": "...", "madde": "...", "gerekce": "..."}}],
      "capraz_atiflar": ["..."],
      "hiyerarsi_catisma": ["..."],
      "madde_uygunlugu": "...",
      "yanlis_madde_riski": "...",
      "riskler": ["..."],
      "gerekce": "..."
    }}
    """

    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "Türk mevzuatı konusunda uzman bir hukuk asistanısın. Varsayım üretme."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.2,
        response_format={"type": "json_object"},
    )
    parsed = _extract_json(completion.choices[0].message.content or "")
    return {
        "analysis": parsed or {},
        "precedents": precedents[:5],
    }
