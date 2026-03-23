from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import os
import json
import re

try:
    from openai_client import get_openai_client
    from llm_gateway import chat_completions_create
except ImportError:
    from openai_client import get_openai_client
    from llm_gateway import chat_completions_create

try:
    from security import sanitize_text
except ImportError:
    pass

router = APIRouter(prefix="/api/mevzuat", tags=["mevzuat"])

# --- Mock Mevzuat Data (Real app would query a structured legal DB) ---
MOCK_MEVZUAT = {
    "TBK": "6098 sayılı Türk Borçlar Kanunu",
    "HMK": "6100 sayılı Hukuk Muhakemeleri Kanunu",
    "TTK": "6102 sayılı Türk Ticaret Kanunu",
    "İİK": "2004 sayılı İcra ve İflas Kanunu",
    "TMK": "4721 sayılı Türk Medeni Kanunu",
    "TCK": "5237 sayılı Türk Ceza Kanunu",
    "CMK": "5271 sayılı Ceza Muhakemesi Kanunu"
}

class MevzuatSearchRequest(BaseModel):
    query: str
    law: Optional[str] = None
    article: Optional[str] = None
    article_text: Optional[str] = None

@router.post("/search")
def mevzuat_search(payload: MevzuatSearchRequest) -> Dict[str, Any]:
    q = (payload.query or "").strip()
    if not q:
        raise HTTPException(status_code=400, detail="empty_query")

    try:
        from services.search import search_engine
        sres = search_engine.search(query=q, limit=10)
    except Exception:
        sres = {"results": []}

    precedents: List[Dict[str, Any]] = []
    for item in (sres.get("results") or [])[:5]:
        if not isinstance(item, dict):
            continue
        precedents.append(
            {
                "id": item.get("id"),
                "decision_number": item.get("decision_number"),
                "case_number": item.get("case_number"),
                "court": item.get("court"),
                "chamber": item.get("chamber"),
                "summary": item.get("summary"),
            }
        )

    client = get_openai_client()
    if not client:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY eksik/boş ya da client oluşturulamadı.")

    prompt = f"""
Sen Türk hukukunda uzman bir avukat asistanısın.
Kullanıcının olayı için mevzuat açısından en doğru yaklaşımı çıkar.
Kanun/madde belirtilmişse buna dayan; belirtilmemişse olaya göre ilgili kanun ve maddeleri seç.

Soru/Olay:
{q}

Kanun (opsiyonel): {payload.law or ""}
Madde (opsiyonel): {payload.article or ""}
Madde Metni (opsiyonel):
{(payload.article_text or "")[:4000]}

İlgili içtihat özetleri (referans, opsiyonel):
{json.dumps(precedents, ensure_ascii=False)[:8000]}

Sadece aşağıdaki JSON formatında döndür:
{{
  "madde_uygunlugu": "Kısa değerlendirme",
  "yanlis_madde_riski": "Yanlış maddeye dayanma riskleri",
  "ilgili_maddeler": [{{"kanun":"TBK","madde":"344","gerekce":"Kısa gerekçe"}}],
  "capraz_atiflar": ["HMK 119", "TBK 26"],
  "hiyerarsi_catisma": [],
  "riskler": ["..."],
  "gerekce": "Detaylı ama net gerekçe"
}}
"""
    
    try:
        completion = chat_completions_create(client,
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": "Çıktın SADECE geçerli bir JSON objesi olmalı. Markdown kullanma."}, {"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        analysis = json.loads(completion.choices[0].message.content)
        return {"analysis": analysis, "precedents": precedents}
    except Exception as e:
        raise HTTPException(status_code=500, detail="mevzuat_analysis_failed")


@router.post("/analyze")
def analyze_mevzuat(payload: MevzuatSearchRequest) -> Dict[str, Any]:
    return mevzuat_search(payload)

@router.get("/laws")
def get_laws():
    """Desteklenen temel kanun listesi"""
    return [{"code": k, "name": v} for k, v in MOCK_MEVZUAT.items()]
