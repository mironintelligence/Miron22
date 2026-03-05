import sys
import os
import asyncio
import logging
from typing import List

# Adjust path BEFORE imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import asyncio
import logging
import os
import sys

# Adjust path to project root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "backend", ".env"))

from backend.master_ingestion.endpoint_resolver import AYMEndpointResolver
from backend.master_ingestion.persistence import persistence
from backend.master_ingestion.async_client import client
from backend.master_ingestion.checkpoint import checkpoint

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("crawler_engine")

class CrawlerEngine:
    def __init__(self):
        self.target_count = 80000
        # Register all known AYM subdomains
        self.resolvers = [
            AYMEndpointResolver("kararlarbilgibankasi"),
            AYMEndpointResolver("normkararlarbilgibankasi")
        ] 
        
    async def run(self):
        print("--- 🚀 MASTER INGESTION ENGINE STARTED (RESILIENT MODE) ---")
        print(f"Target: {self.target_count} Real Decisions")
        
        while True:
            try:
                await persistence.init()
                await client.init()
                
                total_valid = await persistence.get_total_count()
                print(f"Initial Count: {total_valid}")
                
                if total_valid >= self.target_count:
                    print("✅ TARGET ACHIEVED: 80,000 REAL DECISIONS STORED")
                    break

                # Endless Loop Logic
                while total_valid < self.target_count:
                    
                    for resolver in self.resolvers:
                        if total_valid >= self.target_count: break
                        
                        source_key = resolver.subdomain
                        start_page = checkpoint.get_last_page(source_key)
                        
                        logger.info(f"Scanning Subdomain: {source_key} starting from page {start_page}...")
                        
                        try:
                            # Async generator usage
                            async for page, docs in resolver.traverse_pages(start_page=start_page):
                                saved_count = 0
                                for doc in docs:
                                    saved = await persistence.save_decision(doc)
                                    if saved:
                                        saved_count += 1
                                        total_valid += 1
                                
                                # Update Checkpoint after processing page
                                checkpoint.update_page(source_key, page + 1)
                                
                                if saved_count > 0:
                                    if total_valid % 10 == 0:
                                        print(f"🔥 Progress: {total_valid}/{self.target_count}")
                                
                                if total_valid >= self.target_count:
                                    break
                                    
                        except Exception as e:
                            logger.error(f"Crawler Error on {source_key}: {e}")
                            await asyncio.sleep(10) # Backoff
                        
                    if total_valid < self.target_count:
                        print("Cycle finished (all pages scanned). Waiting before restart...")
                        await asyncio.sleep(600) # Wait 10 mins before rescanning for new content
                
                break # Exit main loop if target reached

            except Exception as e:
                logger.error(f"🔥 CRITICAL FAILURE IN CRAWLER LOOP: {e}")
                logger.info("♻️  Attempting AUTO-RECOVERY in 30 seconds...")
                
                # Close connections to ensure clean state
                try:
                    await persistence.close()
                    await client.close()
                except: pass
                
                await asyncio.sleep(30)
                continue
                
        await persistence.close()
        await client.close()

if __name__ == "__main__":
    try:
        asyncio.run(CrawlerEngine().run())
    except KeyboardInterrupt:
        print("Stopped by user")
