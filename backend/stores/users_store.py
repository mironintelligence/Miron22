from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    from backend.security import encrypt_value, decrypt_value, hmac_hash, hash_password, verify_password
except ImportError:
    from security import encrypt_value, decrypt_value, hmac_hash, hash_password, verify_password

BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
USERS_FILE = DATA_DIR / "users.json"

def _load_json(path: Path, default):
    if not path.exists():
        return default
    try:
        with path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default

def _write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    try:
        with tmp.open("w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)
    finally:
        if tmp.exists():
            try:
                tmp.unlink()
            except Exception:
                pass

def _norm_email(email: str) -> str:
    return (email or "").strip().lower()

def _decode_user(u: Dict[str, Any]) -> Dict[str, Any]:
    email = u.get("email")
    if not email and u.get("email_enc"):
        email = decrypt_value(str(u.get("email_enc")))
    first_name = u.get("firstName")
    if first_name is None and u.get("firstName_enc"):
        first_name = decrypt_value(str(u.get("firstName_enc")))
    last_name = u.get("lastName")
    if last_name is None and u.get("lastName_enc"):
        last_name = decrypt_value(str(u.get("lastName_enc")))
    decoded = dict(u)
    decoded["email"] = _norm_email(str(email or ""))
    decoded["firstName"] = str(first_name or "")
    decoded["lastName"] = str(last_name or "")
    return decoded

def _encode_user(u: Dict[str, Any]) -> Dict[str, Any]:
    email = _norm_email(str(u.get("email") or ""))
    record = dict(u)
    record["email_hash"] = hmac_hash(email, os.getenv("DATA_HASH_KEY", ""))
    record["email_enc"] = encrypt_value(email)
    record["firstName_enc"] = encrypt_value(str(u.get("firstName") or ""))
    record["lastName_enc"] = encrypt_value(str(u.get("lastName") or ""))
    record.pop("email", None)
    record.pop("firstName", None)
    record.pop("lastName", None)
    return record

def read_users() -> List[Dict[str, Any]]:
    arr = _load_json(USERS_FILE, [])
    if not isinstance(arr, list):
        return []
    return [_decode_user(u) for u in arr if isinstance(u, dict)]

def write_users(users: List[Dict[str, Any]]) -> None:
    encoded = [_encode_user(u) for u in users if isinstance(u, dict)]
    _write_json(USERS_FILE, encoded)

def find_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    email_norm = _norm_email(email)
    if not email_norm:
        return None
    users = read_users()
    for u in users:
        if _norm_email(str(u.get("email") or "")) == email_norm:
            return u
    return None

__all__ = ["read_users", "write_users", "find_user_by_email", "hash_password", "verify_password"]
