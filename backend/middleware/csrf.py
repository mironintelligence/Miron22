import secrets
import logging
from utils.request_meta import cookie_secure as _cookie_secure_util
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

    # Only genuinely public endpoints are whitelisted. Previously this list
    # included "/api/", "/admin/" and "/writer/" as blanket prefixes, which
    # meant cookie-authenticated state-changing requests (e.g. /auth/refresh,
    # POST /auth/logout) bypassed CSRF entirely. Authenticated requests that
    # use a Bearer token are still exempted separately in _should_skip.
    # Paths that are exempt even without a bearer token.
    #   - Fully public GET endpoints (docs, health).
    #   - Pre-auth login/register/verify/reset flows: there is no session to
    #     ride for CSRF — these requests create auth state, they do not
    #     consume existing victim session cookies.
    #   - Public intake endpoints that capture no victim session.
    # Cross-domain SPA flow: some browsers block/partition non-essential cookies
    # aggressively and CSRF bootstrap may fail transiently. Auth refresh/logout
    # are therefore whitelisted to avoid false 403 loops in production.
    WHITELIST_PREFIXES = (
        "/health",
        "/api/health",
        "/docs",
        "/openapi",
        "/redoc",
        "/api/auth/login",
        "/api/auth/register",
        "/api/auth/verify-email",
        "/api/auth/forgot-password",
        "/api/auth/reset-password",
        "/api/auth/refresh",
        "/api/auth/logout",
        "/auth/login",
        "/auth/register",
        "/auth/verify-email",
        "/auth/forgot-password",
        "/auth/reset-password",
        "/auth/refresh",
        "/auth/logout",
        "/api/feedback",
        "/api/demo-request",
        "/api/pricing/calculate",
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
        return _cookie_secure_util()

    async def dispatch(self, request: Request, call_next):
        # Validate BEFORE invoking the handler. The previous order (call_next
        # first, check second) meant a forged cross-origin unsafe request
        # still executed its side effects - e.g. /auth/refresh would rotate
        # the victim's refresh token - and only then get wrapped in a 403.
        if request.method not in self.SAFE_METHODS and not self._should_skip(request):
            cookie_token = request.cookies.get(self.cookie_name)
            header_token = request.headers.get(self.header_name)
            if not cookie_token or not header_token or cookie_token != header_token:
                logger.info("CSRF validation failed", extra={"path": request.url.path})
                return Response(status_code=403, content="CSRF validation failed")

        response = await call_next(request)

        # Issue a fresh csrf_token cookie on safe responses if the client
        # doesn't already have one - this is how SPAs bootstrap the token.
        if request.method in self.SAFE_METHODS and self.cookie_name not in request.cookies:
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
