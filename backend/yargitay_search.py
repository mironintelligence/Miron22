# backend/yargitay_search.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from openai import OpenAI

router = APIRouter(prefix="/yargitay", tags=["yargitay"])

client = OpenAI()


class YargitayAiSearchRequest(BaseModel):
    question: str
    chamber: Optional[str] = None   # 3. HD, 11. CD vs.
    year: Optional[int] = None      # 2018, 2022 gibi
    law: Optional[str] = None       # TCK, TBK, İİK vs.
    decision_text: Optional[str] = None  # Elindeki Yargıtay kararı metni (opsiyonel)


class YargitayAiSearchResponse(BaseModel):
    answer: str


@router.post("/ai-search", response_model=YargitayAiSearchResponse)
def yargitay_ai_search(payload: YargitayAiSearchRequest):
    """
    Gerçek Yargıtay veri tabanına BAĞLI DEĞİL.
    4o-mini + varsa kullanıcının yapıştırdığı karar metnine göre analiz yapar.
    """
    if not payload.question.strip():
        raise HTTPException(status_code=400, detail="Soru boş olamaz.")

    # Filtreler
    filters = []
    if payload.chamber:
        filters.append(f"Daire: {payload.chamber}")
    if payload.year:
        filters.append(f"Yıl: {payload.year}")
    if payload.law:
        filters.append(f"İlgili Kanun: {payload.law}")

    filters_text = " | ".join(filters) if filters else "Belirtilen özel filtre yok."

    # Karar metni varsa ekle
    decision_block = ""
    if payload.decision_text and payload.decision_text.strip():
        decision_block = (
            "\n\nAşağıda kullanıcının sağladığı, özet veya tam Yargıtay kararı metni var. "
            "Analizde bu metne öncelik ver:\n"
            f"--- KARAR METNİ BAŞLANGIÇ ---\n{payload.decision_text.strip()}\n--- KARAR METNİ BİTİŞ ---\n"
        )

    prompt = f"""
Kendini Türkiye'de çalışan bir hukuk analisti olarak düşün.
Kullanıcı sana Yargıtay kararları bağlamında bir soru soruyor.

Filtreler:
{filters_text}
{decision_block}

Görevlerin:
1. Soruya ve (varsa) verilen karar metnine göre ilgili olabilecek Yargıtay dairelerini ve karar türlerini belirt.
2. Eğer karar metni verildiyse, bu metne dayanarak:
   - Kararın özetini,
   - Gerekçedeki kilit noktaları,
   - Lehe / aleyhe hususları çıkar.
3. Karar metni yoksa, genel emsal içtihat mantığını anlat (ama uydurma karar numarası/tarih üretme).
4. Kullanıcının olayı açısından:
   - Riskleri madde madde açıkla (yüzde uydurmadan, niteliksel şekilde),
   - Strateji önerileri ver (hangi deliller, hangi iddialar önemli vs.).
5. Mümkün olduğunca sade Türkçe kullan; paragraf + madde madde format.
6. Son cümlede mutlaka şuna benzer bir uyarı yaz:
   'Bu bir hukuki görüş değildir, emsal kararları UYAP / Kazancı vb. resmi kaynaklardan mutlaka kontrol edin.'
Kullanıcının sorusu:
\"\"\"{payload.question.strip()}\"\"\" 
    """.strip()

    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Sen Türk hukukunda uzman bir yapay zekâ asistanısın. "
                        "Yargıtay kararları hakkında genelleyici, açıklayıcı cevaplar üretirsin; "
                        "uydurma karar numarası, sahte tarih veya kesinmiş gibi oran vermezsin."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI hatası: {e}")

    answer = completion.choices[0].message.content
    return YargitayAiSearchResponse(answer=answer)
