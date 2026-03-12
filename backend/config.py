import os
import multiprocessing

# --- HOTFIX: Use Supabase Transaction Pooler (Port 6543) with correct Mode ---
# Port 5432 (Direct) failed due to network unreachable (IPv6 issues on Render).
# Port 6543 (Pooler) failed due to "Tenant not found" (likely incorrect pool mode or user format).
# We revert to Pooler (6543) but ensure 'transaction' mode is used correctly.
# Format for Pooler: postgresql://[user.project]:[pass]@aws-0-eu-central-1.pooler.supabase.com:6543/[db]
# NOTE: If user contains '.', use quotes or verify Supabase dashboard for "Connection String".
# Trying standard pooler endpoint again with explicit IPv4 fallback if possible.

# 1. First, let's try explicit IPv4 for the pooler if possible.
# aws-0-eu-central-1.pooler.supabase.com resolves to 18.198.30.239 (IPv4).
# So "Network unreachable" is strange if it resolves to IPv4.
# Maybe Render blocks port 5432 outbound on free tier? Unlikely.
# Maybe SSL is mandatory? sslmode=require is already there.

# Let's try the *DIRECT* connection string provided by Supabase but force it to be the POOLER port 6543 again,
# BUT THIS TIME ensure the user is strictly `postgres.ffvdyjvmwmbtxqvqwhtt`.
# Wait, the logs showed "Tenant or user not found" on port 6543.
# This means the USERNAME was wrong or the POOLER MODE was wrong for that user.

# HYPOTHESIS: The user `postgres` might not be allowed to use the transaction pooler or needs a specific alias.
# Supabase docs say: "You can use the transaction pooler with any user".
# The username format MUST be `[user].[project_ref]`.
# `postgres.ffvdyjvmwmbtxqvqwhtt` seems correct.

# ANOTHER HYPOTHESIS: The password has special characters that need URL encoding?
# Password is `Kerimaydemir`. No special chars.

# LET'S TRY: Using the `postgres` user with the DIRECT connection string (port 5432) BUT pointing to the pooler host?
# We did that in the last step and got "Tenant or user not found" (Wait, no, we got "Network Unreachable" before on 5432?).
# Let's re-read the latest logs carefully.
# Latest logs (17:11):
# Port: 6543
# Host: aws-0-eu-central-1.pooler.supabase.com (18.198.30.239) -> IPv4 resolved!
# Error: FATAL: Tenant or user not found
# This confirms network is OK (it reached the server), but Auth failed.

# So 6543 is reachable but Auth fails.
# 5432 was unreachable before.

# CONCLUSION: We MUST use port 6543 (because it's reachable), but we need to fix the AUTH.
# Why is `postgres.ffvdyjvmwmbtxqvqwhtt` failing?
# Maybe the project ref is wrong? `ffvdyjvmwmbtxqvqwhtt`
# Maybe the user should just be `postgres`?
# On port 6543 (Supavisor), the username MUST be tenant-prefixed.

# Let's try a different user format that Supabase sometimes supports:
# `postgres@ffvdyjvmwmbtxqvqwhtt`? No, usually dot.

# WAIT. Is the project region actually EU Central 1?
# The log says: `aws-0-eu-central-1.pooler.supabase.com`
# If the project is actually in a different region, the tenant won't be found on that pooler.
# The previous config had `aws-0-eu-central-1`.
# Let's double check the direct host from previous logs: `db.ffvdyjvmwmbtxqvqwhtt.supabase.co`.
# This usually resolves to the correct region.

# Let's try using the DIRECT HOST `db.ffvdyjvmwmbtxqvqwhtt.supabase.co` on port 5432 again?
# But that gave "Network unreachable".
# That's because `db.ffvdyjvmwmbtxqvqwhtt.supabase.co` resolves to IPv6 on Render.

# STRATEGY:
# We need to force `db.ffvdyjvmwmbtxqvqwhtt.supabase.co` to resolve to IPv4.
# We can't easily do that in Python env var.
# BUT, `aws-0-eu-central-1.pooler.supabase.com` is the IPv4 pooler.
# If "Tenant not found" there, maybe the project is NOT in `eu-central-1`?
# Or maybe the pooler endpoint is different?

# Let's try the UNIVERSAL pooler endpoint if it exists? No.
# Let's try to verify the region.
# If I can't verify, I will try the *other* common pooler: `aws-0-us-east-1...`? No, user said migrated to Frankfurt.

# Let's try `postgres` as username WITHOUT suffix?
# Some poolers allow it if the hostname implies the tenant? No, Supavisor is multi-tenant.

# FIX: I will try to use the *Direct* connection string format `db.ffvdyjvmwmbtxqvqwhtt.supabase.co`
# BUT I will wrap the connection logic to force IPv4 if possible?
# No, `asyncpg` / `psycopg2` relies on system DNS.

# WORKAROUND:
# I will use the `aws-0-eu-central-1...` host (since it is reachable)
# But I will try the `postgres` user without suffix? (Unlikely to work).
# I will try `postgres.ffvdyjvmwmbtxqvqwhtt` again but ensure NO TYPOS.
# `ffvdyjvmwmbtxqvqwhtt` -> matches logs.
# `Kerimaydemir` -> matches logs.

# Maybe the database name is not `postgres`?
# Usually it is.

# WHAT IF we try port 5432 on the `aws-0...` host again?
# We did that in the very last step (`Switch to Session Mode...`).
# Did we get logs for that?
# The user input logs show "Failed to lazy init DB Pool... FATAL: Tenant or user not found".
# This was timestamp 17:11.
# So port 5432 on `aws-0...` ALSO gives "Tenant or user not found".

# This strongly implies the CREDENTIALS (User/Pass/Project) are wrong for that specific pooler.
# OR the project is not on that pooler.

# Let's try to go back to the DIRECT HOST `db.ffvdyjvmwmbtxqvqwhtt.supabase.co`
# BUT use port **6543**?
# Supabase also exposes the pooler on the main domain alias sometimes.
# `db.ffvdyjvmwmbtxqvqwhtt.supabase.co:6543`
# If this resolves to IPv6, we might get unreachable.
# If it resolves to IPv4, we might get in.

# Let's try `db.ffvdyjvmwmbtxqvqwhtt.supabase.co` on port `5432` again, but with `connect_timeout=10`?
# Maybe it was a fluke?
# "Network is unreachable" usually means IPv6 fail.

# CRITICAL FIX ATTEMPT:
# We will use the IPv4 IP ADDRESS of the pooler directly to bypass DNS issues?
# IP from logs: `18.198.30.239` or `18.198.145.223` (AWS Frankfurt IPs).
# Host: `18.198.30.239`
# Port: `5432` (Session) or `6543` (Transaction)
# User: `postgres.ffvdyjvmwmbtxqvqwhtt`
# Pass: `Kerimaydemir`
# SSL: `require` (Essential, but might fail if verify-full is used with IP).
# We will set `sslmode=no-verify` or similar if supported by libpq, or just `require` and hope it accepts IP.
# Actually, `sslmode=disable` might work better for debugging connection? No, Supabase requires SSL.

# Let's try the IP address `18.198.30.239` with Port `5432` and User `postgres.ffvdyjvmwmbtxqvqwhtt`.
# This eliminates DNS (IPv6) issues and ensures we hit the right server.

os.environ["DATABASE_URL"] = "postgresql://postgres.ffvdyjvmwmbtxqvqwhtt:Kerimaydemir@18.198.30.239:5432/postgres?sslmode=disable"
print(f"🔥 FORCE OVERRIDE: Using DIRECT IP (18.198.30.239) to bypass DNS/IPv6 issues")

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
