import asyncio
import asyncpg
import os
import ssl

# Hardcoded for testing to bypass .env loading issues if any
# Using the value from the user's previous output
DB_URL = "postgresql://postgres.ffvdyjvmwmbtxqvqwhtt:Kerimaydemir@aws-1-eu-central-1.pooler.supabase.com:6543/postgres"

async def test_connection():
    print(f"Testing connection to: {DB_URL}")
    
    # Create SSL context explicitly
    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE

    print("--- Attempt 1: Transaction Pooler (6543) with statement_cache_size=0 ---")
    try:
        conn = await asyncpg.connect(
            DB_URL, 
            ssl=ssl_ctx, 
            statement_cache_size=0,
            timeout=10
        )
        print("✅ Connection Successful!")
        res = await conn.fetchrow("SELECT count(*) FROM decisions")
        print(f"Query Result: {res}")
        await conn.close()
    except Exception as e:
        print(f"❌ Connection Failed: {e}")

    print("\n--- Attempt 2: Direct Port (5432) ---")
    try:
        # Replace port 6543 with 5432
        direct_url = DB_URL.replace(":6543", ":5432")
        print(f"Connecting to: {direct_url}")
        conn = await asyncpg.connect(
            direct_url, 
            ssl=ssl_ctx, 
            timeout=10
        )
        print("✅ Connection Successful!")
        res = await conn.fetchrow("SELECT count(*) FROM decisions")
        print(f"Query Result: {res}")
        await conn.close()
    except Exception as e:
        print(f"❌ Connection Failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_connection())
