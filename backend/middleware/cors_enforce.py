"""Outermost CORS header enforcement — fills ACAO when inner layers omit it."""

from __future__ import annotations

import re
from typing import Optional, Sequence

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request


class EnforceCorsHeadersMiddleware(BaseHTTPMiddleware):
    """Runs outside Starlette CORSMiddleware; ensures credentialed browser
    responses always echo Access-Control-Allow-Origin for allowed Origins."""

    def __init__(self, app, allowed_origins: Sequence[str], origin_regex: Optional[str] = None):
        super().__init__(app)
        self._allowed = tuple(allowed_origins)
        self._rx = re.compile(origin_regex) if (origin_regex or "").strip() else None

    def _origin_ok(self, origin: str) -> bool:
        if origin in self._allowed:
            return True
        if self._rx:
            try:
                return bool(self._rx.match(origin))
            except re.error:
                return False
        return False

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        origin = (request.headers.get("origin") or "").strip()
        if origin and self._origin_ok(origin):
            response.headers["access-control-allow-origin"] = origin
            response.headers["access-control-allow-credentials"] = "true"
        return response
