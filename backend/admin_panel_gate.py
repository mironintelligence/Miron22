"""
Second-factor gate for /admin: password verified server-side; JWT stored in httpOnly cookie.
Set ADMIN_PANEL_PASSWORD in production (Render/Vercel env). If unset, gate is skipped (local dev only).
"""
from __future__ import annotations

import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

import jwt
from fastapi import Depends, HTTPException, Request, status

from admin_auth import ALGORITHM, SECRET_KEY
from user_auth import get_current_user

COOKIE_NAME = "admin_panel_gate"
PURPOSE = "admin_panel_gate"
TTL_HOURS = 8


def _password_configured() -> bool:
    return bool((os.getenv("ADMIN_PANEL_PASSWORD") or "").strip())


def issue_admin_panel_gate_jwt(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=TTL_HOURS)
    payload = {
        "sub": str(user_id),
        "purpose": PURPOSE,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    tok = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return tok.decode("utf-8") if isinstance(tok, bytes) else str(tok)


def verify_admin_panel_gate(request: Request, user_id: str) -> bool:
    raw = (request.cookies or {}).get(COOKIE_NAME)
    if not raw:
        return False
    try:
        payload = jwt.decode(raw, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("purpose") != PURPOSE:
            return False
        if str(payload.get("sub") or "") != str(user_id):
            return False
        return True
    except Exception:
        return False


def require_admin_panel_gate(request: Request, user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    if (user.get("role") or "") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Yetkisiz erişim.")
    if not _password_configured():
        # Local/dev without ADMIN_PANEL_PASSWORD: do not block admin exchange
        return user
    if not verify_admin_panel_gate(request, str(user.get("id"))):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin panel şifresi gerekli.",
        )
    return user
