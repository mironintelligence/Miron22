import os
import multiprocessing

# --- HOTFIX: Use Supabase Transaction Pooler (Port 6543) with correct Mode ---
# Port 5432 (Direct) failed due to network unreachable (IPv6 issues on Render).
# Port 6543 (Pooler) failed due to "Tenant not found" (likely incorrect pool mode or user format).
# We revert to Pooler (6543) but ensure 'transaction' mode is used correctly.
# Format for Pooler: postgresql://[user.project]:[pass]@aws-0-eu-central-1.pooler.supabase.com:6543/[db]
# NOTE: If user contains '.', use quotes or verify Supabase dashboard for "Connection String".
# Trying standard pooler endpoint again with explicit IPv4 fallback if possible.

# Update: Render Free tier often has issues with IPv6.
# We will use the specific AWS Pooler Endpoint: aws-0-eu-central-1.pooler.supabase.com
# User format: postgres.ffvdyjvmwmbtxqvqwhtt (User + Project Ref)
# FIX: Use quotes for user part or ensure no ambiguity. Also, sslmode=disable might be needed if pooler has cert issues on free tier, but let's try 'require' first.
# IMPORTANT: Supabase pooler username is [db_user].[project_ref].
# If your db_user is 'postgres', it should be 'postgres.ffvdyjvmwmbtxqvqwhtt'.
# The previous error "Tenant or user not found" persists. This usually means the project ref or user is wrong for the pooler.
# Let's try the ALTERNATIVE Pooler format which is sometimes required: [user]@[project_ref] or just ensure correct password.

# Fallback Strategy:
# 1. Check if we can use the direct connection string but force IPv4 via DNS resolution? (Hard in python app without hacks)
# 2. Try the "Session" pooler port 5432 (which is direct) but using the pooler hostname? No, 5432 is direct.
# 3. Try the "Transaction" pooler port 6543 with a different user format.

# Trying simpler format or maybe the project ref is case sensitive?
# Let's try explicit quote for username if needed, but URL encoding is safer.
# postgres.ffvdyjvmwmbtxqvqwhtt is correct.
# Maybe the password has special chars? 'Kerimaydemir' looks safe.

# FINAL ATTEMPT: Use the direct connection URL provided by Supabase dashboard usually:
# postgresql://postgres:Kerimaydemir@db.ffvdyjvmwmbtxqvqwhtt.supabase.co:5432/postgres
# BUT we force the IP to resolve to IPv4 if possible?
# Render supports IPv6 but sometimes it is flaky.

# Let's switch back to DIRECT connection (5432) but use the "Session Mode" pooler endpoint if available?
# Supabase provides:
# - Transaction: Port 6543
# - Session: Port 5432 (Direct)

# If 6543 fails with "Tenant not found", it's strictly auth/user format.
# If 5432 fails with "Network unreachable", it's network/IPv6.

# SOLUTION: We will try to use the IPv4 address of the pooler if we can find it, or stick to 6543 but double check the user format.
# Another possibility: The user 'postgres' is reserved or locked? No.

# Let's try the ALIAS for the pooler: db.ffvdyjvmwmbtxqvqwhtt.supabase.co on port 5432 is failing.
# Let's try aws-0-eu-central-1.pooler.supabase.com on port 5432 (Session mode via pooler)?
# Usually port 5432 on pooler host also works as a proxy.

os.environ["DATABASE_URL"] = "postgresql://postgres.ffvdyjvmwmbtxqvqwhtt:Kerimaydemir@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require"
print(f"🔥 FORCE OVERRIDE: Using Pooler Host (aws-0) on Port 5432 (Session Mode) to fix Network Unreachable")

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
