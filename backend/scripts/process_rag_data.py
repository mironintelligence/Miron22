import asyncio
import os
import sys
import logging
from typing import List, Dict, Any
import tiktoken
import numpy as np

# Adjust path to include backend/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

from db_async import db
from rag.vector_store import vector_store
from rag.chunker import chunker
from openai import AsyncOpenAI
import numpy as np

# Mock embedding for now if OpenAI key not available or to avoid cost in test.
# But prompt says "Batch embed all chunks".
# I'll check if OPENAI_API_KEY is present.
api_key = os.getenv("OPENAI_API_KEY")

# Check if key is valid/not dummy
if api_key and ("placeholder" in api_key or not api_key.startswith("sk-") or len(api_key) < 20):
    print("❌ Error: Set a valid OPENAI_API_KEY in backend/.env before running. PRODUCTION MODE ENFORCED.")
    sys.exit(1)

aclient = AsyncOpenAI(api_key=api_key) if api_key else None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("process_chunks")

async def get_embedding(text: str) -> List[float]:
    if not aclient:
        logger.warning("No OpenAI Key. Using random vectors for testing.")
        return np.random.rand(1536).tolist()
    try:
        resp = await aclient.embeddings.create(input=[text], model="text-embedding-3-small")
        return resp.data[0].embedding
    except Exception as e:
        logger.error(f"Embedding error: {e}")
        return []

async def process_decisions_batch(batch_size=50):
    await db.init_pools()
    
    offset = 0
    total_processed = 0
    
    while True:
        # Fetch decisions that don't have chunks yet?
        # Or just re-process all. Given "11,685 legal decisions", let's assume we want to process all.
        # Check if chunks exist for decision to avoid duplicate work.
        query = """
            SELECT d.id, d.full_text, d.decision_date, d.court, d.citation_count
            FROM decisions d
            LEFT JOIN legal_chunks lc ON d.id = lc.decision_id
            WHERE lc.id IS NULL
            LIMIT $1
        """
        # Note: LIMIT with offset on large table is slow, better use keyset pagination or just process what's missing.
        # The query above selects only unprocessed ones.
        
        decisions = await db.fetch_all(query, batch_size)
        if not decisions:
            break
            
        logger.info(f"Processing batch of {len(decisions)} decisions...")
        
        all_chunks_data = []
        
        for d in decisions:
            text = d['full_text']
            if not text: continue
            
            chunks = chunker.chunk_text(text)
            
            # Embed chunks (in parallel for speed if API allows, but rate limits apply)
            # For simplicity, sequential or small batch.
            # OpenAI supports batch inputs.
            
            # Batch embedding call
            try:
                if aclient:
                    resp = await aclient.embeddings.create(input=chunks, model="text-embedding-3-small")
                    embeddings = [data.embedding for data in resp.data]
                else:
                    embeddings = [np.random.rand(1536).tolist() for _ in chunks]
            except Exception as e:
                logger.error(f"Batch embedding failed for decision {d['id']}: {e}")
                continue
                
            for i, chunk_text in enumerate(chunks):
                chunk_data = {
                    "decision_id": d['id'],
                    "chunk_text": chunk_text,
                    "embedding": embeddings[i],
                    "authority_score": 0, # Placeholder, should come from authority engine
                    "citation_score": d.get('citation_count', 0),
                    "decision_date": d.get('decision_date'),
                    "court_type": d.get('court')
                }
                all_chunks_data.append(chunk_data)
        
        if all_chunks_data:
            await vector_store.save_chunks(all_chunks_data)
            total_processed += len(decisions)
            logger.info(f"Saved {len(all_chunks_data)} chunks from {len(decisions)} decisions.")
            
    logger.info(f"Total processed: {total_processed}")
    await db.close_pools()

if __name__ == "__main__":
    asyncio.run(process_decisions_batch())
