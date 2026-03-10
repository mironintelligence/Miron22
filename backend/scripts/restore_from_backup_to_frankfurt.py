import json
import psycopg2
import os
import sys
from datetime import datetime

# --- CONFIG ---
# Frankfurt DB
NEW_DB_URL = os.getenv("NEW_DB_URL")

# Backup Path
BACKUP_DIR = "backups/seoul_20260224_232833"

# Tables in Order (Dependency Order)
TABLE_FILES = [
    ("users", "users.json"),
    ("discount_codes", "discount_codes.json"),
    ("sessions", "sessions.json"),
    ("audit_logs", "audit_logs.json")
]

def restore():
    print("🚀 Starting Restore: Backup (JSON) -> Frankfurt DB")
    
    try:
        # Connect to NEW DB
        print("🔌 Connecting to NEW DB (Frankfurt)...")
        conn = psycopg2.connect(NEW_DB_URL)
        cur = conn.cursor()
        print("✅ Connected.")
        
        # Ensure Tables Exist (Run basic migrations if needed)
        # Assuming schema exists or was created by app startup. 
        # If not, we might need to create them. Let's assume they exist for now.
        
        for table, filename in TABLE_FILES:
            filepath = os.path.join(BACKUP_DIR, filename)
            if not os.path.exists(filepath):
                print(f"⚠️  Backup file not found: {filepath}")
                continue
                
            print(f"\n📦 Restoring table: {table} from {filename}...")
            
            with open(filepath, "r") as f:
                rows = json.load(f)
                
            if not rows:
                print("   File is empty. Skipping.")
                continue
                
            print(f"   Found {len(rows)} records.")
            
            inserted_count = 0
            for row in rows:
                # Filter out None values for columns that might be missing in schema if schema changed
                # But here we assume schema matches backup.
                
                cols = list(row.keys())
                vals = list(row.values())
                
                placeholders = ",".join(["%s"] * len(vals))
                col_names = ",".join(cols)
                
                query = f"""
                    INSERT INTO {table} ({col_names}) 
                    VALUES ({placeholders})
                    ON CONFLICT (id) DO NOTHING;
                """
                
                try:
                    cur.execute(query, vals)
                    inserted_count += 1
                except Exception as e:
                    print(f"   ❌ Error inserting row {row.get('id', '?')}: {e}")
                    conn.rollback() # Rollback stmt
                    continue
            
            conn.commit()
            print(f"   ✅ Restored {inserted_count}/{len(rows)} records.")

        print("\n🎉 Restore Completed Successfully!")

    except Exception as e:
        print(f"\n❌ CRITICAL ERROR: {e}")
    finally:
        if 'conn' in locals() and conn: conn.close()

if __name__ == "__main__":
    restore()
