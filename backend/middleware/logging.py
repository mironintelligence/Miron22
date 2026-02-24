import time
import os
import logging
from logging.handlers import RotatingFileHandler
from collections import deque
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from stores.pg_users_store import log_audit

# Configure Rotating File Handler
# Max 10 MB per file, keep last 5 backups
file_handler = RotatingFileHandler(
    "backend_access.log", 
    maxBytes=10*1024*1024, 
    backupCount=5
)
file_handler.setFormatter(logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s"))

logging.basicConfig(
    level=logging.INFO,
    handlers=[
        logging.StreamHandler(),
        file_handler
    ]
)
logger = logging.getLogger("miron_api")

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        ip = request.client.host if request.client else "unknown"
        ua = request.headers.get("user-agent", "unknown")
        method = request.method
        path = request.url.path
        
        # Log to file/stdout
        logger.info(f"Incoming Request: {method} {path} from {ip} | ua={ua}")
        
        try:
            response = await call_next(request)
            process_time = time.time() - start_time
            
            logger.info(f"Response: {response.status_code} - Duration: {process_time:.4f}s")
            response.headers["X-Process-Time"] = str(process_time)
            
            # Log critical events to DB Audit
            if response.status_code >= 400:
                # Log failures (4xx, 5xx)
                details = {
                    "method": method,
                    "path": path,
                    "status": response.status_code,
                    "duration": process_time
                }
                # We can't easily get user_id here without parsing token again or attaching it to request state
                # Assuming auth middleware attaches user info to request.state if available
                user_id = getattr(request.state, "user_id", None)
                
                # Async logging would be better here to not block response
                try:
                    log_audit(
                        user_id=user_id,
                        action="REQUEST_FAILED",
                        resource=path,
                        details=details,
                        ip=ip,
                        ua=ua
                    )
                except Exception as e:
                    logger.error(f"Audit log failed: {e}")

            return response
            
        except Exception as e:
            logger.error(f"Request failed: {e}")
            # Audit log critical failure
            try:
                log_audit(
                    user_id=None,
                    action="SYSTEM_ERROR",
                    resource=path,
                    details={"error": str(e)},
                    ip=ip,
                    ua=ua
                )
            except:
                pass
            raise e

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://api.openai.com https://*.supabase.co;"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        return response

# Deprecated: RateLimitMiddleware logic moved to backend/middleware/rate_limit.py (Redis)
# Keeping BotProtectionMiddleware here

class BotProtectionMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        blocked = os.getenv("BOT_BLOCKLIST", "curl,python-requests,httpclient,wget").split(",")
        self.blocked = [b.strip().lower() for b in blocked if b.strip()]

    async def dispatch(self, request: Request, call_next):
        ua = (request.headers.get("user-agent") or "").lower()
        if not ua or any(b in ua for b in self.blocked):
            return Response(status_code=403, content="Bot access denied")
        return await call_next(request)
