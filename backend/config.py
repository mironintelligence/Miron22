import os
import multiprocessing

# --- HOTFIX: Force Frankfurt Region (Explicit Override) ---
# The user migrated to EU Central. We override the connection string with the correct one.
# This ensures we always connect to the correct DB regardless of what Render sets.
# Using aws-0-eu-central-1.pooler.supabase.com (Standard Pooler Endpoint for EU)
os.environ["DATABASE_URL"] = "postgresql://postgres.ffvdyjvmwmbtxqvqwhtt:Kerimaydemir@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
print(f"🔥 FORCE OVERRIDE: Using Frankfurt DB Connection (aws-0)")

class Settings:
    # 1) DB POOL CONFIG & READ/WRITE
    # Heuristic: CPU cores * 2 + 1 (SQLAlchemy recommendation)
    _cpu_count = multiprocessing.cpu_count()
    DB_POOL_MIN_SIZE = int(os.getenv("DB_POOL_MIN_SIZE", str(_cpu_count)))
    DB_POOL_MAX_SIZE = int(os.getenv("DB_POOL_MAX_SIZE", str(_cpu_count * 2 + 1)))
    DB_POOL_TIMEOUT = float(os.getenv("DB_POOL_TIMEOUT", "10.0")) # Acquire timeout (Increased for test env)
    DB_IDLE_TIMEOUT = 300 # 5 minutes
    DB_MAX_LIFETIME = 3600 # 1 hour
    DB_STATEMENT_TIMEOUT = int(os.getenv("DB_STATEMENT_TIMEOUT", "2000")) # 2s (Hardened)
    DB_LOCK_TIMEOUT = int(os.getenv("DB_LOCK_TIMEOUT", "2000")) # 2s
    
    # Read Replica (If empty, uses primary)
    DB_READ_REPLICA_URL = os.getenv("DB_READ_REPLICA_URL", None)
    
    # 2) TRANSACTION CONFIG
    DB_ISOLATION_LEVEL = os.getenv("DB_ISOLATION_LEVEL", "READ COMMITTED")
    DB_DEADLOCK_RETRY_COUNT = 3
    DB_DEADLOCK_RETRY_BACKOFF = 0.1 # Exponential base
    DB_LONG_TX_THRESHOLD = 0.5 # 500ms warning
    DB_N_PLUS_ONE_THRESHOLD = 5 # Warn if >5 queries in one request context (heuristic)
    
    # 3) CIRCUIT BREAKER CONFIG
    CB_FAILURE_THRESHOLD = 5
    CB_RECOVERY_TIMEOUT = 30 # seconds
    CB_HALF_OPEN_MAX_REQUESTS = 3
    
    # 4) OBSERVABILITY
    SLOW_QUERY_THRESHOLD = float(os.getenv("SLOW_QUERY_THRESHOLD", "0.2")) # 200ms
    ENABLE_PROMETHEUS = True
    ENABLE_OPENTELEMETRY = os.getenv("ENABLE_OPENTELEMETRY", "false").lower() == "true"
    
    # 5) CONCURRENCY
    GLOBAL_REQUEST_TIMEOUT = 30.0 # seconds (Increased for test env latency)
    IDEMPOTENCY_HEADER = "X-Idempotency-Key"
    IDEMPOTENCY_EXPIRY = 3600 # 1 hour
    
    # 6) RATE LIMIT & REDIS
    RATE_LIMIT_REDIS_FALLBACK = os.getenv("RATE_LIMIT_REDIS_FALLBACK", "false").lower() == "true"
    REDIS_CLUSTER_NODES = os.getenv("REDIS_CLUSTER_NODES", "") # comma separated host:port
    
    # 7) SECURITY
    CSP_POLICY = {
        "default-src": "'self'",
        "script-src": "'self' 'unsafe-inline'", # Nonce support requires dynamic injection
        "style-src": "'self' 'unsafe-inline'",
        "img-src": "'self' data:",
        "connect-src": "'self' https://api.openai.com https://*.supabase.co",
        "frame-ancestors": "'none'",
        "object-src": "'none'",
        "base-uri": "'self'"
    }
    HSTS_MAX_AGE = 63072000 # 2 years
    HSTS_INCLUDE_SUBDOMAINS = True
    HSTS_PRELOAD = True
    JWT_ROTATION_KEYS = os.getenv("JWT_ROTATION_KEYS", "").split(",") # multiple secret keys
    
    # 8) RAG & TASKS
    VECTOR_DB_URL = os.getenv("VECTOR_DB_URL", "")
    CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")

settings = Settings()
