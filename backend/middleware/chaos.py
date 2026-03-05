import os
import time
import random
import asyncio
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

class ChaosMiddleware(BaseHTTPMiddleware):
    """
    Middleware for Failure Injection Testing.
    Enabled only if CHAOS_MODE=true env var is set.
    Can simulate:
    - Latency (Network lag)
    - Errors (500s)
    - DB Connection Failures (Simulated via 503)
    """
    def __init__(self, app):
        super().__init__(app)
        self.enabled = os.getenv("CHAOS_MODE", "false").lower() == "true"
        self.latency_ms = int(os.getenv("CHAOS_LATENCY_MS", "0"))
        self.error_rate = float(os.getenv("CHAOS_ERROR_RATE", "0.0")) # 0.0 to 1.0
        self.failure_type = os.getenv("CHAOS_FAILURE_TYPE", "random") # random, db, redis

    async def dispatch(self, request: Request, call_next):
        if not self.enabled:
            return await call_next(request)
            
        # 1. Latency Injection
        if self.latency_ms > 0:
            # Jitter +/- 20%
            delay = self.latency_ms * random.uniform(0.8, 1.2) / 1000.0
            await asyncio.sleep(delay)
            
        # 2. Error Injection
        if self.error_rate > 0 and random.random() < self.error_rate:
            if self.failure_type == "db":
                return Response(status_code=503, content="Simulated DB Connection Failure")
            elif self.failure_type == "redis":
                return Response(status_code=503, content="Simulated Redis Failure")
            else:
                return Response(status_code=500, content="Simulated Internal Server Error")
                
        return await call_next(request)
