import asyncio
import os
import sys
import json
import logging

# Adjust path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "backend", ".env"))

from db_async import db

async def generate_ingestion_report():
    await db.init_pools()
    
    # Fetch Stats
    total = await db.fetch_one("SELECT COUNT(*) FROM decisions")
    total_count = total['count']
    
    # Duplicates (Hash based) - Actually DB has unique constraint on hash, so duplicates should be 0.
    # But let's check distinct hashes vs count just in case.
    distinct_hash = await db.fetch_one("SELECT COUNT(DISTINCT hash) FROM decisions")
    duplicates = total_count - distinct_hash['count']
    
    # Text Stats
    stats = await db.fetch_one("""
        SELECT 
            AVG(LENGTH(full_text)) as avg_len,
            MIN(LENGTH(full_text)) as min_len,
            MAX(LENGTH(full_text)) as max_len
        FROM decisions
    """)
    
    # Failed Detail Fetch (Assuming length < 2000 means failure/empty)
    failed = await db.fetch_one("SELECT COUNT(*) FROM decisions WHERE LENGTH(full_text) < 2000")
    
    report = {
        "total_decisions": total_count,
        "duplicate_count": duplicates,
        "average_text_length": int(stats['avg_len']) if stats['avg_len'] else 0,
        "min_text_length": int(stats['min_len']) if stats['min_len'] else 0,
        "max_text_length": int(stats['max_len']) if stats['max_len'] else 0,
        "failed_detail_fetch_count": failed['count'],
        "error_percentage": (failed['count'] / total_count * 100) if total_count > 0 else 0
    }
    
    print(json.dumps(report, indent=2))
    
    with open("backend/diagnostics/aym_ingestion_report.json", "w") as f:
        json.dump(report, f, indent=2)
        
    await db.close_pools()

if __name__ == "__main__":
    asyncio.run(generate_ingestion_report())
