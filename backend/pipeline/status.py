import asyncio
import os
import sys
import json
from datetime import datetime

# Adjust path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "backend", ".env"))

from backend.db_async import db

async def check_status():
    await db.init_pools()
    
    total = await db.fetch_one("SELECT COUNT(*) FROM decisions")
    avg_len = await db.fetch_one("SELECT AVG(LENGTH(full_text)) as l FROM decisions")
    
    status = {
        "timestamp": datetime.now().isoformat(),
        "total_decisions": total['count'],
        "avg_text_length": int(avg_len['l']) if avg_len['l'] else 0,
        "status": "RUNNING" if total['count'] < 22000 else "COMPLETE"
    }
    
    print(json.dumps(status, indent=2))
    
    # Save diagnostic report
    with open("backend/diagnostics/ingestion_status.json", "w") as f:
        json.dump(status, f, indent=2)
        
    await db.close_pools()

if __name__ == "__main__":
    asyncio.run(check_status())
