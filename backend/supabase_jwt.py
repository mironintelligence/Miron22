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
    # Sunucu / istemci saat kayması ve edge bölgesi gecikmeleri için tolerans
    leeway = int(os.getenv("SUPABASE_JWT_LEEWAY_SECONDS", "90"))
    return jwt.decode(
        token,
        secret,
        algorithms=["HS256"],
        audience=aud,
        issuer=iss,
        leeway=leeway,
        options={"require": ["exp", "sub"]},
    )
