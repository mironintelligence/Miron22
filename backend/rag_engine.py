from __future__ import annotations

import json
import re
from typing import Any, Dict, List

from openai_client import get_openai_client
from services.search import search_engine
from security import sanitize_text


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
    if not client:
        raise ValueError("OpenAI client not configured")
    text = sanitize_text(case_description, 12000)
    search_result = search_engine.search(text)
    retrieved = search_result.get("results") or []
    ctx = "\n\n".join([
        f"[{i+1}] {d.get('court','')} {d.get('chamber','')} | {d.get('decision_number','')} | {d.get('case_number','')}\nÖzet: {d.get('summary','')}\nSonuç: {d.get('outcome','')}\nSkor: {d.get('final_score','')}"
        for i, d in enumerate(retrieved[:5])
    ])

    messages = [
        {
            "role": "system",
            "content": (
                "Sen Türk hukukunda uzman bir dava risk analisti asistanısın. "
                "Sadece verilen metin ve bağlamdaki emsal kararlar üzerinden değerlendirme yap. "
                "Varsayım üretme."
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
