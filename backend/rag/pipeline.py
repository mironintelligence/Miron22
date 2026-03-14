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
            raise RuntimeError("CRITICAL: No valid OPENAI_API_KEY. Production RAG cannot start without a real key.")
            
        self.aclient = AsyncOpenAI(api_key=api_key)
        
    async def run(self, query: str) -> Dict[str, Any]:
        """
        End-to-end RAG: Query -> Retrieve -> Rerank -> Generate -> Answer
        """
        logger.info(f"RAG Query: {query}")
        
        # 1. Retrieval
        docs = await self.retriever.search(query, limit=20)
        logger.info(f"Retrieved {len(docs)} candidates.")
        
        # 2. Reranking
        top_docs = await self.reranker.rerank(query, docs, top_k=5)
        logger.info(f"Reranked top {len(top_docs)} docs.")
        
        # 3. Bağlam oluşturma
        context = ""
        for i, doc in enumerate(top_docs):
            context += f"Decision ID: {doc.get('decision_id')}\nText: {doc.get('chunk_text')}\n---\n"
            
        # 4. LLM Generation
        system_prompt = """Sen Türk hukukunda uzman bir yapay zeka asistanısın. Verilen bağlamı kullanarak kullanıcının sorusunu yanıtla.
Yanıtını şu başlıklarla yapılandır:
1. Hukuki Sorun
2. İlgili Mevzuat
3. Emsal/İçtihat
4. Değerlendirme
5. Sonuç

Uygun yerlerde decision_id değerlerini kaynak olarak belirt. Yanıt bağlamda yoksa, mevcut bilgiye göre bilmediğini söyle.
Uydurma yapma."""
        
        try:
            resp = await self.aclient.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Bağlam:\n{context}\n\nSoru: {query}"}
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
            raise e # Production Mode: Fail loudly if LLM fails

rag_pipeline = RAGPipeline()
