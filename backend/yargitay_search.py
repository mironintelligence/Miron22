from fastapi import APIRouter, HTTPException, Depends, status, Header
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import os

# Use shared client from main module approach or safe import
try:
    from backend.openai_client import get_openai_client
except ImportError:
    from openai_client import get_openai_client

# Supabase dependency (or file auth)
try:
    from backend.auth import get_supabase_client
except ImportError:
    from auth import get_supabase_client

router = APIRouter(prefix="/api/yargitay", tags=["yargitay"])

def get_current_user(authorization: str = Header(default="")) -> Dict[str, Any]:
    # Reuse the logic from analyze.py for consistency
    auth = (authorization or "").strip()
    if not auth.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bearer token gerekli.")
    token = auth.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bearer token gerekli.")
    
    # File-based stub
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

class YargitaySearchRequest(BaseModel):
    query: str
    chamber: Optional[str] = None
    year: Optional[int] = None

class YargitaySearchResponse(BaseModel):
    results: List[Dict[str, Any]]
    ai_summary: Optional[str] = None

@router.post("/search", response_model=YargitaySearchResponse)
def search_decisions(payload: YargitaySearchRequest, user: Dict[str, Any] = Depends(get_current_user)):
    """
    Search Supreme Court Decisions (Stubbed Database Integration).
    Future: Will query PostgreSQL Full Text Search.
    Current: Returns mocked professional results + AI Summary.
    """
    
    # MOCK DATABASE RESULTS (Simulating what will be in Postgres)
    # In production, this will run: SELECT * FROM decisions WHERE to_tsvector(...) @@ plainto_tsquery(...)
    
    mock_results = [
        {
            "id": 101,
            "court": "Yargıtay",
            "chamber": "3. Hukuk Dairesi",
            "decision_number": "2023/1452 K.",
            "date": "2023-11-15",
            "summary": f"Taraflar arasındaki '{payload.query}' davasında verilen karar, usul ve yasaya uygun bulunmuştur.",
            "snippet": "...davacının iddiası kapsamında yapılan incelemede, Borçlar Kanunu md. 112 gereği..."
        },
        {
            "id": 102,
            "court": "Yargıtay",
            "chamber": "12. Hukuk Dairesi",
            "decision_number": "2022/8891 K.",
            "date": "2022-05-20",
            "summary": f"İtirazın iptali davasında '{payload.query}' hususu değerlendirilmiş, eksik inceleme nedeniyle bozma kararı verilmiştir.",
            "snippet": "...bilirkişi raporunda belirtilen hususlar dikkate alınmadan hüküm kurulması isabetsizdir..."
        }
    ]

    # AI SUMMARY OF THE SEARCH CONTEXT
    ai_summary = ""
    client = get_openai_client()
    if client:
        try:
            prompt = f"""
            Kullanıcı Yargıtay kararlarında şu terimi aradı: "{payload.query}"
            
            Bu konuda Türk hukukundaki genel yaklaşımı ve emsal kararlarda nelere dikkat edildiğini 
            1 paragraf halinde, profesyonel bir hukukçu diliyle özetle.
            Kesin hüküm cümlesi kurma, genel içtihat eğilimini anlat.
            """
            
            completion = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3
            )
            ai_summary = completion.choices[0].message.content
        except Exception:
            ai_summary = "AI özeti şu an oluşturulamadı."

    return {
        "results": mock_results,
        "ai_summary": ai_summary
    }
