import os
import time
import logging
import redis
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp

logger = logging.getLogger("miron_ratelimit")

class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Enterprise Rate Limiting with Redis (Sliding Window)
    Falls back to memory if Redis is unavailable.
    """
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.redis_url = os.getenv("REDIS_URL")
        self.redis_client = None
        
        if self.redis_url:
            try:
                self.redis_client = redis.from_url(self.redis_url, decode_responses=True)
                # Test connection
                self.redis_client.ping()
                logger.info(f"Rate Limiter connected to Redis: {self.redis_url}")
            except Exception as e:
                logger.error(f"Redis connection failed: {e}. Falling back to memory.")
                self.redis_client = None
        
        # Fallback memory storage
        self.memory_hits = {}
        
        # Config
        self.window_seconds = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))
        self.max_requests = int(os.getenv("RATE_LIMIT_MAX_REQUESTS", "120"))

    async def dispatch(self, request: Request, call_next):
        # Identify client (IP or User ID if authenticated)
        # Prioritize X-Forwarded-For for proxies (Render/Cloudflare)
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            ip = forwarded.split(",")[0].strip()
        else:
            ip = request.client.host if request.client else "unknown"
            
        key = f"rate_limit:{ip}"
        
        # Check limit
        if self.redis_client:
            try:
                # Redis Pipeline for atomicity
                pipe = self.redis_client.pipeline()
                now = time.time()
                # Remove old hits
                pipe.zremrangebyscore(key, 0, now - self.window_seconds)
                # Count remaining
                pipe.zcard(key)
                # Add current hit
                pipe.zadd(key, {str(now): now})
                # Set expiry to clean up keys automatically
                pipe.expire(key, self.window_seconds + 5)
                
                _, count, _, _ = pipe.execute()
                
                if count >= self.max_requests:
                    logger.warning(f"Rate limit exceeded for IP: {ip}")
                    return Response(status_code=429, content="Rate limit exceeded")
                    
            except redis.RedisError as e:
                logger.error(f"Redis error during rate limit check: {e}")
                # Fail open or use memory fallback? Let's use memory fallback for resilience
                return await self._memory_check(ip, call_next, request)
        else:
            return await self._memory_check(ip, call_next, request)

        return await call_next(request)

    async def _memory_check(self, ip, call_next, request):
        from collections import deque
        now = time.time()
        
        if ip not in self.memory_hits:
            self.memory_hits[ip] = deque()
            
        dq = self.memory_hits[ip]
        
        while dq and now - dq[0] > self.window_seconds:
            dq.popleft()
            
        if len(dq) >= self.max_requests:
            return Response(status_code=429, content="Rate limit exceeded (Memory)")
            
        dq.append(now)
        
        # Periodic cleanup for memory to prevent leaks (simple implementation)
        if len(self.memory_hits) > 10000:
            self.memory_hits.clear()
            
        return await call_next(request)
