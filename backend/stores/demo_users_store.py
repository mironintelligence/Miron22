# backend/stores/demo_users_store.py
import json
import os
from datetime import datetime, timezone

BACKEND_DIR = os.path.dirname(os.path.dirname(__file__))  # .../backend
DEMO_USERS_FILE = os.path.join(BACKEND_DIR, "data", "admin", "demo_users.json")


def _ensure():
    os.makedirs(os.path.dirname(DEMO_USERS_FILE), exist_ok=True)
    if not os.path.exists(DEMO_USERS_FILE):
        with open(DEMO_USERS_FILE, "w", encoding="utf-8") as f:
            json.dump([], f, ensure_ascii=False, indent=2)


def read_demo_users():
    _ensure()
    try:
        with open(DEMO_USERS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except Exception:
        return []


def write_demo_users(users):
    _ensure()
    with open(DEMO_USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, ensure_ascii=False, indent=2)


def _parse_iso(dt_str: str):
    # supports "Z" or "+00:00"
    if not dt_str:
        return None
    try:
        if dt_str.endswith("Z"):
            dt_str = dt_str[:-1] + "+00:00"
        return datetime.fromisoformat(dt_str)
    except Exception:
        return None


def purge_expired_demo_users(now=None):
    now = now or datetime.now(timezone.utc)
    users = read_demo_users()

    kept = []
    removed = 0

    for u in users:
        expires_at = _parse_iso(str(u.get("expires_at") or ""))
        if expires_at and expires_at <= now:
            removed += 1
            continue
        kept.append(u)

    if removed:
        write_demo_users(kept)

    return removed


def find_demo_user_by_email(email: str):
    email_norm = (email or "").strip().lower()
    if not email_norm:
        return None
    for u in read_demo_users():
        if (u.get("email") or "").strip().lower() == email_norm:
            return u
    return None