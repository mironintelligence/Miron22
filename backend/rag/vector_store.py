import asyncio
import os
import logging
from typing import List, Dict, Any, Optional
import json

# Adjust path if needed, assuming backend is root or in path
from backend.db_async import db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vector_store")

class VectorStore:
    def __init__(self):
        # We assume embedding model is handled elsewhere or passed in
        # For this phase, we assume chunks already have embeddings or we generate them.
        # But wait, the prompt says "Batch embed all chunks".
        # We need an embedding function.
        # Since no specific model is mentioned, I'll use a placeholder or check if one exists.
        # Assuming OpenAI or similar given "vector(1536)".
        self.embedding_model = "text-embedding-3-small" # Standard 1536 dim
        
    async def save_chunks(self, chunks: List[Dict[str, Any]]):
        """
        Saves chunks to legal_chunks table.
        chunks: List of dicts with {decision_id, chunk_text, embedding, ...}
        """
        if not chunks:
            return

        query = """
            INSERT INTO legal_chunks (
                decision_id, chunk_text, embedding, authority_score, 
                citation_score, decision_date, court_type
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        """
        
        chunk_data = [
            (
                c['decision_id'], 
                c['chunk_text'], 
                json.dumps(c['embedding']) if isinstance(c['embedding'], list) else c['embedding'], # Format for vector type if needed, or pass as list if driver supports it.
                # asyncpg vector support depends on setup. Usually list is fine if pgvector type is registered.
                # But here it says expected str, got list. This means pgvector codec might not be registered or recognized.
                # Standard pgvector input is string "[1,2,3]".
                c.get('authority_score', 0),
                c.get('citation_score', 0),
                c.get('decision_date'),
                c.get('court_type')
            )
            for c in chunks
        ]
        
        try:
            await db.execute_many(query, chunk_data)
            logger.info(f"Saved {len(chunks)} chunks.")
        except Exception as e:
            logger.error(f"Failed to save chunks: {e}")
            raise e

    async def get_chunks_by_ids(self, ids: List[str]) -> List[Dict]:
        query = "SELECT * FROM legal_chunks WHERE id = ANY($1::uuid[])"
        return await db.fetch_all(query, ids)

vector_store = VectorStore()
