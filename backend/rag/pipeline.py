import asyncio
import os
import logging
from typing import Dict, Any, List

from rag.retriever import HybridRetriever, Reranker
from openai import AsyncOpenAI

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("rag_pipeline")

class RAGPipeline:
    def __init__(self):
        self.retriever = HybridRetriever()
        self.reranker = Reranker()
        
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key or "placeholder" in api_key:
            raise RuntimeError("No valid LLM API Key configured. Set OPENAI_API_KEY in backend/.env")
            
        self.aclient = AsyncOpenAI(api_key=api_key)
        
    async def run(self, query: str) -> Dict[str, Any]:
        """
        End-to-end RAG: Query -> Retrieve -> Rerank -> Generate -> Answer
        """
        if not self.aclient:
            return {"error": "No LLM API Key configured"}
            
        logger.info(f"RAG Query: {query}")
        
        # 1. Retrieval
        docs = await self.retriever.search(query, limit=20)
        logger.info(f"Retrieved {len(docs)} candidates.")
        
        # 2. Reranking
        top_docs = await self.reranker.rerank(query, docs, top_k=5)
        logger.info(f"Reranked top {len(top_docs)} docs.")
        
        # 3. Context Construction
        context = ""
        for i, doc in enumerate(top_docs):
            context += f"Decision ID: {doc.get('decision_id')}\nText: {doc.get('chunk_text')}\n---\n"
            
        # 4. LLM Generation
        system_prompt = """You are an expert Turkish legal assistant. Use the provided context to answer the user's question.
        Structure your answer as follows:
        1. Issue
        2. Relevant Law
        3. Precedent
        4. Analysis
        5. Conclusion
        
        Cite decision IDs where relevant. If the answer is not in the context, state that you don't know based on the available information.
        Do not hallucinate."""
        
        try:
            resp = await self.aclient.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {query}"}
                ],
                temperature=0.0
            )
            answer = resp.choices[0].message.content
            
            return {
                "query": query,
                "answer": answer,
                "sources": [d.get('decision_id') for d in top_docs],
                "context_used": context[:500] + "..." # Snippet
            }
        except Exception as e:
            logger.error(f"LLM Generation failed: {e}")
            return {"error": str(e)}

rag_pipeline = RAGPipeline()
