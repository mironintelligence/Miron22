"""Shared auth + CORS guard for the legacy Libra admin API.

Historically both main.py and admin_panel.py exposed unauthenticated
endpoints with CORS "*". This module centralises the security primitives
so every legacy admin app boots in a fail-closed configuration:

- ADMIN_API_TOKEN must be set; startup aborts if missing.
- All endpoints require `Authorization: Bearer <token>` via `require_token`.
- CORS origins come from ADMIN_ALLOWED_ORIGINS (comma-separated); no wildcard.
"""

from __future__ import annotations

import hmac
import os
from typing import Iterable, Optional

from fastapi import FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware


_TOKEN_ENV = "ADMIN_API_TOKEN"
_ORIGINS_ENV = "ADMIN_ALLOWED_ORIGINS"


def _load_token() -> str:
    token = (os.getenv(_TOKEN_ENV) or "").strip()
    if not token:
        raise RuntimeError(
            f"{_TOKEN_ENV} is not set. The legacy admin API refuses to boot "
            "without an auth token to avoid exposing user data."
        )
    if len(token) < 24:
        raise RuntimeError(
            f"{_TOKEN_ENV} is too short (<24 chars). Use a cryptographically "
            "random value, e.g. `python -c 'import secrets; print(secrets.token_urlsafe(48))'`."
        )
    return token


def _load_origins() -> list[str]:
    raw = (os.getenv(_ORIGINS_ENV) or "").strip()
    if not raw:
        return []
    origins = [o.strip() for o in raw.split(",") if o.strip()]
    if any(o == "*" for o in origins):
        raise RuntimeError(
            f"{_ORIGINS_ENV} cannot contain '*' — credentialed admin endpoints "
            "must use an explicit origin allowlist."
        )
    return origins


def require_token(authorization: Optional[str] = Header(default=None)) -> None:
    """FastAPI dependency — rejects any request without a valid bearer token."""
    expected = _load_token()
    prefix = "Bearer "
    if not authorization or not authorization.startswith(prefix):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
            headers={"WWW-Authenticate": 'Bearer realm="admin"'},
        )
    provided = authorization[len(prefix):].strip()
    if not hmac.compare_digest(provided, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid bearer token",
        )


def configure_admin_app(app: FastAPI, *, extra_origins: Iterable[str] = ()) -> FastAPI:
    """Apply CORS + startup validation to a legacy admin FastAPI app.

    Must be called before the app starts accepting requests. Fails fast if
    ADMIN_API_TOKEN or ADMIN_ALLOWED_ORIGINS are misconfigured so production
    deploys cannot accidentally ship with the old `allow_origins=["*"]`.
    """
    _load_token()  # raises if missing — fail closed on import/boot.
    origins = list(_load_origins()) + [o for o in extra_origins if o]
    if not origins:
        raise RuntimeError(
            f"{_ORIGINS_ENV} is empty. Set a comma-separated list of allowed "
            "origins (e.g. https://admin.example.com)."
        )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )
    return app
