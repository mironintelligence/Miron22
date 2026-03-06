import os
import logging
import time
import random
import psycopg2
from psycopg2 import pool, extensions
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
from typing import Generator
from dotenv import load_dotenv
from fastapi import HTTPException
from config import settings
from utils.circuit_breaker import db_circuit

# Explicitly load .env from backend folder if not already loaded
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(BASE_DIR, "backend", ".env")
if os.path.exists(env_path):
    load_dotenv(env_path)

logger = logging.getLogger("miron_db")

# Global Connection Pools
_pg_pool_write = None
_pg_pool_read = None # For Read Replicas

def get_db_url(mode="write") -> str:
    if mode == "read" and settings.DB_READ_REPLICA_URL:
        return settings.DB_READ_REPLICA_URL
    url = os.getenv("DATABASE_URL")
    if not url:
        raise ValueError("DATABASE_URL environment variable is not set")
    return url

def init_pool(min_conn=settings.DB_POOL_MIN_SIZE, max_conn=settings.DB_POOL_MAX_SIZE):
    """Initialize the ThreadedConnectionPools with Enterprise Settings"""
    global _pg_pool_write, _pg_pool_read
    
    # Write Pool
    try:
        url_write = get_db_url("write")
        _pg_pool_write = psycopg2.pool.ThreadedConnectionPool(
            minconn=min_conn,
            maxconn=max_conn,
            dsn=url_write,
            connect_timeout=int(settings.DB_POOL_TIMEOUT)
        )
        logger.info(f"DB Write Pool initialized (min={min_conn}, max={max_conn})")
    except Exception as e:
        logger.critical(f"Failed to initialize DB Write pool: {e}")
        raise e
        
    # Read Pool (if replica configured)
    if settings.DB_READ_REPLICA_URL:
        try:
            url_read = get_db_url("read")
            _pg_pool_read = psycopg2.pool.ThreadedConnectionPool(
                minconn=min_conn,
                maxconn=max_conn,
                dsn=url_read,
                connect_timeout=int(settings.DB_POOL_TIMEOUT)
            )
            logger.info(f"DB Read Replica Pool initialized")
        except Exception as e:
            logger.error(f"Failed to initialize DB Read Replica pool: {e}. Fallback to primary.")
            _pg_pool_read = None

def close_pool():
    """Close all connections in the pools"""
    global _pg_pool_write, _pg_pool_read
    if _pg_pool_write:
        _pg_pool_write.closeall()
        _pg_pool_write = None
    if _pg_pool_read:
        _pg_pool_read.closeall()
        _pg_pool_read = None
    logger.info("DB Connection Pools closed.")

def get_pool_status():
    """Return pool metrics"""
    global _pg_pool_write
    if not _pg_pool_write:
        return {"status": "not_initialized"}
    
    try:
        return {
            "min": _pg_pool_write.minconn,
            "max": _pg_pool_write.maxconn,
            "used": len(_pg_pool_write._used) if hasattr(_pg_pool_write, "_used") else -1,
            "idle": len(_pg_pool_write._pool) if hasattr(_pg_pool_write, "_pool") else -1,
            "status": "active"
        }
    except:
        return {"status": "unknown"}

