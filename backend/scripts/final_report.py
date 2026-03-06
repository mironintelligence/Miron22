import asyncio
import os
import sys
import json
from datetime import datetime

# Adjust path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "backend", ".env"))

from db_async import db

async def final_report():
    print("--- 📊 GENERATING FINAL REPORT ---")
    await db.init_pools()
    
    # 1. Total Unique Decisions
    total = await db.fetch_one("SELECT COUNT(*) FROM decisions")
    
    # 2. Total Chunks (Vector Corpus)
    # We don't have chunks in DB yet, they are in JSONL. 
    chunks_count = 0
    if os.path.exists("backend/storage/vector_corpus.jsonl"):
        with open("backend/storage/vector_corpus.jsonl", "r") as f:
            chunks_count = sum(1 for _ in f)
            
    # 3. Unique Citations (from graph or raw_json)
    # We can approximate from referenced_laws
    # Or just say N/A if not computed yet
    
    # 4. Graph Nodes/Edges (from JSON)
    graph_metrics = {}
    if os.path.exists("backend/diagnostics/graph_metrics.json"):
        with open("backend/diagnostics/graph_metrics.json", "r") as f:
            graph_metrics = json.load(f)
            
    report = {
        "timestamp": datetime.now().isoformat(),
        "total_unique_decisions": total['count'],
        "total_chunks_prepared": chunks_count,
        "graph_nodes": graph_metrics.get("total_nodes", 0),
        "graph_edges": graph_metrics.get("total_edges", 0),
        "duplicates_prevented_count": "Unknown (Logs)", # Hard to track without log parsing
        "status": "CRAWLING (SAFE MODE)",
        "target": 80000
    }
    
    print(json.dumps(report, indent=2))
    
    with open("backend/diagnostics/post_cleanup_report.json", "w") as f:
        json.dump(report, f, indent=2)
        
    await db.close_pools()

if __name__ == "__main__":
    asyncio.run(final_report())
