import asyncio
import os
import sys
import json

# Adjust path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "backend", ".env"))

from db_async import db

async def check_fingerprint_dupes():
    print("--- 🕵️ CHECKING FINGERPRINT DUPLICATES ---")
    await db.init_pools()
    
    # Find fingerprints with > 1 occurrence
    query = """
        SELECT fingerprint, COUNT(*) as c 
        FROM decisions 
        WHERE fingerprint IS NOT NULL 
        GROUP BY fingerprint 
        HAVING COUNT(*) > 1
    """
    
    dupes = await db.fetch_all(query)
    print(f"Found {len(dupes)} sets of near-duplicates.")
    
    if dupes:
        print("Cleaning up duplicates (keeping earliest)...")
        deleted_count = 0
        
        for row in dupes:
            fp = row['fingerprint']
            # Get all IDs for this fingerprint, ordered by created_at ASC
            ids_rows = await db.fetch_all(f"SELECT id FROM decisions WHERE fingerprint = '{fp}' ORDER BY created_at ASC")
            ids = [r['id'] for r in ids_rows]
            
            # Keep first, delete rest
            to_delete = ids[1:]
            if to_delete:
                placeholders = ",".join([f"'{str(uid)}'" for uid in to_delete])
                await db.execute(f"DELETE FROM decisions WHERE id IN ({placeholders})")
                deleted_count += len(to_delete)
                
        print(f"Deleted {deleted_count} near-duplicate records.")
    else:
        print("No near-duplicates found.")
        
    await db.close_pools()

if __name__ == "__main__":
    asyncio.run(check_fingerprint_dupes())
