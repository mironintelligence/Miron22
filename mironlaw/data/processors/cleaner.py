"""
Ham hukuk metinlerini temizler.
- Gereksiz boşluklar, sayfa numaraları, header/footer kalıpları
- Çok kısa veya anlamsız metinler
- Encoding sorunları
"""
from __future__ import annotations

import re
import unicodedata
from typing import Optional


_NOISE_PATTERNS = [
    r"^Sayfa \d+ / \d+$",
    r"^-\s*\d+\s*-$",
    r"^\d+\s*$",
    r"^T\.C\.\s*$",
    r"^TÜRKIYE CUMHURİYETİ\s*$",
    r"^(GİZLİ|SINIRLI|HIZMETE ÖZEL)\s*$",
]
_NOISE_RE = re.compile("|".join(f"({p})" for p in _NOISE_PATTERNS), re.MULTILINE | re.IGNORECASE)

_MULTI_NEWLINE = re.compile(r"\n{3,}")
_MULTI_SPACE = re.compile(r"[ \t]{2,}")


def normalize_text(text: str) -> str:
    """Unicode normalize, encoding fix, whitespace clean."""
    if not text:
        return ""

    # Unicode NFC normalize
    text = unicodedata.normalize("NFC", text)

    # Yaygın OCR/encoding hataları
    replacements = {
        "ı": "ı", "İ": "İ",
        "ý": "ı", "þ": "ş", "ð": "ğ",
        "Ý": "İ", "Þ": "Ş", "Ð": "Ğ",
        "ü": "ü", "ö": "ö", "ç": "ç",
        "Ü": "Ü", "Ö": "Ö", "Ç": "Ç",
        "\xa0": " ",   # non-breaking space
        "\t": " ",
        "\r\n": "\n",
        "\r": "\n",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)

    # Satır bazında gürültü kaldır
    lines = text.split("\n")
    clean_lines = []
    for line in lines:
        stripped = line.strip()
        if _NOISE_RE.match(stripped):
            continue
        clean_lines.append(stripped)

    text = "\n".join(clean_lines)
    text = _MULTI_NEWLINE.sub("\n\n", text)
    text = _MULTI_SPACE.sub(" ", text)

    return text.strip()


def extract_sections(text: str) -> dict:
    """
    Karar metninden yapısal bölümleri çıkarır.
    Returns: {ozet, gerekce, huküm, taraflar}
    """
    sections = {"ozet": "", "gerekce": "", "hüküm": "", "taraflar": ""}

    # Taraflar: davacı/davalı bloğu
    taraf_m = re.search(
        r"(davac[ıi]\s*[:;]?.+?(?=daval[ıi]|mahkeme|$))",
        text[:2000], re.IGNORECASE | re.DOTALL
    )
    if taraf_m:
        sections["taraflar"] = taraf_m.group(1).strip()[:500]

    # Hüküm/Sonuç
    hüküm_m = re.search(
        r"(?:HÜKÜM|SONUÇ|KARAR)\s*[:;]?\s*\n(.+?)(?:\n\n|\Z)",
        text, re.IGNORECASE | re.DOTALL
    )
    if hüküm_m:
        sections["hüküm"] = hüküm_m.group(1).strip()[:1000]

    # Gerekçe
    gerekce_m = re.search(
        r"(?:GEREKÇE|DEĞERLENDIRME|İNCELEME)\s*[:;]?\s*\n(.+?)(?:HÜKÜM|SONUÇ|KARAR|\Z)",
        text, re.IGNORECASE | re.DOTALL
    )
    if gerekce_m:
        sections["gerekce"] = gerekce_m.group(1).strip()[:2000]

    # Özet (ilk 3 paragraf)
    paragraflar = [p.strip() for p in text.split("\n\n") if len(p.strip()) > 50]
    sections["ozet"] = "\n\n".join(paragraflar[:3])[:800]

    return sections


def is_valid(text: str, min_chars: int = 200, min_words: int = 30) -> bool:
    """Metnin fine-tune için yeterince kaliteli olup olmadığını kontrol eder."""
    if not text:
        return False
    clean = text.strip()
    if len(clean) < min_chars:
        return False
    words = clean.split()
    if len(words) < min_words:
        return False
    # Çok fazla sayı/özel karakter oranı (bozuk OCR)
    alpha_count = sum(1 for c in clean if c.isalpha())
    if len(clean) > 0 and alpha_count / len(clean) < 0.3:
        return False
    return True
