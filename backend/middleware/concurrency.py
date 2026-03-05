import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from backend.config import settings

class IdempotencyMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        # In-memory storage for idempotency keys.
        # For distributed systems, use Redis.
        self.seen_keys = {} # key -> (status_code, body)

    async def dispatch(self, request, call_next):
        if request.method not in ["POST", "PUT", "PATCH"]:
            return await call_next(request)
            
        key = request.headers.get(settings.IDEMPOTENCY_HEADER)
        if not key:
            return await call_next(request)
            
        # Check if key exists
        if key in self.seen_keys:
            # Return cached response (Simple simulation)
            # In real world, we need to store full response headers/body
            return Response(status_code=409, content="Idempotent request already processed (Simulation)")
            
        response = await call_next(request)
        
        if 200 <= response.status_code < 300:
            self.seen_keys[key] = True
            
        return response

class TimeoutMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        # Starlette doesn't support easy timeout wrapper around await call_next
        # because it's already running. We need `asyncio.wait_for`.
        import asyncio
        
        try:
            return await asyncio.wait_for(call_next(request), timeout=settings.GLOBAL_REQUEST_TIMEOUT)
        except asyncio.TimeoutError:
            return Response(status_code=504, content="Request Timeout")
