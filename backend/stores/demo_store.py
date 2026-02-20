from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple

BASE_DIR = Path(__file__).resolve().parent.parent  # .../backend
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

DEMO_USERS_FILE = DATA_DIR / "demo_users.json"


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _parse_iso(dt_str: str) -> datetime | None:
    if not dt_str:
        return None
    try:
        # "2025-12-29T12:34:56.123456+00:00"
        return datetime.fromisoformat(dt_str)
    except Exception:
        return None


def read_demo_users() -> List[Dict[str, Any]]:
    if not DEMO_USERS_FILE.exists():
        return []
    try:
        data = json.loads(DEMO_USERS_FILE.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except Exception:
        return []


def write_demo_users(users: List[Dict[str, Any]]) -> None:
    DEMO_USERS_FILE.parent.mkdir(parents=True, exist_ok=True)
    DEMO_USERS_FILE.write_text(
        json.dumps(users, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def purge_expired_demo_users() -> Tuple[List[Dict[str, Any]], int]:
    """
    Süresi dolan demo hesapları fiziksel olarak demo_users.json'dan siler.
    Return: (kalan_liste, silinen_sayi)
    """
    users = read_demo_users()
    if not users:
        return [], 0

    now = _now_utc()
    kept: List[Dict[str, Any]] = []
    removed = 0

    for u in users:
        exp = _parse_iso(str(u.get("expires_at") or ""))
        if exp and exp <= now:
            removed += 1
            continue
        kept.append(u)

    if removed:
        write_demo_users(kept)

    return kept, removed
