import os
import psycopg2
from dotenv import load_dotenv

# Load Env
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))

DB_URL = os.getenv("DATABASE_URL")

def cleanup_db():
    print(f"--- CLEANING UP FRANKFURT DB ---")
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        
        tables = ["audit_logs", "sessions", "discount_codes", "users"]
        for table in tables:
            print(f"Dropping {table}...", end=" ")
            cur.execute(f"DROP TABLE IF EXISTS {table} CASCADE")
            print("✅")
            
        conn.commit()
        conn.close()
        print("✅ DB Cleanup Successful")
    except Exception as e:
        print(f"❌ Cleanup Failed: {e}")

if __name__ == "__main__":
    cleanup_db()
