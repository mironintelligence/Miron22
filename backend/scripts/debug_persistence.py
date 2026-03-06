import asyncio
import os
import sys
import logging

# Adjust path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "backend", ".env"))

from master_ingestion.persistence import persistence

logging.basicConfig(level=logging.INFO)

async def check():
    print("Checking persistence...")
    await persistence.init()
    count = await persistence.get_total_count()
    print(f"Count: {count}")
    await persistence.close()

if __name__ == "__main__":
    asyncio.run(check())
