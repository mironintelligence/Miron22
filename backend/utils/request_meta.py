"""Tiny helpers for per-request metadata.

These used to live, identically copy-pasted, in at least five modules
(admin_router, auth_router, middleware/logging, middleware/csrf, ...).
Centralising them removes drift risk and lets us tweak the TestClient
normalisation or the secure-cookie policy in exactly one place.
"""

from __future__ import annotations

import os
from typing import Tuple

from fastapi import Request

__all__ = ["client_ip", "user_agent", "client_meta", "cookie_secure"]

_LOCAL_IP = "127.0.0.1"
_UNKNOWN_UA = "unknown"


def client_ip(request: Request) -> str:
    """Return the peer IP with TestClient's ``"testclient"`` token normalised
    to ``127.0.0.1`` so audit logs and rate-limit keys are consistent in tests.

    NOTE: this is the *direct* peer and must not be used for rate-limit or
    abuse decisions when running behind a reverse proxy - those paths live in
    middleware/rate_limit.py and validate ``X-Forwarded-For`` against the
    trusted-proxy allowlist.
    """
    ip = request.client.host if request.client else _LOCAL_IP
    if ip == "testclient":
        ip = _LOCAL_IP
    return ip


def user_agent(request: Request) -> str:
    return request.headers.get("user-agent", _UNKNOWN_UA)


def client_meta(request: Request) -> Tuple[str, str]:
    """Return ``(ip, ua)`` in one call - the pair every audit_log/cookie site
    needs together."""
    return client_ip(request), user_agent(request)


def cookie_secure() -> bool:
    """Should cookies set by this backend use the ``Secure`` attribute?

    Resolved from ``COOKIE_SECURE`` (explicit opt-in/out) with a fallback to
    the deployment environment. ``csrf`` middleware and ``auth_router``
    previously shipped two independent copies of this logic.
    """
    explicit = (os.getenv("COOKIE_SECURE") or "").strip().lower()
    if explicit in ("1", "true", "yes"):
        return True
    if explicit in ("0", "false", "no"):
        return False
    env = (os.getenv("ENVIRONMENT") or "").lower()
    return env in ("production", "prod", "staging")
