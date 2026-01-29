from __future__ import annotations

import base64, hashlib, hmac, os

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
    if stored is None:
        return False
    stored = str(stored)
    if not stored.startswith("pbkdf2_sha256$"):
        return hmac.compare_digest(str(password or ""), stored)

    try:
        _, iters_s, salt_b64, hash_b64 = stored.split("$", 3)
        iters = int(iters_s)
        salt = _b64d(salt_b64)
        expected = _b64d(hash_b64)
        pw = (password or "").encode("utf-8")
        dk = hashlib.pbkdf2_hmac("sha256", pw, salt, iters)
        return hmac.compare_digest(dk, expected)
    except Exception:
        return False

def sanitize_user_for_response(user: dict) -> dict:
    if not isinstance(user, dict):
        return {}
    safe = dict(user)
    safe.pop("password", None)
    safe.pop("hashed_password", None)
    return safe
