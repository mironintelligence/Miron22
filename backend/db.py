import os
import logging
from typing import Generator
import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager

logger = logging.getLogger("miron_db")

# Connection Pool could be added here for high concurrency
# For now, we use simple connection pattern as psycopg2 handles it well

def get_db_url() -> str:
    url = os.getenv("DATABASE_URL")
    if not url:
        raise ValueError("DATABASE_URL environment variable is not set")
    return url

@contextmanager
def get_db_cursor() -> Generator[RealDictCursor, None, None]:
    """
    Context manager for database connection and cursor.
    Ensures connection is closed and transactions are committed/rolled back.
    Yields a RealDictCursor (results as dicts).
    """
    conn = None
    try:
        conn = psycopg2.connect(get_db_url())
        cur = conn.cursor(cursor_factory=RealDictCursor)
        yield cur
        conn.commit()
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Database transaction failed: {e}")
        raise e
    finally:
        if conn:
            conn.close()

def init_db():
    """
    Initialize database with schema if needed.
    This is a basic migration runner.
    """
    schema_path = os.path.join(os.path.dirname(__file__), "migrations", "001_initial_schema.sql")
    if not os.path.exists(schema_path):
        logger.warning("Schema file not found, skipping init")
        return

    try:
        with open(schema_path, "r") as f:
            sql = f.read()
            
        with get_db_cursor() as cur:
            cur.execute(sql)
            logger.info("Database schema initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
