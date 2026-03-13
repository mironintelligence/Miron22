import os
import secrets
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

class CSRFProtectionMiddleware(BaseHTTPMiddleware):
    """
    CSRF Protection Middleware
    - Requires 'X-CSRF-Token' header for state-changing methods (POST, PUT, DELETE, PATCH).
    - The token must match the 'csrf_token' cookie.
    - Safe methods (GET, HEAD, OPTIONS) are exempt.
    """
    def __init__(self, app):
        super().__init__(app)
        self.cookie_name = "csrf_token"
        self.header_name = "X-CSRF-Token"
        self.safe_methods = {"GET", "HEAD", "OPTIONS"}

    async def dispatch(self, request: Request, call_next):
        if request.method in self.safe_methods:
            # Sadece call_next yaparsak response objesine ulasip cookie set edemeyebiliriz
            # Bu yuzden once next'i cagirip response'a bakmak yerine
            # Request'te cookie yoksa once olusturup response header'a eklemek daha dogru olur
            # ANCAK Starlette middleware yapisinda response nesnesi call_next sonucunda doner.
            
            response = await call_next(request)
            
            # If cookie missing, set it
            if self.cookie_name not in request.cookies:
                import secrets
                token = secrets.token_urlsafe(32)
                response.set_cookie(
                    key=self.cookie_name,
                    value=token,
                    httponly=False,  # JS needs to read this to send X-CSRF-Token header
                    samesite="lax",  # Strict blocks navigation from external sites (e.g. email links)
                    secure=True      # HTTPS only
                )
            return response

        # For unsafe methods, validate the token
        
        # --- HOTFIX: BYPASS FOR CRITICAL ENDPOINTS ---
        # Whitelist endpoints that might be called without CSRF token (e.g. initial login, webhooks)
        if request.url.path in [
            "/api/auth/login", 
            "/api/auth/register", 
            "/api/auth/refresh", 
            "/api/auth/forgot-password", 
            "/api/auth/reset-password",
            "/api/feedback", 
            "/api/demo-request",
            "/api/risk/simulate",
            "/api/contracts/analyze",
            "/api/notifications/broadcast",
            "/api/health" # Health check should be public
        ] or request.url.path.startswith("/api/pricing") or request.url.path.startswith("/api/demo-request"):
            return await call_next(request)

        cookie_token = request.cookies.get(self.cookie_name)
        header_token = request.headers.get(self.header_name)
        
        if not cookie_token or not header_token or cookie_token != header_token:
             # Log failure for debugging but don't bypass blindly anymore.
             print(f"DEBUG CSRF FAIL: cookie={cookie_token} header={header_token} path={request.url.path}")
             return Response(status_code=403, content="CSRF validation failed")

        return await call_next(request)
