import os
import json
import psycopg2
import glob
from dotenv import load_dotenv

# Load Env
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))

DB_URL = os.getenv("DATABASE_URL")

def restore_data():
    print(f"--- RESTORING DATA TO FRANKFURT DB ---")
    
    # Find latest backup
    backups = sorted(glob.glob("backups/seoul_*"), reverse=True)
    if not backups:
        print("❌ No backup folder found")
        return
        
    backup_dir = backups[0]
    print(f"Using Backup: {backup_dir}")
    
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        
        files = ["users.json", "discount_codes.json", "sessions.json", "audit_logs.json"]
        
        for fname in files:
            path = os.path.join(backup_dir, fname)
            if not os.path.exists(path):
                print(f"⚠️ {fname} missing, skipping")
                continue
                
            table = fname.replace(".json", "")
            print(f"Restoring {table}...", end=" ")
            
            with open(path, "r") as f:
                rows = json.load(f)
                
            if not rows:
                print("Skipped (Empty)")
                continue
                
            cols = rows[0].keys()
            col_str = ", ".join(cols)
            val_placeholders = ", ".join(["%s"] * len(cols))
            
            sql = f"""
                INSERT INTO {table} ({col_str}) 
                VALUES ({val_placeholders}) 
                ON CONFLICT DO NOTHING
            """
            
            data = []
            for r in rows:
                row_tuple = []
                for c in cols:
                    val = r[c]
                    if isinstance(val, dict):
                        val = json.dumps(val)
                    row_tuple.append(val)
                data.append(tuple(row_tuple))
            
            cur.executemany(sql, data)
            conn.commit()
            print(f"✅ {len(rows)} rows inserted")
            
        print("\n✅ DATA RESTORE COMPLETED")
        
        # Verify Counts
        print("\n--- VERIFICATION ---")
        for table in ["users", "sessions", "audit_logs"]:
            cur.execute(f"SELECT COUNT(*) FROM {table}")
            print(f"{table}: {cur.fetchone()[0]}")
            
        conn.close()
        
    except Exception as e:
        print(f"\n❌ RESTORE FAILED: {e}")

if __name__ == "__main__":
    restore_data()
