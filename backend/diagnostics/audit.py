import asyncio
import os
import sys
import json
import hashlib
from collections import Counter

# Adjust path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "backend", ".env"))

from backend.db_async import db

async def data_audit():
    print("--- 🔍 PHASE 1: DATA AUDIT ---")
    await db.init_pools()
    
    # 1. Basic Counts
    total_res = await db.fetch_one("SELECT COUNT(*) FROM decisions")
    total = total_res['count']
    
    unique_hash_res = await db.fetch_one("SELECT COUNT(DISTINCT hash) FROM decisions")
    unique_hashes = unique_hash_res['count']
    
    unique_url_res = await db.fetch_one("SELECT COUNT(DISTINCT source_url) FROM decisions")
    unique_urls = unique_url_res['count']
    
    print(f"Total Records: {total}")
    print(f"Unique Hashes: {unique_hashes}")
    print(f"Unique URLs: {unique_urls}")
    
    # 2. Content Length Stats
    len_stats = await db.fetch_one("""
        SELECT 
            AVG(LENGTH(full_text)) as avg_len,
            MIN(LENGTH(full_text)) as min_len,
            MAX(LENGTH(full_text)) as max_len
        FROM decisions
    """)
    
    # 3. Distribution by Source/Year
    source_dist = await db.fetch_all("SELECT source, COUNT(*) FROM decisions GROUP BY source")
    year_dist = await db.fetch_all("SELECT EXTRACT(YEAR FROM decision_date) as yr, COUNT(*) FROM decisions GROUP BY yr ORDER BY yr DESC")
    
    # 4. Detect Duplicates (Exact Content)
    # Although hash is unique in DB, let's check if we have same content with different hash (unlikely if hash is SHA256 of content)
    # But we might have duplicates by URL
    
    duplicates_by_url = await db.fetch_all("""
        SELECT source_url, COUNT(*) as c 
        FROM decisions 
        GROUP BY source_url 
        HAVING COUNT(*) > 1
    """)
    
    # 5. Detect Corrupted/Empty
    corrupted = await db.fetch_one("SELECT COUNT(*) FROM decisions WHERE LENGTH(full_text) < 500")
    
    report = {
        "total_records": total,
        "unique_content_hashes": unique_hashes,
        "unique_source_urls": unique_urls,
        "average_content_length": int(len_stats['avg_len']) if len_stats['avg_len'] else 0,
        "min_content_length": int(len_stats['min_len']) if len_stats['min_len'] else 0,
        "max_content_length": int(len_stats['max_len']) if len_stats['max_len'] else 0,
        "source_distribution": {row['source']: row['count'] for row in source_dist},
        "year_distribution": {int(row['yr']) if row['yr'] else 'Unknown': row['count'] for row in year_dist},
        "duplicate_urls_count": len(duplicates_by_url),
        "corrupted_entries_count": corrupted['count'],
        "integrity_status": "GOOD" if total == unique_hashes and corrupted['count'] == 0 else "NEEDS_CLEANUP"
    }
    
    os.makedirs("backend/diagnostics", exist_ok=True)
    with open("backend/diagnostics/data_integrity_report.json", "w") as f:
        json.dump(report, f, indent=2, default=str)
        
    print("Report saved to backend/diagnostics/data_integrity_report.json")
    await db.close_pools()

if __name__ == "__main__":
    asyncio.run(data_audit())
