from __future__ import annotations

import base64
import hashlib
import hmac
import os
import time
import re
from typing import Any, Dict, Optional
import jwt
from cryptography.fernet import Fernet

_PBKDF2_ITERS = int(os.getenv("PASSWORD_PBKDF2_ITERS", "210000"))
_JWT_SECRET = os.getenv("JWT_SECRET", "")
_JWT_ISSUER = os.getenv("JWT_ISSUER", "miron-ai")
_JWT_AUDIENCE = os.getenv("JWT_AUDIENCE", "miron-ai")
_ACCESS_TTL_SECONDS = int(os.getenv("ACCESS_TOKEN_TTL_SECONDS", "900"))
_REFRESH_TTL_SECONDS = int(os.getenv("REFRESH_TOKEN_TTL_SECONDS", "1209600"))

def _require_secret(value: str, name: str) -> str:
    if not value:
        raise ValueError(f"{name} missing")
    return value

def _fernet() -> Fernet:
    key = _require_secret(os.getenv("DATA_ENCRYPTION_KEY", ""), "DATA_ENCRYPTION_KEY")
    return Fernet(key.encode("utf-8"))

def encrypt_value(value: str) -> str:
    if value is None:
        return ""
    f = _fernet()
    return f.encrypt(str(value).encode("utf-8")).decode("utf-8")

def decrypt_value(value: str) -> str:
    if not value:
        return ""
    f = _fernet()
    return f.decrypt(value.encode("utf-8")).decode("utf-8")

def hmac_hash(value: str, key: str) -> str:
    raw = (value or "").encode("utf-8")
    secret = _require_secret(key, "DATA_HASH_KEY").encode("utf-8")
    return hmac.new(secret, raw, hashlib.sha256).hexdigest()

def sanitize_text(value: str, limit: int = 8000) -> str:
    text = (value or "").replace("\x00", " ").replace("\u0000", " ")
    text = "\n".join([line for line in text.splitlines() if not re.search(r"(ignore|system|assistant|developer|tool|prompt)", line, re.I)])
    text = " ".join(text.split())
    return text[:limit]

def create_access_token(payload: Dict[str, Any]) -> str:
    secret = _require_secret(_JWT_SECRET, "JWT_SECRET")
    now = int(time.time())
    data = dict(payload)
    data.update({
        "iat": now,
        "exp": now + _ACCESS_TTL_SECONDS,
        "iss": _JWT_ISSUER,
        "aud": _JWT_AUDIENCE,
        "type": "access",
    })
    return jwt.encode(data, secret, algorithm="HS256")

def create_refresh_token(payload: Dict[str, Any]) -> str:
    secret = _require_secret(_JWT_SECRET, "JWT_SECRET")
    now = int(time.time())
    data = dict(payload)
    data.update({
        "iat": now,
        "exp": now + _REFRESH_TTL_SECONDS,
        "iss": _JWT_ISSUER,
        "aud": _JWT_AUDIENCE,
        "type": "refresh",
    })
    return jwt.encode(data, secret, algorithm="HS256")

def decode_token(token: str) -> Dict[str, Any]:
    secret = _require_secret(_JWT_SECRET, "JWT_SECRET")
    return jwt.decode(token, secret, algorithms=["HS256"], audience=_JWT_AUDIENCE, issuer=_JWT_ISSUER)

def token_fingerprint(user_agent: str, ip: str) -> str:
    seed = f"{user_agent}|{ip}"
    return hmac_hash(seed, os.getenv("DATA_HASH_KEY", ""))

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
    safe.pop("refresh_token_hash", None)
    safe.pop("refresh_token_expires_at", None)
    safe.pop("refresh_token_fingerprint", None)
    return safe
