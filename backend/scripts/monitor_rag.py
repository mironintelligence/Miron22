import asyncio
import os
import sys
import logging
from datetime import datetime
import json

# Adjust path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "backend", ".env"))

from backend.db_async import db

async def perf_check():
    print("--- 📊 PERFORMANCE MONITORING ---")
    await db.init_pools()
    
    # 1. Analyze Tables
    print("Running ANALYZE (timeout 120s)...")
    try:
        await db.execute("ANALYZE decisions", timeout=120.0)
        await db.execute("ANALYZE legal_chunks", timeout=120.0)
    except Exception as e:
        print(f"ANALYZE failed: {e}")
    
    # 2. Check Index Usage
    query = """
    SELECT relname, indexrelname, idx_scan, idx_tup_read, idx_tup_fetch
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
    ORDER BY idx_scan DESC
    """
    indexes = await db.fetch_all(query)
    
    # 3. Check Table Stats
    query_stats = """
    SELECT relname, seq_scan, idx_scan, n_tup_ins, n_tup_upd, n_tup_del
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    """
    table_stats = await db.fetch_all(query_stats)
    
    report = {
        "timestamp": datetime.now().isoformat(),
        "indexes": [dict(r) for r in indexes],
        "tables": [dict(r) for r in table_stats]
    }
    
    print(json.dumps(report, indent=2, default=str))
    
    with open("backend/diagnostics/rag_health_report.json", "w") as f:
        json.dump(report, f, indent=2, default=str)
        
    await db.close_pools()

if __name__ == "__main__":
    asyncio.run(perf_check())
