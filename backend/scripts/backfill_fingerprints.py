import asyncio
import os
import sys
import hashlib
import re

# Adjust path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "backend", ".env"))

from db_async import db
from utils.fingerprint import simhash

async def backfill():
    print("--- 🧬 BACKFILLING FINGERPRINTS ---")
    await db.init_pools()
    
    # Process in batches
    batch_size = 100
    offset = 0
    
    while True:
        try:
            rows = await db.fetch_all(f"SELECT id, full_text FROM decisions WHERE fingerprint IS NULL LIMIT {batch_size}")
            if not rows:
                break
                
            print(f"Processing batch offset {offset} ({len(rows)} docs)...")
            
            updates = []
            for row in rows:
                fp = simhash(row['full_text'])
                updates.append((fp, row['id']))
                
            # Construct update queries
            # "UPDATE decisions SET fingerprint = $1 WHERE id = $2"
            await db.execute_many("UPDATE decisions SET fingerprint = $1 WHERE id = $2", updates, timeout=120.0)
            
            offset += len(rows)
        except Exception as e:
            print(f"Error in batch: {e}. Retrying in 5s...")
            await asyncio.sleep(5)
            continue
        
    print("Backfill Complete.")
    await db.close_pools()

if __name__ == "__main__":
    asyncio.run(backfill())
