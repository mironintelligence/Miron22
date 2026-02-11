from __future__ import annotations

import json
import os
import base64
import hashlib
import hmac
from pathlib import Path
from typing import Any, Dict, List

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
USERS_FILE = DATA_DIR / "users.json"

_PBKDF2_ITERS = int(os.getenv("PASSWORD_PBKDF2_ITERS", "210000"))

def _b64e(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).decode("utf-8").rstrip("=")

def _b64d(s: str) -> bytes:
    pad = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode((s + pad).encode("utf-8"))

def hash_password(password: str) -> str:
    pw = (password or "").encode("utf-8")
    if not pw:
        raise ValueError("password empty")
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", pw, salt, _PBKDF2_ITERS)
    return f"pbkdf2_sha256${_PBKDF2_ITERS}${_b64e(salt)}${_b64e(dk)}"

def verify_password(password: str, stored: str) -> bool:
    if not stored or not stored.startswith("pbkdf2_sha256$"):
        return hmac.compare_digest(password or "", stored or "")
    try:
        _, it_s, salt_b64, hash_b64 = stored.split("$", 3)
        it = int(it_s)
        salt = _b64d(salt_b64)
        expected = _b64d(hash_b64)
        dk = hashlib.pbkdf2_hmac("sha256", (password or "").encode("utf-8"), salt, it)
        return hmac.compare_digest(dk, expected)
    except Exception:
        return False

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

def read_users() -> List[Dict[str, Any]]:
    arr = _load_json(USERS_FILE, [])
    return arr if isinstance(arr, list) else []

def write_users(users: List[Dict[str, Any]]) -> None:
    _write_json(USERS_FILE, users)