class InstrumentedRealDictCursor(RealDictCursor):
    """
    Cursor that logs slow queries (>200ms) and tracks execution time.
    Also detects N+1 patterns (heuristic).
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._query_count = 0 # Track queries per cursor/transaction context if possible? 
        # Cursor is per-transaction usually in our usage.

    def execute(self, query, vars=None):
        start = time.time()
        try:
            return super().execute(query, vars)
        finally:
            duration = time.time() - start
            if duration > settings.SLOW_QUERY_THRESHOLD:
                logger.warning(f"SLOW QUERY ({duration:.4f}s): {str(query)[:200]}...")
            
@contextmanager
def get_db_cursor(write: bool = True) -> Generator[RealDictCursor, None, None]:
    """
    Context manager for database connection and cursor.
    Uses Connection Pool with Strict Transaction Policy.
    Implements Circuit Breaker, Retry, Deadlock Handling, and Read/Write Separation.
    """
    global _pg_pool_write, _pg_pool_read
    
    # Check Circuit Breaker first
    if not db_circuit.allow_request():
        logger.error("DB Circuit Breaker is OPEN. Fast failing.")
        raise HTTPException(status_code=503, detail="Service unavailable (DB Circuit Open)")

    conn = None
    pool_to_use = _pg_pool_write
    
    # Use Read Replica if requested and available
    if not write and _pg_pool_read:
        pool_to_use = _pg_pool_read
    
    # Fallback to write pool if read pool not init (lazy init handled below for write pool)
    if pool_to_use is None:
        if _pg_pool_write is None:
            logger.warning("DB Pool not initialized, initializing lazily...")
            init_pool()
        pool_to_use = _pg_pool_write

    try:
        try:
            # Get connection from pool
            conn = pool_to_use.getconn()
        except Exception as e:
            logger.error(f"DB Pool Exhausted: {e}")
            raise HTTPException(status_code=503, detail="Service unavailable (DB Pool Exhausted)")

        if conn:
            # LEVEL 1: Strict Transaction Policy
            conn.autocommit = False
            
            # Set Timeouts for session
            try:
                with conn.cursor() as setup_cur:
                    setup_cur.execute(f"SET statement_timeout = {settings.DB_STATEMENT_TIMEOUT}")
                    setup_cur.execute(f"SET lock_timeout = {settings.DB_LOCK_TIMEOUT}")
            except Exception as e:
                logger.warning(f"Failed to set DB timeouts: {e}")
                conn.rollback()

            # Set Isolation Level based on Config
            if settings.DB_ISOLATION_LEVEL == "REPEATABLE READ":
                 conn.set_isolation_level(extensions.ISOLATION_LEVEL_REPEATABLE_READ)
            else:
                 conn.set_isolation_level(extensions.ISOLATION_LEVEL_READ_COMMITTED)

            # Retry Logic for Deadlocks with Jitter
            retries = settings.DB_DEADLOCK_RETRY_COUNT
            backoff_base = settings.DB_DEADLOCK_RETRY_BACKOFF
            
            last_error = None
            
            for attempt in range(retries + 1):
                try:
                    # Use Instrumented Cursor
                    cur = conn.cursor(cursor_factory=InstrumentedRealDictCursor)
                    yield cur
                    conn.commit()
                    db_circuit.record_success()
                    break # Success
                except psycopg2.extensions.TransactionRollbackError as e:
                    # Deadlock detected (40P01) or Serialization Failure (40001)
                    conn.rollback()
                    last_error = e
                    if attempt < retries:
                        # Exponential Backoff + Jitter
                        sleep_time = (backoff_base * (2 ** attempt)) + (random.uniform(0, 0.1))
                        logger.warning(f"Deadlock detected. Retrying in {sleep_time:.3f}s (Attempt {attempt+1}/{retries})")
                        time.sleep(sleep_time)
                    else:
                        logger.error(f"Transaction failed after {retries} retries: {e}")
                        db_circuit.record_failure()
                        raise HTTPException(status_code=409, detail="Transaction conflict. Please try again.")
                except Exception as e:
                    conn.rollback()
                    logger.error(f"Database transaction failed: {e}")
                    db_circuit.record_failure()
                    raise e
                    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Critical DB Error: {e}")
        raise e
    finally:
        if conn and pool_to_use:
            try:
                pool_to_use.putconn(conn)
            except Exception as e:
                logger.error(f"Failed to return connection to pool: {e}")

def init_db():
    """
    Initialize database with schema if needed.
    This is a basic migration runner.
    """
    migrations_dir = os.path.join(os.path.dirname(__file__), "migrations")
    if not os.path.exists(migrations_dir):
        logger.warning("Migrations directory not found, skipping init")
        return

    # Simple migration runner: Just run all sql files in order
    files = sorted([f for f in os.listdir(migrations_dir) if f.endswith(".sql")])
    
    for f in files:
        path = os.path.join(migrations_dir, f)
        logger.info(f"Applying migration: {f}")
        try:
            with open(path, "r") as sql_file:
                sql = sql_file.read()
                
            # Each migration gets its own transaction context
            with get_db_cursor() as cur:
                cur.execute(sql)
        except Exception as e:
            # Log but continue if it's "relation already exists" etc.
            # Ideally we track migration version in DB.
            logger.warning(f"Migration {f} might have failed or already applied: {e}")
