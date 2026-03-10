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
        
        # Hotel management tables to remove
        tables = [
            "hotel_requests",
            "hotels",
            "feedback_messages", # Eski feedback tablosu
            # Diğer gereksiz tablolar
        ]
        
        # Columns to remove from 'users' table (if they exist)
        drop_columns = [
            "hotel_id", 
            # "role" sütununu silmiyoruz çünkü admin/user ayrımı için gerekli
        ]

        # 1. Drop Tables
        for table in tables:
            print(f"Dropping {table}...", end=" ")
            cur.execute(f"DROP TABLE IF EXISTS {table} CASCADE")
            print("✅")

        # 2. Drop Columns from Users
        for col in drop_columns:
            print(f"Dropping column '{col}' from users...", end=" ")
            try:
                cur.execute(f"ALTER TABLE users DROP COLUMN IF EXISTS {col}")
                print("✅")
            except Exception as e:
                print(f"⚠️  (Skipped: {e})")
            
        conn.commit()
        conn.close()
        print("✅ DB Cleanup (Hotel Removal) Successful")
    except Exception as e:
        print(f"❌ Cleanup Failed: {e}")

if __name__ == "__main__":
    cleanup_db()
