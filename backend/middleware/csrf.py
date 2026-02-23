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
            # For safe methods, ensure a CSRF cookie is set if missing
            response = await call_next(request)
            if self.cookie_name not in request.cookies:
                token = secrets.token_urlsafe(32)
                response.set_cookie(
                    key=self.cookie_name,
                    value=token,
                    httponly=False,  # Must be readable by JS to send in header
                    samesite="strict",
                    secure=True
                )
            return response

        # For unsafe methods, validate the token
        cookie_token = request.cookies.get(self.cookie_name)
        header_token = request.headers.get(self.header_name)

        if not cookie_token or not header_token or cookie_token != header_token:
            return Response(status_code=403, content="CSRF validation failed")

        return await call_next(request)
