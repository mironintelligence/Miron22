from fastapi import APIRouter, HTTPException, Depends, status, Header
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import os

try:
    from backend.openai_client import get_openai_client
except ImportError:
    from openai_client import get_openai_client

# Supabase dependency (or file auth)
try:
    from backend.auth import get_supabase_client
except ImportError:
    from auth import get_supabase_client

router = APIRouter(prefix="/api/mevzuat", tags=["mevzuat"])

def get_current_user(authorization: str = Header(default="")) -> Dict[str, Any]:
    auth = (authorization or "").strip()
    if not auth.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bearer token gerekli.")
    token = auth.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bearer token gerekli.")
    
    if len(token) == 32 and all(c in "0123456789abcdef" for c in token.lower()):
         return {"id": "stub_file_user", "email": "user@file.auth"}

    try:
        client = get_supabase_client()
        resp = client.auth.get_user(token)
        data = getattr(resp, "user", None) or getattr(resp, "data", None) or resp
        if isinstance(data, dict):
            return data
    except:
        pass
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token geçersiz.")

class MevzuatSearchRequest(BaseModel):
    query: str
    law: Optional[str] = None
    article: Optional[str] = None

class MevzuatSearchResponse(BaseModel):
    results: List[Dict[str, Any]]
    ai_explanation: Optional[str] = None

@router.post("/search", response_model=MevzuatSearchResponse)
def search_mevzuat(payload: MevzuatSearchRequest, user: Dict[str, Any] = Depends(get_current_user)):
    """
    Search Legislation (Stubbed Database Integration).
    Returns mock results and AI explanation.
    """
    
    # MOCK DATABASE RESULTS
    mock_results = [
        {
            "id": 201,
            "law_name": "Türk Borçlar Kanunu",
            "law_number": "6098",
            "article": "112",
            "text": "Borç hiç veya gereği gibi ifa edilmezse borçlu, kendisine hiçbir kusurun yüklenemeyeceğini ispat etmedikçe, alacaklının bundan doğan zararını gidermekle yükümlüdür.",
            "relevance": 0.95
        },
        {
            "id": 202,
            "law_name": "Türk Medeni Kanunu",
            "law_number": "4721",
            "article": "2",
            "text": "Herkes, haklarını kullanırken ve borçlarını yerine getirirken dürüstlük kurallarına uymak zorundadır.",
            "relevance": 0.88
        }
    ]

    # AI EXPLANATION
    ai_explanation = ""
    client = get_openai_client()
    if client:
        try:
            prompt = f"""
            Kullanıcı mevzuatta şunu arıyor: "{payload.query}"
            
            Bu konudaki yasal çerçeveyi, ilgili temel kanun maddelerini ve hukuki mantığı
            kısa, net ve profesyonel bir dille özetle.
            """
            
            completion = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3
            )
            ai_explanation = completion.choices[0].message.content
        except Exception:
            ai_explanation = "AI açıklaması şu an oluşturulamadı."

    return {
        "results": mock_results,
        "ai_explanation": ai_explanation
    }
