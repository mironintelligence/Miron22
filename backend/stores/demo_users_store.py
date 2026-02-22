import json
import os
from datetime import datetime, timezone
from backend.security import encrypt_value, decrypt_value, hmac_hash

BACKEND_DIR = os.path.dirname(os.path.dirname(__file__))
DEMO_USERS_FILE = os.path.join(BACKEND_DIR, "data", "admin", "demo_users.json")


def _ensure():
    os.makedirs(os.path.dirname(DEMO_USERS_FILE), exist_ok=True)
    if not os.path.exists(DEMO_USERS_FILE):
        with open(DEMO_USERS_FILE, "w", encoding="utf-8") as f:
            json.dump([], f, ensure_ascii=False, indent=2)


def _norm_email(email: str) -> str:
    return (email or "").strip().lower()

def _decode_user(u: dict) -> dict:
    email = u.get("email")
    if not email and u.get("email_enc"):
        email = decrypt_value(str(u.get("email_enc")))
    full_name = u.get("full_name")
    if full_name is None and u.get("full_name_enc"):
        full_name = decrypt_value(str(u.get("full_name_enc")))
    out = dict(u)
    out["email"] = _norm_email(str(email or ""))
    out["full_name"] = str(full_name or "")
    return out

def _encode_user(u: dict) -> dict:
    email = _norm_email(str(u.get("email") or ""))
    out = dict(u)
    out["email_hash"] = hmac_hash(email, os.getenv("DATA_HASH_KEY", ""))
    out["email_enc"] = encrypt_value(email)
    out["full_name_enc"] = encrypt_value(str(u.get("full_name") or ""))
    out.pop("email", None)
    return out

def read_demo_users():
    _ensure()
    try:
        with open(DEMO_USERS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if not isinstance(data, list):
                return []
            return [_decode_user(u) for u in data if isinstance(u, dict)]
    except Exception:
        return []


def write_demo_users(users):
    _ensure()
    with open(DEMO_USERS_FILE, "w", encoding="utf-8") as f:
        encoded = [_encode_user(u) for u in users if isinstance(u, dict)]
        json.dump(encoded, f, ensure_ascii=False, indent=2)


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
    email_norm = _norm_email(email)
    if not email_norm:
        return None
    for u in read_demo_users():
        if (u.get("email") or "").strip().lower() == email_norm:
            return u
    return None
