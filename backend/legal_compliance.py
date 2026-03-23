"""Yasal metin sürüm hash'leri ve kart doğrulama (PAN saklanmaz)."""
from __future__ import annotations

import hashlib
import re
from typing import Dict

# Sözleşme metinleri değişince bu sabitleri güncelleyin ve migration ile loglayın.
DOC_VERSION_SEEDS: Dict[str, bytes] = {
    "SaaS": b"MIRON_USER_AGREEMENT_v20250321",
    "MSS": b"MIRON_MSS_v20250321",
    "PREINFO": b"MIRON_PREINFO_v20250321",
    "KVKK": b"MIRON_KVKK_v20250321",
}


def document_version_hash(agreement_type: str) -> str:
    seed = DOC_VERSION_SEEDS.get(agreement_type, b"unknown")
    return hashlib.sha256(seed).hexdigest()


def luhn_valid(pan: str) -> bool:
    digits = [int(c) for c in re.sub(r"\D", "", pan or "")]
    if len(digits) < 12 or len(digits) > 19:
        return False
    s = 0
    alt = False
    for d in reversed(digits):
        if alt:
            d *= 2
            if d > 9:
                d -= 9
        s += d
        alt = not alt
    return s % 10 == 0


def card_last_four(pan: str) -> str:
    d = re.sub(r"\D", "", pan or "")
    return d[-4:] if len(d) >= 4 else ""
