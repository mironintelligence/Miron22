import os
import psycopg2
from dotenv import load_dotenv

# Load Env
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))

DB_URL = os.getenv("DATABASE_URL")

def validate():
    print(f"--- VALIDATING RLS & PERFORMANCE ---")
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        
        # 1. RLS Check
        print("1. RLS Status:")
        tables = ["users", "sessions", "audit_logs", "discount_codes"]
        for t in tables:
            cur.execute(f"SELECT relrowsecurity FROM pg_class WHERE relname='{t}'")
            enabled = cur.fetchone()[0]
            print(f"   - {t}: {'ENABLED' if enabled else 'DISABLED'}")
            
        # 2. Policies List
        print("\n2. Active Policies:")
        cur.execute("SELECT policyname, tablename, permissive, roles, cmd, qual FROM pg_policies WHERE schemaname='public'")
        policies = cur.fetchall()
        for p in policies:
            print(f"   - [{p[1]}] {p[0]} ({p[4]})")
            
        # 3. Performance Test (EXPLAIN ANALYZE)
        print("\n3. Performance Test (Session Update):")
        cur.execute("""
            EXPLAIN (ANALYZE, BUFFERS) 
            UPDATE sessions 
            SET created_at = NOW() 
            WHERE refresh_token_hash = 'dummy_hash_for_test'
        """)
        plan = cur.fetchall()
        for line in plan:
            print(f"   {line[0]}")
            
        # Check if Index Scan was used
        plan_str = "\n".join([str(line[0]) for line in plan])
        if "Index Scan" in plan_str or "Index Only Scan" in plan_str:
            print("\n✅ PERFORMANCE: Index Scan Verified")
        else:
            print("\n❌ PERFORMANCE: Sequential Scan detected!")
            
        conn.close()
    except Exception as e:
        print(f"❌ Validation Failed: {e}")

if __name__ == "__main__":
    validate()
