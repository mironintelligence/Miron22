"""Legal CMS configuration (env-driven required acceptance types)."""

from __future__ import annotations

import os
from typing import FrozenSet, List

LEGAL_DOC_TYPES: FrozenSet[str] = frozenset(
    {"terms", "privacy", "dpa", "cookie", "ai_terms", "disclaimer", "kvkk"}
)

DISPLAY_TITLES: dict[str, str] = {
    "terms": "Kullanım Şartları",
    "privacy": "Gizlilik Politikası",
    "dpa": "Veri İşleme Sözleşmesi (DPA)",
    "cookie": "Çerez Politikası",
    "ai_terms": "Yapay Zeka Kullanım Şartları",
    "disclaimer": "Genel Sorumluluk Reddi",
    "kvkk": "KVKK / GDPR Aydınlatma Metni",
}


def slug_to_document_type(slug: str) -> str | None:
    """URL slug (e.g. ai-terms) -> DB type (ai_terms)."""
    s = (slug or "").strip().lower()
    if s == "ai-terms":
        return "ai_terms"
    if s in LEGAL_DOC_TYPES:
        return s
    return None


def document_type_to_slug(doc_type: str) -> str:
    if doc_type == "ai_terms":
        return "ai-terms"
    return doc_type


def required_acceptance_types() -> List[str]:
    raw = (os.getenv("LEGAL_REQUIRED_ACCEPTANCE_TYPES") or "terms,privacy,ai_terms").strip()
    out: List[str] = []
    for part in raw.split(","):
        t = part.strip().lower()
        if t in LEGAL_DOC_TYPES and t not in out:
            out.append(t)
    return out if out else ["terms", "privacy", "ai_terms"]
