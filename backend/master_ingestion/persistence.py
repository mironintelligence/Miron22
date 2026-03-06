import sys
import os
import logging
import asyncio
import hashlib
from typing import Dict, Any, Optional
import json

# Adjust path BEFORE importing backend
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from db_async import db
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "backend", ".env"))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("persistence")

class Persistence:
    def __init__(self):
        self.initialized = False
        self.lock = asyncio.Lock() # Prevent race conditions on init
        
    async def init(self):
        async with self.lock:
            if not self.initialized:
                # db.init_pools handles errors and retries internally now
                try:
                    await db.init_pools()
                    self.initialized = True
                except Exception as e:
                    logger.error(f"Persistence init failed: {e}")
                    # Don't set initialized=True if failed
                    raise e
            
    async def close(self):
        if self.initialized:
            await db.close_pools()
            self.initialized = False

    async def is_duplicate(self, content_hash: str, source_url: str = None, fingerprint: str = None) -> bool:
        """
        Checks if doc exists in DB using multi-layer dedup.
        """
        # Ensure init
        if not self.initialized: await self.init()
            
        try:
            # Layer 1: Content Hash
            res = await db.fetch_one("SELECT 1 FROM decisions WHERE hash = $1", content_hash)
            if res: return True
            
            # Layer 2: Source URL (External ID)
            if source_url:
                res = await db.fetch_one("SELECT 1 FROM decisions WHERE source_url = $1", source_url)
                if res: return True
                
            # Layer 3: Fingerprint (Exact match for now, fuzzy later if needed)
            if fingerprint:
                res = await db.fetch_one("SELECT 1 FROM decisions WHERE fingerprint = $1", fingerprint)
                if res: return True
                
            return False
        except Exception as e:
            logger.error(f"Duplicate check error: {e}")
            # If DB is down, is_duplicate should probably raise rather than return False (which would cause duplicate insert attempts)
            # But safe_db_execute handles retries. If we get here, it's a non-connection error or max retries exceeded.
            # Returning False here is risky if DB is down.
            # Let's rely on safe_db_execute to raise DBConnectionError if persistent failure.
            raise e

    async def save_decision(self, doc: Dict[str, Any]) -> bool:
        """
        Saves decision to DB. Returns True if saved, False if duplicate or error.
        """
        if not self.initialized: await self.init()
        
        # Deduplication check
        # We need to compute fingerprint here if not present
        if 'fingerprint' not in doc:
            from utils.fingerprint import simhash
            doc['fingerprint'] = simhash(doc['full_text'])
            
        try:
            if await self.is_duplicate(doc['hash'], doc.get('source_url'), doc.get('fingerprint')):
                logger.debug(f"Duplicate found: {doc.get('decision_no')}")
                return False
        except Exception as e:
            logger.error(f"Duplicate check failed: {e}")
            return False
            
        try:
            # Handle JSONB serialization
            raw_json = json.dumps(doc.get('raw_json')) if doc.get('raw_json') else None
            
            await db.execute("""
                INSERT INTO decisions (
                    source, court, decision_date, decision_no, full_text, 
                    raw_json, hash, source_url, summary, referenced_laws, citation_count, fingerprint
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            """, 
                doc['source'], doc['court'], doc.get('decision_date'), doc.get('decision_no'),
                doc['full_text'], raw_json, doc['hash'], doc.get('source_url'),
                doc.get('summary'), doc.get('referenced_laws'), doc.get('citation_count', 0),
                doc.get('fingerprint')
            )
            return True
        except Exception as e:
            if "unique constraint" in str(e).lower():
                logger.warning(f"Duplicate caught by DB constraint: {doc.get('decision_no')}")
                return False
            logger.error(f"Save Error: {e}")
            return False

    async def get_total_count(self) -> int:
        if not self.initialized: await self.init()
        # Remove try/except to see real error
        res = await db.fetch_one("SELECT COUNT(*) FROM decisions")
        return res['count']

persistence = Persistence()
