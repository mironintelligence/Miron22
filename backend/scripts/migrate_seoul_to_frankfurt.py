import psycopg2
import os
import sys
from psycopg2.extras import RealDictCursor

# --- CONFIG ---
OLD_DB_URL = "postgresql://postgres.uwziqkbsqhtecihmzhtw:Kerimaydemir@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres"
NEW_DB_URL = "postgresql://postgres.ffvdyjvmwmbtxqvqwhtt:Kerimaydemir@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

# Tablo sırası (FK bağımlılıklarına göre)
TABLES = [
    "users",
    "discount_codes",
    "sessions",
    "audit_logs",
    "decisions",       # Yargıtay Kararları
    "legal_corpus",    # Kanun Maddeleri
    "case_files",      # Dava Dosyaları
    "pleadings",       # Dilekçeler
    "saved_searches"   # Kaydedilen aramalar (varsa)
]

def migrate():
    print("🚀 Starting Migration: Seoul -> Frankfurt")
    
    try:
        # Connect to OLD DB
        print("🔌 Connecting to OLD DB (Seoul)...")
        conn_old = psycopg2.connect(OLD_DB_URL)
        cur_old = conn_old.cursor(cursor_factory=RealDictCursor)
        print("✅ Connected to OLD DB.")

        # Connect to NEW DB
        print("🔌 Connecting to NEW DB (Frankfurt)...")
        conn_new = psycopg2.connect(NEW_DB_URL)
        cur_new = conn_new.cursor()
        print("✅ Connected to NEW DB.")
        
        # Disable FK checks temporarily (if possible)
        # Note: Transaction pooler might not allow this globally, but let's try per-session
        # or just rely on correct order.
        
        for table in TABLES:
            print(f"\n📦 Migrating table: {table}...")
            
            # 1. Fetch Data
            try:
                cur_old.execute(f"SELECT * FROM {table}")
                rows = cur_old.fetchall()
                print(f"   Found {len(rows)} rows.")
            except Exception as e:
                print(f"   ⚠️  Table {table} not found in OLD DB or error: {e}")
                conn_old.rollback()
                continue
                
            if not rows:
                continue

            # 2. Insert Data
            inserted_count = 0
            for row in rows:
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
                    cur_new.execute(query, vals)
                    inserted_count += 1
                except Exception as e:
                    print(f"   ❌ Error inserting row {row.get('id', '?')}: {e}")
                    conn_new.rollback() # Rollback transaction to clear error state
            
            conn_new.commit()
            print(f"   ✅ Migrated {inserted_count}/{len(rows)} rows.")

        print("\n🎉 Migration Completed Successfully!")

    except Exception as e:
        print(f"\n❌ CRITICAL ERROR: {e}")
    finally:
        if 'conn_old' in locals() and conn_old: conn_old.close()
        if 'conn_new' in locals() and conn_new: conn_new.close()

if __name__ == "__main__":
    migrate()
