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
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            ip = forwarded.split(",")[0].strip()
        else:
            ip = request.client.host if request.client else "unknown"
            
        # Try to identify user if authenticated (e.g., from request.state or manually parsing token)
        # Note: Middleware runs before route handler, so dependency injection hasn't run yet.
        # But some auth middleware might have run before if configured. 
        # In our main.py, RateLimit runs BEFORE Auth logic (except for manual token check here).
        
        # We can extract user_id from token manually if present for stricter limits
        user_id = "anon"
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            try:
                from security import decode_token
                token = auth_header.split(" ")[1]
                # decode_token might fail if expired, but we just want ID for rate limit
                # We use a "safe" decode or just let it fail to anon
                # Ideally, rate limit should not depend on full validation to avoid DoS via CPU exhaustion
                # So we stick to IP for unauthenticated, and IP+User for authenticated if easy.
                # Let's keep it simple: IP based for now, but allow "user_id" if we move RateLimit after Auth.
                # Currently RateLimit is early in stack.
                pass
            except:
                pass

        # Determine Rate Limit Policy based on path
        path = request.url.path
        if path.endswith("/api/auth/login"):
            limit = 5
            window = 60 # 1 minute (Strict 5/min)
            policy_name = "login"
        elif path.endswith("/api/auth/register"):
            limit = 3
            window = 3600 # 1 hour
            policy_name = "register"
        elif path.startswith("/admin"):
            limit = 30 
            window = 60
            policy_name = "admin"
        elif path.endswith("/api/auth/refresh"):
            limit = 10
            window = 60
            policy_name = "refresh"
        else:
            limit = self.max_requests
            window = self.window_seconds
            policy_name = "global"
            
        key = f"rate_limit:{policy_name}:{ip}"
        
        # Check limit
        if self.redis_client:
            try:
                # Redis Pipeline for atomicity
                pipe = self.redis_client.pipeline()
                now = time.time()
                # Remove old hits
                pipe.zremrangebyscore(key, 0, now - window)
                # Count remaining
                pipe.zcard(key)
                # Add current hit
                pipe.zadd(key, {str(now): now})
                # Set expiry to clean up keys automatically
                pipe.expire(key, window + 5)
                
                _, count, _, _ = pipe.execute()
                
                if count > limit: # Strict greater than
                    logger.warning(f"Rate limit exceeded for IP: {ip} on policy {policy_name}")
                    return Response(status_code=429, content=f"Rate limit exceeded. Try again later.")
                    
            except redis.RedisError as e:
                logger.error(f"Redis error during rate limit check: {e}")
                # Fail open or use memory fallback? Let's use memory fallback for resilience
                return await self._memory_check(ip, call_next, request, limit, window, policy_name)
        else:
            return await self._memory_check(ip, call_next, request, limit, window, policy_name)

        return await call_next(request)

    async def _memory_check(self, ip, call_next, request, limit, window, policy_name):
        from collections import deque
        now = time.time()
        
        mem_key = f"{policy_name}:{ip}"
        
        if mem_key not in self.memory_hits:
            self.memory_hits[mem_key] = deque()
            
        dq = self.memory_hits[mem_key]
        
        while dq and now - dq[0] > window:
            dq.popleft()
            
        if len(dq) >= limit:
             return Response(status_code=429, content=f"Rate limit exceeded. Try again later.")
            
        dq.append(now)
        
        # Periodic cleanup for memory to prevent leaks (simple implementation)
        if len(self.memory_hits) > 10000:
            self.memory_hits.clear()
            
        return await call_next(request)
