from __future__ import annotations

import json
import re
from typing import Any, Dict, List

from openai_client import get_openai_client


def _mock_pinecone_topk(case_description: str, k: int = 3) -> List[Dict[str, Any]]:
    text = (case_description or "").lower()
    if "boşan" in text or "bosan" in text:
        return [
            {
                "kaynak": "Yargıtay",
                "baslik": "Boşanma (Şiddetli Geçimsizlik) - Delil Değerlendirmesi",
                "ozet": "Evlilik birliğinin temelinden sarsıldığı iddiasında tanık beyanlarının tutarlılığı ve ortak hayatın çekilmezliği kriterleri.",
                "benzerlik": 0.86,
            },
            {
                "kaynak": "Yargıtay",
                "baslik": "Velayet - Çocuğun Üstün Yararı",
                "ozet": "Velayet takdirinde çocuğun üstün yararı, bakım koşulları, ebeveynin yaşam düzeni ve sosyal inceleme raporunun rolü.",
                "benzerlik": 0.81,
            },
            {
                "kaynak": "Yargıtay",
                "baslik": "Nafaka - Gelir Araştırması ve Hakkaniyet",
                "ozet": "Tedbir/iştirak nafakasında tarafların ekonomik ve sosyal durum araştırmasının zorunluluğu ve hakkaniyet ölçütü.",
                "benzerlik": 0.78,
            },
        ][:k]

    if "iş kazası" in text or "is kazasi" in text or "tazminat" in text:
        return [
            {
                "kaynak": "Yargıtay",
                "baslik": "İş Kazası - Kusur Oranı ve Bilirkişi Raporu",
                "ozet": "Kusur tespitinde iş güvenliği mevzuatı, olayın oluş şekli ve çelişkili raporlarda ek rapor alınması.",
                "benzerlik": 0.87,
            },
            {
                "kaynak": "Yargıtay",
                "baslik": "Maddi Tazminat - Aktüerya Hesabı",
                "ozet": "Destekten yoksun kalma/iş gücü kaybı hesaplarında yaşam tabloları ve iskonto yaklaşımı.",
                "benzerlik": 0.82,
            },
            {
                "kaynak": "Yargıtay",
                "baslik": "Manevi Tazminat - Hakkaniyet Ölçütleri",
                "ozet": "Manevi tazminatta olayın ağırlığı, tarafların sosyal/ekonomik durumu ve caydırıcılık-hakkaniyet dengesi.",
                "benzerlik": 0.79,
            },
        ][:k]

    return [
        {
            "kaynak": "Yargıtay",
            "baslik": "Usul - İspat Yükü ve Delillerin Toplanması",
            "ozet": "İspat yükü, delillerin süresinde sunulması ve mahkemenin delilleri toplama yükümlülüğünün sınırları.",
            "benzerlik": 0.78,
        },
        {
            "kaynak": "Danıştay",
            "baslik": "İdari İşlem - Yetki/Şekil/Sebep Unsurları",
            "ozet": "İdari işlemin unsurlarına ilişkin denetim ve gerekçe zorunluluğu kapsamında iptal kriterleri.",
            "benzerlik": 0.74,
        },
        {
            "kaynak": "Yargıtay",
            "baslik": "Sözleşme - İfa, Temerrüt ve Tazminat",
            "ozet": "Temerrüt şartları, ihtar gerekliliği ve tazminatın kapsamı hakkında genel ilkeler.",
            "benzerlik": 0.71,
        },
    ][:k]


def _extract_json(text: str) -> Dict[str, Any]:
    t = (text or "").strip()
    try:
        return json.loads(t)
    except Exception:
        pass

    m = re.search(r"\{[\s\S]*\}", t)
    if not m:
        raise ValueError("Model yanıtından JSON çıkarılamadı.")
    return json.loads(m.group(0))


def analyze_case_risk(case_description: str) -> Dict[str, Any]:
    client = get_openai_client()

    emb = client.embeddings.create(
        model="text-embedding-3-small",
        input=case_description,
    )
    _vector = (emb.data[0].embedding if emb and emb.data else None) or []
    retrieved = _mock_pinecone_topk(case_description, k=3)

    ctx = "\n\n".join(
        [
            f"[{i+1}] {d['kaynak']} | {d['baslik']}\nÖzet: {d['ozet']}\nBenzerlik: {d['benzerlik']}"
            for i, d in enumerate(retrieved)
        ]
    )

    messages = [
        {
            "role": "system",
            "content": (
                "Sen Türk hukukunda uzman bir dava risk analisti asistanısın. "
                "Sana verilen dava özeti ve emsal karar özetlerinden yola çıkarak "
                "sadece JSON döndür."
            ),
        },
        {
            "role": "user",
            "content": (
                "Dava özeti:\n"
                f"{case_description}\n\n"
                "Emsal kararlar (RAG bağlamı):\n"
                f"{ctx}\n\n"
                "Şu formatta JSON üret (başka hiçbir şey yazma):\n"
                '{ "kazanma_ihtimali": 0-100, "risk_faktorleri": ["..."], "onerilen_strateji": "..." }'
            ),
        },
    ]

    try:
        completion = client.chat.completions.create(
            model="gpt-4o",
            temperature=0.2,
            messages=messages,
            response_format={"type": "json_object"},
        )
        raw = (completion.choices[0].message.content or "").strip()
    except Exception:
        completion = client.chat.completions.create(
            model="gpt-4o",
            temperature=0.2,
            messages=messages,
        )
        raw = (completion.choices[0].message.content or "").strip()

    parsed = _extract_json(raw)
    out = {
        "kazanma_ihtimali": parsed.get("kazanma_ihtimali"),
        "risk_faktorleri": parsed.get("risk_faktorleri") or [],
        "onerilen_strateji": parsed.get("onerilen_strateji") or "",
        "retrieved": retrieved,
    }

    try:
        val = float(out["kazanma_ihtimali"])
    except Exception:
        val = None
    if val is None:
        out["kazanma_ihtimali"] = 50
    else:
        out["kazanma_ihtimali"] = max(0, min(100, int(round(val))))

    if not isinstance(out["risk_faktorleri"], list):
        out["risk_faktorleri"] = [str(out["risk_faktorleri"])]
    out["risk_faktorleri"] = [str(x) for x in out["risk_faktorleri"] if str(x).strip()]
    out["onerilen_strateji"] = str(out["onerilen_strateji"])

    return out
