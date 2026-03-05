import os
import psycopg2
from dotenv import load_dotenv

# Load Env
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))

DB_URL = os.getenv("DATABASE_URL")

def apply_migration():
    print(f"--- APPLYING MIGRATION TO FRANKFURT DB ---")
    print(f"Target: {DB_URL.split('@')[1]}")
    
    migration_file = os.path.join(BASE_DIR, "migrations/012_rag_security.sql")
    
    with open(migration_file, "r") as f:
        sql = f.read()
        
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        cur.execute(sql)
        conn.commit()
        print("✅ Migration Applied Successfully")
        
        # Verify Tables
        cur.execute("SELECT tablename FROM pg_tables WHERE schemaname='public'")
        tables = [r[0] for r in cur.fetchall()]
        print(f"Tables: {tables}")
        
        expected = ["users", "sessions", "audit_logs", "discount_codes"]
        missing = [t for t in expected if t not in tables]
        
        if missing:
            print(f"❌ MISSING TABLES: {missing}")
        else:
            print("✅ All Critical Tables Present")
            
        conn.close()
    except Exception as e:
        print(f"❌ Migration Failed: {e}")

if __name__ == "__main__":
    apply_migration()
