"""
Ham hukuk metnini → instruction-tuning formatına çevirir.
Tamamen ücretsiz, template tabanlı.

Çıktı formatı (ChatML / HuggingFace messages):
{
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ]
}

Strateji: Her karar için birden fazla Q&A varyantı üret (5-8 adet)
→ 200k unique karar × 6 varyant = 1.2M eğitim örneği
"""
from __future__ import annotations

import json
import random
import re
from pathlib import Path
from typing import Iterator, Dict, Any, List

from .cleaner import normalize_text, extract_sections, is_valid

SYSTEM_PROMPT = (
    "Sen MironLaw 1.0, Türk hukuku konusunda uzmanlaşmış bir yapay zeka asistanısın. "
    "Yargıtay, Danıştay ve Anayasa Mahkemesi içtihatlarına hakim, "
    "Türk Medeni Kanunu, Borçlar Kanunu, Ceza Kanunu ve diğer mevzuata göre "
    "doğru, kapsamlı ve pratik hukuki analizler yaparsın. "
    "Yanıtların Türkçe, net ve profesyonel olur."
)


def _karar_header(rec: Dict) -> str:
    """Kararın kimlik bilgilerini formatlar."""
    parts = []
    if rec.get("mahkeme"):
        parts.append(rec["mahkeme"])
    if rec.get("daire"):
        parts.append(rec["daire"])
    if rec.get("esas_no"):
        parts.append(f"Esas: {rec['esas_no']}")
    if rec.get("karar_no"):
        parts.append(f"Karar: {rec['karar_no']}")
    if rec.get("karar_tarihi"):
        parts.append(f"Tarih: {rec['karar_tarihi']}")
    return " | ".join(parts) if parts else "Türk Mahkemesi Kararı"


def _paragraflar(text: str, min_len: int = 80) -> List[str]:
    """Metni anlamlı paragraflara böler."""
    ps = [p.strip() for p in re.split(r"\n{2,}", text) if len(p.strip()) >= min_len]
    return ps


def _truncate(text: str, max_chars: int = 3000) -> str:
    if len(text) <= max_chars:
        return text
    return text[:max_chars].rsplit(".", 1)[0] + "."


# ──────────────────────────────────────────────
# TEMPLATE FONKSIYONLARI
# ──────────────────────────────────────────────

def _t_ozet_iste(rec: Dict, sections: Dict, text: str) -> Dict:
    """Kararın özetini iste."""
    header = _karar_header(rec)
    ilk_kisim = _truncate(text, 2500)
    return {
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Aşağıdaki mahkeme kararını özetle:\n\n{header}\n\n{ilk_kisim}"},
            {"role": "assistant", "content": sections["ozet"] or _truncate(text, 600)},
        ]
    }


def _t_hukum_sor(rec: Dict, sections: Dict, text: str) -> Dict:
    """Kararın sonucu/hükmü nedir?"""
    header = _karar_header(rec)
    huküm = sections["hüküm"] or _truncate(text[-1500:], 800)
    return {
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Bu kararın hukuki sonucu ve hükmü nedir?\n\n{header}\n\n{_truncate(text, 2000)}"},
            {"role": "assistant", "content": f"Bu davada mahkeme şu kararı vermiştir:\n\n{huküm}"},
        ]
    }


def _t_gerekce_sor(rec: Dict, sections: Dict, text: str) -> Dict:
    """Kararın gerekçesini açıkla."""
    header = _karar_header(rec)
    gerekce = sections["gerekce"] or _truncate(text, 2000)
    return {
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Bu kararın gerekçesi nedir? Neden bu sonuca varıldı?\n\n{header}"},
            {"role": "assistant", "content": f"Mahkeme bu kararında şu gerekçeye dayanmıştır:\n\n{_truncate(gerekce, 1500)}"},
        ]
    }


def _t_hukuki_analiz(rec: Dict, sections: Dict, text: str) -> Dict:
    """Hukuki analiz yap."""
    ps = _paragraflar(text)
    ilk_4 = "\n\n".join(ps[:4]) if ps else _truncate(text, 1200)
    son_3 = "\n\n".join(ps[-3:]) if ps else _truncate(text[-800:], 800)

    analiz = (
        f"### Dava Konusu\n{sections['ozet'] or ilk_4[:400]}\n\n"
        f"### Mahkemenin Değerlendirmesi\n{sections['gerekce'][:600] if sections['gerekce'] else ilk_4[:600]}\n\n"
        f"### Hukuki Sonuç\n{sections['hüküm'] or son_3[:400]}"
    )
    return {
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Bu mahkeme kararını hukuki açıdan analiz et:\n\n{_karar_header(rec)}\n\n{_truncate(text, 2200)}"},
            {"role": "assistant", "content": analiz},
        ]
    }


