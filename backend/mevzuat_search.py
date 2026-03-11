from fastapi import APIRouter, HTTPException, Depends, status, Header
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
import os
import json
import re

try:
    from openai_client import get_openai_client
except ImportError:
    pass

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

@router.post("/analyze")
def analyze_mevzuat(payload: MevzuatSearchRequest):
    """
    Mevzuat Analizi (Simulated)
    Girilen hukuki soruya veya maddeye göre ilgili kanun maddelerini ve riskleri analiz eder.
    """
    client = get_openai_client()
    if not client:
         return {"analysis": {"error": "AI servisi kullanılamıyor."}}

    prompt = f"""
    Sen uzman bir hukuk asistanısın. Aşağıdaki sorgu için Türk mevzuatını analiz et.
    
    SORGU: {payload.query}
    KANUN (Varsa): {payload.law}
    MADDE (Varsa): {payload.article}
    
    Lütfen şu formatta JSON döndür:
    {{
      "ilgili_maddeler": [
        {{"kanun": "Örn: TBK", "madde": "Örn: 117", "aciklama": "Temerrüt şartları..."}}
      ],
      "risk_analizi": "Bu maddeye dayanırken dikkat edilmesi gereken riskler...",
      "stratejik_ipucu": "Davada bu maddeyi kullanırken nelere dikkat edilmeli?",
      "capraz_atiflar": ["Örn: HMK 200", "Örn: TTK 1530"]
    }}
    """
    
    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        return json.loads(completion.choices[0].message.content)
    except Exception as e:
        return {"error": str(e)}

@router.get("/laws")
def get_laws():
    """Desteklenen temel kanun listesi"""
    return [{"code": k, "name": v} for k, v in MOCK_MEVZUAT.items()]
