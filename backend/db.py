import os
import logging
from typing import Generator
import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
from dotenv import load_dotenv

# Explicitly load .env from backend folder if not already loaded
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(BASE_DIR, "backend", ".env")
if os.path.exists(env_path):
    load_dotenv(env_path)

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
