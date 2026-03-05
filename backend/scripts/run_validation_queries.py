import os
import psycopg2
from dotenv import load_dotenv

# Load Env
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))

DB_URL = os.getenv("DATABASE_URL")

def run_queries():
    print(f"--- RUNNING VALIDATION QUERIES ---")
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        
        # 1. Counts
        print("\n1. Table Counts:")
        for table in ["users", "sessions", "audit_logs"]:
            cur.execute(f"SELECT COUNT(*) FROM {table}")
            count = cur.fetchone()[0]
            print(f"   - {table}: {count}")
            
        # 2. Indexes
        print("\n2. Sessions Indexes:")
        cur.execute("SELECT indexname FROM pg_indexes WHERE tablename='sessions'")
        indexes = cur.fetchall()
        for idx in indexes:
            print(f"   - {idx[0]}")
            
        # 3. RLS Test (Anon Role)
        print("\n3. RLS Test (anon role):")
        try:
            # We need to be careful with roles in Supabase. 
            # Usually 'anon' role is restricted.
            cur.execute("SET role anon;")
            cur.execute("SELECT * FROM users LIMIT 1;")
            result = cur.fetchone()
            print(f"   - Result: {result}")
        except Exception as e:
            print(f"   - Blocked as expected: {e}")
        
        # Reset role for uptime query
        conn.rollback() 
        cur = conn.cursor()
        
        # 4. Uptime
        print("\n4. DB Uptime:")
        cur.execute("SELECT now() - pg_postmaster_start_time();")
        uptime = cur.fetchone()[0]
        print(f"   - Uptime: {uptime}")
        
        conn.close()
    except Exception as e:
        print(f"❌ Execution Failed: {e}")

if __name__ == "__main__":
    run_queries()
