import asyncio
import os
import sys
import logging
from typing import List

# Adjust path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "backend", ".env"))

from backend.db_async import db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("db_check")

async def check_db():
    logger.info("Checking DB Schema...")
    await db.init_pools()
    
    # Check tables
    tables = await db.fetch_all("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")
    table_names = [t['tablename'] for t in tables]
    logger.info(f"Tables in public: {table_names}")
    
    # Check extensions
    extensions = await db.fetch_all("SELECT extname, extversion, extnamespace::regnamespace::text FROM pg_extension")
    ext_info = [(e['extname'], e['extversion'], e['extnamespace']) for e in extensions]
    logger.info(f"Extensions: {ext_info}")
    
    # Check if vector extension exists and where
    has_vector = any(e[0] == 'vector' for e in ext_info)
    if has_vector:
        logger.info("Vector extension present.")
    else:
        logger.info("Vector extension NOT present. Need to create it.")
        
    await db.close_pools()

if __name__ == "__main__":
    asyncio.run(check_db())
