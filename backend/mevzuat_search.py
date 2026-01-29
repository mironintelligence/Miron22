# backend/mevzuat_search.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from openai import OpenAI

router = APIRouter(prefix="/mevzuat", tags=["mevzuat"])

client = OpenAI()


class MevzuatAiExplainRequest(BaseModel):
    law: Optional[str] = None       # Örn: TBK, TCK, İİK
    article: Optional[str] = None   # "344", "32", "89/1" vb.
    question: str                   # Asıl soru / olay
    article_text: Optional[str] = None  # Kullanıcının yapıştırdığı madde metni (opsiyonel)


class MevzuatAiExplainResponse(BaseModel):
    answer: str


@router.post("/ai-explain", response_model=MevzuatAiExplainResponse)
def mevzuat_ai_explain(payload: MevzuatAiExplainRequest):
    """
    Mevzuat.gov.tr'ye veya başka resmi kaynağa bağlı DEĞİL.
    4o-mini + varsa kullanıcının sağladığı madde metni üzerinden açıklama yapar.
    """
    if not payload.question.strip():
        raise HTTPException(status_code=400, detail="Soru boş olamaz.")

    law_info = []
    if payload.law:
        law_info.append(f"Kanun: {payload.law}")
    if payload.article:
        law_info.append(f"Madde: {payload.article}")

    law_text = " | ".join(law_info) if law_info else "Belirtilen özel kanun/madde yok."

    article_block = ""
    if payload.article_text and payload.article_text.strip():
        article_block = (
            "\n\nAşağıda kullanıcının sağladığı madde metni var. "
            "Analizde bu metne öncelik ver:\n"
            f"--- MADDE METNİ BAŞLANGIÇ ---\n{payload.article_text.strip()}\n--- MADDE METNİ BİTİŞ ---\n"
        )

    prompt = f"""
Kendini Türk mevzuatına hakim bir hukuk analisti olarak düşün.

Verilen bilgiler:
- {law_text}
{article_block}

Kullanıcının sorusu / olayı:
\"\"\"{payload.question.strip()}\"\"\"

Görevlerin:
1. İlgili olabilecek kanun ve madde(ler)i belirt, ama resmi madde metni ezbere biliyormuş gibi davranma; varsa kullanıcının verdiği madde metnine, yoksa genel ilkeye dayanarak konuş.
2. Uygulamada mahkemelerin bu tür durumlarda nasıl bir bakış açısına sahip olduğunu genel hatlarıyla açıkla.
3. Kullanıcının olayı açısından:
   - Hak ve yükümlülükleri,
   - Riskli noktaları,
   - Hangi delillerin önemli olacağını
   maddeler halinde yaz.
4. Net, sade ve anlaşılır Türkçe kullan.
5. Cevabın sonunda mutlaka şu minvalde bir uyarı koy:
   'Bu metin mevzuatın güncel ve resmi halinin yerini tutmaz, mutlaka mevzuat.gov.tr ve resmi kaynaklardan kontrol edin.'
    """.strip()

    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Sen Türk hukuku alanında çalışan bir yapay zekâ asistanısın. "
                        "Mevzuatı genel hatlarıyla anlatır, ama kesin madde metni ve "
                        "güncellik için her zaman resmi kaynaklara yönlendirirsin."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI hatası: {e}")

    answer = completion.choices[0].message.content
    return MevzuatAiExplainResponse(answer=answer)
