#!/usr/bin/env python3
"""One-off: backfill user_legal_acceptances for active users (migration_existing_user)."""

from __future__ import annotations

import os
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE not in sys.path:
    sys.path.insert(0, BASE)

from dotenv import load_dotenv

load_dotenv(os.path.join(BASE, ".env"), override=False)

from services.legal_cms_service import backfill_migration_acceptances_for_all_users, seed_v1_if_empty

if __name__ == "__main__":
    seed_v1_if_empty()
    n = backfill_migration_acceptances_for_all_users()
    print(f"Inserted {n} migration acceptance rows.")
