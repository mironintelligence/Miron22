import os
import json
import datetime
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# Load Env
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))

# Configuration
DB_URL = os.getenv("DATABASE_URL")
BACKUP_DIR = f"backups/seoul_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}"

def backup_data():
    if not DB_URL:
        print("❌ DATABASE_URL missing")
        return

    print(f"--- STARTING BACKUP of {DB_URL.split('@')[1]} ---")
    os.makedirs(BACKUP_DIR, exist_ok=True)
    
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get all user tables
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        tables = [r['table_name'] for r in cur.fetchall()]
        
        print(f"Found {len(tables)} tables: {', '.join(tables)}")
        
        for table in tables:
            print(f"Backing up {table}...", end=" ")
            cur.execute(f"SELECT * FROM {table}")
            rows = cur.fetchall()
            
            # Serialize dates/binary
            def json_serial(obj):
                if isinstance(obj, (datetime.datetime, datetime.date)):
                    return obj.isoformat()
                if isinstance(obj, bytes):
                    return str(obj)
                return str(obj)
                
            file_path = os.path.join(BACKUP_DIR, f"{table}.json")
            with open(file_path, "w") as f:
                json.dump(rows, f, default=json_serial, indent=2)
            
            print(f"✅ Saved {len(rows)} rows to {file_path}")
            
        print(f"\n✅ BACKUP COMPLETED to {BACKUP_DIR}")
        
    except Exception as e:
        print(f"\n❌ BACKUP FAILED: {e}")
    finally:
        if conn: conn.close()

if __name__ == "__main__":
    backup_data()
