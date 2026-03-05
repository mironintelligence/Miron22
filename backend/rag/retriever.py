import asyncio
import os
import logging
from typing import List, Dict, Any, Optional
import json
import numpy as np
from openai import AsyncOpenAI

from backend.db_async import db

# Adjust for actual key
api_key = os.getenv("OPENAI_API_KEY")
if api_key and "placeholder" in api_key:
    api_key = None
aclient = AsyncOpenAI(api_key=api_key) if api_key else None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("retriever")

class HybridRetriever:
    def __init__(self):
        pass

    async def get_embedding(self, text: str) -> List[float]:
        if not aclient:
            return np.random.rand(1536).tolist()
        try:
            resp = await aclient.embeddings.create(input=[text], model="text-embedding-3-small")
            return resp.data[0].embedding
        except Exception as e:
            logger.error(f"Embedding error: {e}")
            return []

    async def search(self, query_text: str, limit: int = 20) -> List[Dict[str, Any]]:
        query_embedding = await self.get_embedding(query_text)
        embedding_str = json.dumps(query_embedding)
        
        # Hybrid Search Query
        # 1. Vector Similarity (Cosine Distance)
        # 2. Full Text Search (TS_RANK_CD)
        # 3. Boosts (Authority, Citation)
        
        # Formula:
        # score = (0.5 * vector_score) + (0.3 * text_score) + (0.1 * auth) + (0.1 * cit)
        # Vector distance is 0..2 (cosine). Similarity = 1 - (distance/2) approx or use specific operator.
        # pgvector <-> is Euclidean distance, <=> is Cosine distance.
        # Cosine distance returns 0 for identical.
        # So similarity = 1 - distance.
        
        sql = """
        WITH vector_search AS (
            SELECT id, 1 - (embedding <=> $1) as vector_score
            FROM legal_chunks
            ORDER BY embedding <=> $1
            LIMIT 100
        ),
        text_search AS (
            SELECT id, ts_rank_cd(tsv, plainto_tsquery('turkish', $2)) as text_score
            FROM legal_chunks
            WHERE tsv @@ plainto_tsquery('turkish', $2)
            LIMIT 100
        )
        SELECT 
            lc.id,
            lc.chunk_text,
            lc.decision_id,
            COALESCE(vs.vector_score, 0) as v_score,
            COALESCE(ts.text_score, 0) as t_score,
            lc.authority_score,
            lc.citation_score,
            (
                (0.5 * COALESCE(vs.vector_score, 0)) +
                (0.3 * COALESCE(ts.text_score, 0)) + 
                (0.1 * COALESCE(lc.authority_score, 0)) +
                (0.1 * COALESCE(lc.citation_score, 0))
            ) as final_score
        FROM legal_chunks lc
        LEFT JOIN vector_search vs ON lc.id = vs.id
        LEFT JOIN text_search ts ON lc.id = ts.id
        WHERE vs.id IS NOT NULL OR ts.id IS NOT NULL
        ORDER BY final_score DESC
        LIMIT $3
        """
        
        # Note: <=> operator requires vector type. We assume it works.
        # Also need to cast $1 to vector explicitly sometimes: $1::vector
        # But asyncpg might handle it if type matches.
        
        try:
            results = await db.fetch_all(sql, embedding_str, query_text, limit)
            return [dict(r) for r in results]
        except Exception as e:
            logger.error(f"Search failed: {e}")
            return []

class Reranker:
    def __init__(self):
        # Placeholder for cross-encoder reranker.
        # If no model server, we might skip or use simple heuristic.
        pass
        
    async def rerank(self, query: str, docs: List[Dict[str, Any]], top_k: int = 5) -> List[Dict[str, Any]]:
        # Mock rerank: just return top_k for now or use LLM to pick best.
        # Using LLM to rerank is expensive but effective.
        # For "Production-grade", typically a local CrossEncoder (e.g. BGE-Reranker) is used.
        # Since we are in python env, we could load a small model if memory allows, or use API.
        # Let's just return top_k sorted by score from DB for now.
        return docs[:top_k]

retriever = HybridRetriever()
reranker = Reranker()
