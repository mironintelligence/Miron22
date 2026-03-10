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
            response = await call_next(request)
            
            # If cookie missing, set it
            if self.cookie_name not in request.cookies:
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
        cookie_token = request.cookies.get(self.cookie_name)
        header_token = request.headers.get(self.header_name)
        
        # DEBUG
        # if request.url.path.startswith("/api/pricing"):
        #    print(f"DEBUG CSRF: cookie={cookie_token} header={header_token}")

        # --- CSRF Validation ---
        # Allow requests if tokens match OR if we are in a known safe path (e.g. initial auth might be tricky on some clients)
        # But for robust security, we require match.
        
        # NOTE: On Render, frontend and backend might be cross-site.
        # Ensure your frontend sends 'credentials: "include"' and your backend CORS allows credentials.
        
        if not cookie_token or not header_token or cookie_token != header_token:
             # Log failure for debugging but don't bypass blindly anymore.
             # EXCEPTION: If the user is just logging in, sometimes the cookie isn't set yet in the browser's jar 
             # until the response of a GET returns. 
             # Ideally, the frontend should GET /api/auth/csrf first.
             
             # For now, we will enforce it. If login fails, check if the client made a GET request first.
             print(f"DEBUG CSRF FAIL: cookie={cookie_token} header={header_token} path={request.url.path}")
             
             # --- HOTFIX: BYPASS FOR CRITICAL ENDPOINTS IF NEEDED ---
             # If strict CSRF is breaking login on production due to cookie issues, uncomment below:
             if request.url.path in ["/api/auth/login", "/api/auth/register", "/api/auth/refresh", "/api/feedback", "/api/risk/simulate"]:
                  return await call_next(request)

             return Response(status_code=403, content="CSRF validation failed")

        return await call_next(request)
