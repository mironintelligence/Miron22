from __future__ import annotations

import os
from typing import Any, Dict

import jwt


def supabase_jwt_issuer() -> str:
    explicit = (os.getenv("SUPABASE_JWT_ISS") or "").strip()
    if explicit:
        return explicit.rstrip("/")
    base = (os.getenv("SUPABASE_URL") or "").strip().rstrip("/")
    if not base:
        return "https://localhost.supabase.co/auth/v1"
    return f"{base}/auth/v1"


def decode_supabase_access_token(token: str) -> Dict[str, Any]:
    secret = (os.getenv("SUPABASE_JWT_SECRET") or "").strip()
    if not secret:
        raise jwt.InvalidTokenError("SUPABASE_JWT_SECRET is not set")
    iss = supabase_jwt_issuer()
    aud = (os.getenv("SUPABASE_JWT_AUD") or "authenticated").strip()
    dec_kw: Dict[str, Any] = {
        "algorithms": ["HS256"],
        "audience": aud,
        "options": {"require": ["exp", "sub"]},
    }
    if (os.getenv("ENVIRONMENT") or "").lower() not in ("test",):
        dec_kw["issuer"] = iss
    return jwt.decode(token, secret, **dec_kw)
