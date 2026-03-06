import logging
import sys
import os

# Ensure backend path is in sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from db import get_db_cursor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("miron_audit")

def check_missing_indexes():
    """
    Heuristic check for missing indexes on foreign keys and common query patterns.
    """
    print("--- STARTING INDEX AUDIT ---")
    with get_db_cursor() as cur:
        # Get all tables
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
        tables = [r['table_name'] for r in cur.fetchall()]
        
        for table in tables:
            # Check columns ending in _id
            cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}' AND column_name LIKE '%_id'")
            cols = [r['column_name'] for r in cur.fetchall()]
            
            for col in cols:
                # Check if indexed (including composite indexes where this col is first)
                cur.execute(f"SELECT indexdef FROM pg_indexes WHERE tablename = '{table}'")
                indexes = [r['indexdef'] for r in cur.fetchall()]
                
                # Simple check: is col inside parentheses?
                is_indexed = any(f"({col}" in idx or f", {col}" in idx for idx in indexes)
                
                if not is_indexed:
                     # Check if it is a PK (usually indexed automatically)
                     cur.execute(f"""
                        SELECT 1 FROM information_schema.table_constraints tc
                        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
                        WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_name = '{table}' AND ccu.column_name = '{col}'
                     """)
                     if cur.fetchone():
                         print(f"✅ Indexed (PK): {table}.{col}")
                     else:
                         print(f"⚠️  POTENTIAL MISSING INDEX: {table}.{col}")
                else:
                     print(f"✅ Indexed: {table}.{col}")

if __name__ == "__main__":
    try:
        check_missing_indexes()
    except Exception as e:
        print(f"Audit failed: {e}")
