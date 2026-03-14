import time
import os
import json
import uuid
import logging
from logging.handlers import RotatingFileHandler
from collections import deque
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from stores.pg_users_store import log_audit

class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_record = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
            "request_id": getattr(record, "request_id", None),
            "user_id": getattr(record, "user_id", None),
            "ip": getattr(record, "ip", None),
            "method": getattr(record, "method", None),
            "path": getattr(record, "path", None),
            "status_code": getattr(record, "status_code", None),
            "duration": getattr(record, "duration", None),
            "error": getattr(record, "error", None),
        }
        return json.dumps({k: v for k, v in log_record.items() if v is not None})

# Configure Rotating File Handler
# Max 10 MB per file, keep last 5 backups
file_handler = RotatingFileHandler(
    "backend_access.log", 
    maxBytes=10*1024*1024, 
    backupCount=5
)
file_handler.setFormatter(JsonFormatter())

stream_handler = logging.StreamHandler()
stream_handler.setFormatter(JsonFormatter())

logging.basicConfig(
    level=logging.INFO,
    handlers=[
        stream_handler,
        file_handler
    ],
    force=True # Override existing config
)
logger = logging.getLogger("miron_api")

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        request_id = str(uuid.uuid4())
        
        # Attach request_id to request state for other middlewares/routers
        request.state.request_id = request_id
        
        ip = request.client.host if request.client else "127.0.0.1"
        if ip == "testclient": ip = "127.0.0.1"
        ua = request.headers.get("user-agent", "unknown")
        method = request.method
        path = request.url.path
        
        # Loglama bağlamı
        log_context = {
            "request_id": request_id,
            "ip": ip,
            "method": method,
            "path": path,
            "ua": ua
        }
        
        logger.info(f"Incoming Request", extra=log_context)
        
        try:
            response = await call_next(request)
            process_time = time.time() - start_time
            
            # Add user_id if available (from AuthMiddleware)
            user_id = getattr(request.state, "user_id", None)
            if user_id:
                log_context["user_id"] = str(user_id)
            
            log_context["status_code"] = response.status_code
            log_context["duration"] = round(process_time, 4)
            
            logger.info(f"Response Sent", extra=log_context)
            
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Process-Time"] = str(process_time)
            
            # Log critical events to DB Audit
            if response.status_code >= 400:
                details = {
                    "method": method,
                    "path": path,
                    "status": response.status_code,
                    "duration": process_time,
                    "request_id": request_id
                }
                
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
                    logger.error(f"Audit log failed: {e}", extra={"request_id": request_id})

            return response
            
        except Exception as e:
            process_time = time.time() - start_time
            log_context["duration"] = round(process_time, 4)
            log_context["error"] = str(e)
            
            logger.error(f"Request Failed: {e}", extra=log_context)
            
            # Audit log critical failure
            try:
                log_audit(
                    user_id=getattr(request.state, "user_id", None),
                    action="SYSTEM_ERROR",
                    resource=path,
                    details={"error": str(e), "request_id": request_id},
                    ip=ip,
                    ua=ua
                )
            except:
                pass
            raise e

from config import settings

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # HSTS Config
        hsts = f"max-age={settings.HSTS_MAX_AGE}"
        if settings.HSTS_INCLUDE_SUBDOMAINS:
            hsts += "; includeSubDomains"
        if settings.HSTS_PRELOAD:
            hsts += "; preload"
        response.headers["Strict-Transport-Security"] = hsts
        
        # CSP Config
        csp = "; ".join([f"{k} {v}" for k, v in settings.CSP_POLICY.items()])
        response.headers["Content-Security-Policy"] = csp
        
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
        if request.method == "OPTIONS":
            return await call_next(request)
        if request.url.path in ("/health", "/api/health"):
            return await call_next(request)
        ua = (request.headers.get("user-agent") or "").lower()
        if not ua or any(b in ua for b in self.blocked):
            return Response(status_code=403, content="Bot access denied")
        return await call_next(request)