def _t_benzer_davada(rec: Dict, sections: Dict, text: str) -> Dict:
    """Benzer davada ne yapmalı?"""
    ozet = sections["ozet"] or _truncate(text, 500)
    hüküm = sections["hüküm"] or _truncate(text[-500:], 300)
    return {
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Benzer bir davada avukat olarak ne yapmalıyım? İşte emsal karar:\n\n{_karar_header(rec)}\n\n{ozet}"},
            {"role": "assistant", "content": (
                f"Bu emsal karardan yola çıkarak şu stratejileri izlemenizi öneririm:\n\n"
                f"**Kararın özeti:** {ozet[:300]}\n\n"
                f"**Hukuki sonuç:** {hüküm[:300]}\n\n"
                f"**Tavsiyeler:**\n"
                f"- Bu içtihadı dilekçenizde emsal olarak gösterin\n"
                f"- Benzer olgusal zemini ispat edin\n"
                f"- İlgili maddeleri gerekçenize ekleyin"
            )},
        ]
    }


def _t_mevzuat_analiz(rec: Dict, sections: Dict, text: str) -> Dict:
    """Mevzuat metni için açıklama formatı."""
    baslik = rec.get("baslik") or rec.get("tur") or "Hukuki Metin"
    return {
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"'{baslik}' metnini hukuki açıdan açıkla:\n\n{_truncate(text, 2000)}"},
            {"role": "assistant", "content": (
                f"**{baslik}** hakkında hukuki açıklama:\n\n"
                f"{_truncate(text, 1500)}\n\n"
                f"Bu metin, Türk hukuk sisteminde {'kanun' if 'Kanun' in rec.get('tur','') else 'düzenleme'} "
                f"kapsamında değerlendirilmektedir."
            )},
        ]
    }


def _t_soru_cevap(rec: Dict, sections: Dict, text: str) -> Dict:
    """Genel hukuki soru-cevap formatı."""
    ps = _paragraflar(text)
    if len(ps) < 2:
        return None

    # Rastgele bir paragraf kullanıcı sorusu gibi davranacak
    soru_para = random.choice(ps[1:-1]) if len(ps) > 3 else ps[0]
    cevap_para = sections["hüküm"] or (ps[-1] if ps else text[-500:])

    return {
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Şu hukuki durumda ne olur?\n\n{_truncate(soru_para, 600)}"},
            {"role": "assistant", "content": _truncate(cevap_para, 1000)},
        ]
    }


TEMPLATE_FUNCS = [
    _t_ozet_iste,
    _t_hukum_sor,
    _t_gerekce_sor,
    _t_hukuki_analiz,
    _t_benzer_davada,
    _t_soru_cevap,
]

MEVZUAT_TEMPLATES = [_t_mevzuat_analiz, _t_ozet_iste]


def record_to_examples(rec: Dict[str, Any]) -> List[Dict]:
    """
    Tek bir ham karar kaydından birden fazla eğitim örneği üretir.
    Returns: List of {messages: [...]} dicts
    """
    text = normalize_text(rec.get("text") or "")
    if not is_valid(text):
        return []

    sections = extract_sections(text)
    source = rec.get("source", "")
    examples = []

    templates = MEVZUAT_TEMPLATES if source == "mevzuat" else TEMPLATE_FUNCS

    for func in templates:
        try:
            ex = func(rec, sections, text)
            if ex:
                # Kalite filtresi: assistant yanıtı en az 50 karakter
                asst = ex["messages"][-1]["content"]
                if len(asst.strip()) >= 50:
                    examples.append(ex)
        except Exception:
            pass

    return examples


def build_dataset(
    input_files: List[str | Path],
    output_path: str | Path,
    max_examples: int | None = None,
) -> int:
    """
    Ham JSONL dosyalarından eğitim dataseti oluşturur.
    """
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    total_written = 0

    with output_path.open("w", encoding="utf-8") as fout:
        for fpath in input_files:
            fpath = Path(fpath)
            if not fpath.exists():
                print(f"[WARN] Dosya yok: {fpath}")
                continue

            print(f"[QA Builder] İşleniyor: {fpath.name}")
            with fpath.open("r", encoding="utf-8") as fin:
                for line in fin:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        rec = json.loads(line)
                    except Exception:
                        continue

                    examples = record_to_examples(rec)
                    for ex in examples:
                        fout.write(json.dumps(ex, ensure_ascii=False) + "\n")
                        total_written += 1

                        if max_examples and total_written >= max_examples:
                            print(f"[QA Builder] max_examples={max_examples} limitine ulaşıldı")
                            return total_written

                    if total_written % 100_000 == 0 and total_written > 0:
                        print(f"  [QA Builder] {total_written:,} örnek üretildi")

    print(f"[QA Builder] TOPLAM: {total_written:,} eğitim örneği")
    return total_written
