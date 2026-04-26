#!/usr/bin/env python3
"""Aktif hukuki belgeleri `legal_seed_md/*.md` ile günceller (sunucuda bir kez çalıştırın)."""

from __future__ import annotations

import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from services.legal_cms_service import sync_active_documents_from_seed_files  # noqa: E402


def main() -> None:
    n = sync_active_documents_from_seed_files()
    print(f"Güncellenen aktif belge satırı: {n}")


if __name__ == "__main__":
    main()
