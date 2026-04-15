import os
import secrets
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("miron_csrf")


class CSRFProtectionMiddleware(BaseHTTPMiddleware):
    """
    CSRF Protection — Cross-domain API mode.

    This backend is consumed by a cross-domain React SPA using Bearer tokens.
    Traditional double-submit cookie CSRF does not work cross-domain because
    the cookie is scoped to the backend domain and cannot be read by JS on a
    different frontend domain. Therefore:
      1. Any request with a Bearer Authorization header skips CSRF entirely
         (the bearer token itself prevents CSRF attacks).
      2. All known /api/* and /writer/* prefixes are also bypassed.
      3. For residual unsafe requests without auth, the classic cookie check applies.
    """

    SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}

    WHITELIST_PREFIXES = (
        "/api/",
        "/writer/",
        "/calc/",
        "/analyze",
        "/assistant-chat",
        "/admin/",
        "/uyap/",
        "/reports/",
        "/stats/",
        "/health",
        "/docs",
        "/openapi",
        "/redoc",
    )

    def __init__(self, app):
        super().__init__(app)
        self.cookie_name = "csrf_token"
        self.header_name = "X-CSRF-Token"

    def _should_skip(self, request: Request) -> bool:
        if request.method in self.SAFE_METHODS:
            return True
        auth = request.headers.get("authorization", "")
        if auth.lower().startswith("bearer "):
            return True
        path = request.url.path
        if any(path.startswith(p) for p in self.WHITELIST_PREFIXES):
            return True
        return False

    def _secure_cookie(self) -> bool:
        explicit = (os.getenv("COOKIE_SECURE") or "").strip().lower()
        if explicit in ("1", "true", "yes"):
            return True
        if explicit in ("0", "false", "no"):
            return False
        env = (os.getenv("ENVIRONMENT") or "").lower()
        return env in ("production", "prod", "staging")

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        if request.method in self.SAFE_METHODS:
            if self.cookie_name not in request.cookies:
                token = secrets.token_urlsafe(32)
                secure = self._secure_cookie()
                response.set_cookie(
                    key=self.cookie_name,
                    value=token,
                    httponly=False,
                    samesite="none" if secure else "lax",
                    secure=secure,
                )
            return response

        if self._should_skip(request):
            return response

        cookie_token = request.cookies.get(self.cookie_name)
        header_token = request.headers.get(self.header_name)
        if not cookie_token or not header_token or cookie_token != header_token:
            logger.info("CSRF validation failed", extra={"path": request.url.path})
            return Response(status_code=403, content="CSRF validation failed")

        return response
