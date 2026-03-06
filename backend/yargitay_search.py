from fastapi import APIRouter, HTTPException, Depends, status, Header, Query, Request
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import os
import logging
try:
    from security import sanitize_text
except ImportError:
    from security import sanitize_text

try:
    from openai_client import get_openai_client
except ImportError:
    from openai_client import get_openai_client

try:
    from auth import get_supabase_client
except ImportError:
    from auth import get_supabase_client

try:
    from services.search import search_engine
except ImportError:
    from services.search import search_engine

router = APIRouter(prefix="/api", tags=["Search"])
logger = logging.getLogger("miron.search")

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
    except:
        pass

    return {"id": "guest"}

class DecisionResult(BaseModel):
    id: str
    decision_number: Optional[str] = None
    case_number: Optional[str] = None
    summary: Optional[str] = None
    outcome: Optional[str] = None
    semantic_score: Optional[float] = None
    keyword_rank: Optional[float] = None
    final_score: Optional[float] = None
    clean_text: Optional[str] = None
    court: Optional[str] = None
    chamber: Optional[str] = None
    date: Optional[str] = None

class SearchResponse(BaseModel):
    query: str
    results: List[DecisionResult]
    message: Optional[str] = None

@router.get("/search/decisions", response_model=SearchResponse)
def search_decisions(
    q: str = Query(..., description="Search query"),
    year: Optional[int] = Query(None, description="Decision year"),
    court: Optional[str] = Query(None, description="Court name (e.g. Yargıtay)"),
    chamber: Optional[str] = Query(None, description="Chamber name (e.g. 3. Hukuk Dairesi)"),
    request: Request = None
):
    if not q or not q.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    ip = request.client.host if request and request.client else ""
    ua = request.headers.get("user-agent", "") if request else ""
    logger.info("decision_search", extra={"query": q, "ip": ip, "ua": ua, "year": year, "court": court, "chamber": chamber})
    try:
        results = search_engine.search(q, year=year, court=court, chamber=chamber)
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Search unavailable")
    if not results or not results.get("results"):
        return {"query": q, "results": [], "message": "No decisions found for query."}
    return results

class AiSearchRequest(BaseModel):
    question: str
    chamber: Optional[str] = None
    year: Optional[int] = None
    law: Optional[str] = None
    decision_text: Optional[str] = None

@router.post("/yargitay/ai-search")
def ai_search_analysis(payload: AiSearchRequest, user: Dict[str, Any] = Depends(get_current_user)):
    """
    Deep Supreme Court Analysis (Strategy Shift).
    Includes Reasoning Pattern Matching & Justification Pattern Map.
    """
    client = get_openai_client()
    if not client:
        raise HTTPException(status_code=500, detail="OpenAI client not configured")

    context_text = ""
    if payload.decision_text:
        context_text = f"\n\nANALİZ EDİLECEK KARAR METNİ:\n{sanitize_text(payload.decision_text, 5000)}"

    prompt = f"""
    Sen kıdemli bir Yargıtay tetkik hakimisin. Aşağıdaki hukuki meseleyi analiz et.

    KONU/SORU: {sanitize_text(payload.question, 800)}
    İLGİLİ DAİRE: {sanitize_text(payload.chamber or "Genel", 120)}
    YIL: {payload.year or "Son yıllar"}
    KANUN: {sanitize_text(payload.law or "İlgili mevzuat", 120)}
    {context_text}

    GÖREVİN:
    Bu konuda Yargıtay'ın "Reasoning Pattern" (Mantık Örgüsü) ve "Justification Pattern" (Gerekçe Haritası) analizini yap.
    
    ÇIKTI FORMATI (Markdown):

    ### 🧠 Reasoning Pattern Matching (Mantık Örgüsü)
    * **Dairenin Yaklaşımı:** [İlgili daire bu konuya nasıl yaklaşıyor? Katı şekilci mi, hakkaniyet odaklı mı?]
    * **Kritik Eşikler:** [Kararı bozan veya onayan kritik noktalar neler?]
    * **Örnek Mantık:** "Daire genellikle X varsa Y sonucuna varır, ancak Z durumu istisnadır."

    ### 🗺️ Justification Pattern Map (Gerekçe Haritası)
    * **Kabul Gören Argümanlar:** [Hangi argümanlar başarı şansını artırır?]
    * **Reddedilen Argümanlar:** [Hangi savunmalar genellikle geçersiz sayılır?]
    * **Anahtar Kelimeler/Kavramlar:** [Kararlarda geçen sihirli sözcükler]

    ### ⚖️ Risk & Strateji
    * **Risk Puanı:** [0-100 arası tahmini risk]
    * **Önerilen Strateji:** [Bu dairenin içtihadına uygun nasıl hareket edilmeli?]

    NOT: Cevabın tamamen Türk hukuku ve Yargıtay içtihatlarına dayalı olmalı.
    """

    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Sen Türk hukukunda uzman, Yargıtay içtihatlarına hakim bir yapay zeka asistanısın."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2
        )
        return {"answer": completion.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Analizi başarısız: {str(e)}")
