from fastapi import APIRouter, HTTPException, Depends, status, Header, Query, Request
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import os
import logging

try:
    from security import sanitize_text
except ImportError:
    pass

try:
    from openai_client import get_openai_client
except ImportError:
    pass

router = APIRouter(prefix="/api/yargitay", tags=["Yargıtay Search & RAG"])

# --- Mock Data for Demo (Real RAG implementation would use Vector DB) ---
MOCK_DECISIONS = [
    {
        "id": "2023/12345",
        "dairesi": "3. Hukuk Dairesi",
        "esas_no": "2023/100",
        "karar_no": "2023/12345",
        "tarih": "15.05.2023",
        "ozet": "Kira tespit davalarında 5 yıllık süre dolmadan hakkaniyet indirimi uygulanamaz. ÜFE/TÜFE ortalaması esas alınır.",
        "metin": "Dava, kira bedelinin tespiti istemine ilişkindir. Mahkemece, davanın kısmen kabulüne karar verilmiş, hüküm davalı vekili tarafından temyiz edilmiştir... 5 yıllık süre dolmadan hak ve nesafet indirimi yapılamaz..."
    },
    {
        "id": "2022/9876",
        "dairesi": "9. Hukuk Dairesi",
        "esas_no": "2022/500",
        "karar_no": "2022/9876",
        "tarih": "10.11.2022",
        "ozet": "İşçinin haklı nedenle fesih hakkı, mobbing iddialarının ispatlanması durumunda doğar. Mobbing süreklilik arz etmelidir.",
        "metin": "Davacı, iş sözleşmesini mobbing nedeniyle haklı olarak feshettiğini iddia ederek kıdem tazminatı talep etmiştir. Mobbingin varlığı için sistematik ve sürekli baskı gereklidir..."
    },
     {
        "id": "2024/555",
        "dairesi": "12. Hukuk Dairesi",
        "esas_no": "2024/10",
        "karar_no": "2024/555",
        "tarih": "20.01.2024",
        "ozet": "Kambiyo senetlerine mahsus haciz yoluyla takipte imzaya itiraz, icra mahkemesine 5 gün içinde yapılmalıdır.",
        "metin": "Borçlu, takip dayanağı senetteki imzanın kendisine ait olmadığını iddia ederek takibin durdurulmasını talep etmiştir. İmzaya itirazın süresi hak düşürücüdür..."
    }
]

class SearchQuery(BaseModel):
    query: str
    year: Optional[int] = None
    chamber: Optional[str] = None

@router.get("/search")
def search_decisions(
    q: str = Query(..., description="Arama metni"),
    year: Optional[int] = Query(None),
    chamber: Optional[str] = Query(None)
):
    """
    Yargıtay Karar Arama (Simulated RAG)
    Gerçek veritabanı olmadığı için şimdilik mock veri ve OpenAI ile zenginleştirilmiş sonuçlar döner.
    """
    if not q:
        return []
    
    # 1. Filtreleme (Basit)
    results = [d for d in MOCK_DECISIONS if q.lower() in d["ozet"].lower() or q.lower() in d["metin"].lower()]
    
    # Eğer sonuç yoksa, AI ile "sanal" bir karar özeti üret (Demo için)
    if not results:
        client = get_openai_client()
        if client:
            try:
                prompt = f"Yargıtay'ın '{q}' konusundaki yerleşik içtihadını özetleyen, sanki gerçek bir karar özetiymiş gibi kısa bir paragraf yaz. Daire ve Esas/Karar numarası uydur."
                completion = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": prompt}]
                )
                ai_summary = completion.choices[0].message.content
                results.append({
                    "id": "ai-gen-1",
                    "dairesi": "Yargıtay (AI Tahmini)",
                    "esas_no": "---",
                    "karar_no": "---",
                    "tarih": "Güncel",
                    "ozet": ai_summary,
                    "metin": ai_summary
                })
            except:
                pass

    return results

class AiAnalysisRequest(BaseModel):
    decision_text: str
    question: Optional[str] = None

@router.post("/analyze")
def analyze_decision(payload: AiAnalysisRequest):
    """
    Seçilen kararın detaylı analizi (Reasoning Pattern)
    """
    client = get_openai_client()
    if not client:
         return {"analysis": "AI servisi şu an kullanılamıyor."}

    prompt = f"""
    Aşağıdaki Yargıtay karar metnini analiz et:
    
    METİN:
    {payload.decision_text[:5000]}
    
    SORU (Varsa): {payload.question}
    
    Lütfen şu başlıklar altında analiz yap (Markdown):
    1. **Hukuki Sorun:** Dava konusu ne?
    2. **Mahkemenin Mantığı:** Yargıtay hangi gerekçeyle bu sonuca varmış?
    3. **Kritik İlkeler:** Hangi hukuk genel ilkeleri vurgulanmış?
    4. **Avukat İçin İpucu:** Benzer bir davada nelere dikkat edilmeli?
    """
    
    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}]
        )
        return {"analysis": completion.choices[0].message.content}
    except Exception as e:
        return {"analysis": f"Hata oluştu: {str(e)}"}

