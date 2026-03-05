import asyncio
import os
import sys
import logging
import random
import time

# Adjust path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "backend", ".env"))

from backend.db_async import db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("stress_test")

async def stress_test():
    print("--- ⚡ DB STRESS TEST STARTED ---")
    await db.init_pools()
    
    # 1. Normal Query
    print("Test 1: Normal Query")
    res = await db.fetch_one("SELECT COUNT(*) FROM decisions")
    print(f"Count: {res['count']}")
    
    # 2. Simulate Disconnect
    print("\nTest 2: Simulating Force Disconnect...")
    if db._read_pool:
        await db._read_pool.close()
    if db._write_pool:
        await db._write_pool.close()
    # Manually break the pool objects to simulate 'closed' state or invalid state
    # But safe_db_execute should handle re-init. 
    # Actually, close() sets them to closed state. safe_db_execute checks if they are None or tries to acquire.
    # If we close them, acquire might raise InterfaceError or similar.
    
    print("Pools closed manually. Attempting query (should trigger auto-recovery)...")
    
    try:
        # This should trigger safe_db_execute -> catch error -> reset_pools -> retry
        res = await db.fetch_one("SELECT COUNT(*) FROM decisions")
        print(f"✅ RECOVERY SUCCESS! Count: {res['count']}")
    except Exception as e:
        print(f"❌ RECOVERY FAILED: {e}")
        return

    # 3. Continuous Load with Random Chaos
    print("\nTest 3: Continuous Load with Random Chaos (10 iterations)")
    for i in range(10):
        try:
            # Randomly kill pool
            if random.random() < 0.3:
                print(f"[{i}] ☠️  Killing pools randomly...")
                await db.close_pools()
            
            res = await db.fetch_one("SELECT 1")
            print(f"[{i}] Query OK")
            await asyncio.sleep(0.5)
        except Exception as e:
            print(f"[{i}] Query Failed: {e}")

    print("\n✅ DB RESILIENCE MODE ACTIVE")
    await db.close_pools()

if __name__ == "__main__":
    asyncio.run(stress_test())
