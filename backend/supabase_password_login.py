"""Supabase GoTrue password grant — fallback when local users.password_hash is missing or out of sync."""
from __future__ import annotations

import logging
import os
from typing import Any, Dict, Optional

import httpx

logger = logging.getLogger("miron_api")

_TOKEN_URL = "/auth/v1/token?grant_type=password"


def try_supabase_password_login(email: str, password: str) -> Optional[Dict[str, Any]]:
    """
    If SUPABASE_URL and SUPABASE_KEY are set, verify email/password against GoTrue.
    Returns {"id": "<auth user uuid>", "email": "<normalized email>"} on success, else None.
    """
    base = (os.getenv("SUPABASE_URL") or "").strip().rstrip("/")
    key = (os.getenv("SUPABASE_KEY") or "").strip()
    if not base or not key:
        return None
    url = f"{base}{_TOKEN_URL}"
    try:
        with httpx.Client(timeout=12.0) as client:
            r = client.post(
                url,
                headers={
                    "apikey": key,
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                },
                json={"email": (email or "").strip(), "password": password or ""},
            )
    except Exception as e:
        logger.warning("supabase password login request failed: %s", e)
        return None

    if r.status_code != 200:
        return None

    try:
        data = r.json()
    except Exception:
        return None

    u = data.get("user") if isinstance(data, dict) else None
    if not isinstance(u, dict):
        return None
    uid = str(u.get("id") or "").strip()
    if not uid:
        return None
    em = str(u.get("email") or email or "").strip().lower()
    return {"id": uid, "email": em}
