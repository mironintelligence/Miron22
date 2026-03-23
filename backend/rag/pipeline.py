import asyncio
import os
import logging
from typing import Dict, Any, List

from rag.retriever import HybridRetriever, Reranker
from openai import AsyncOpenAI

from security import augment_system_prompt_with_user_document_rule
from llm_gateway import chat_completions_create_async, llm_primary_model

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
        Yerel jsonl yazımı yok; yanıt üretimi merkezi LLM gateway ile.
        """
        logger.info("RAG Query: %s", query)

        docs = await self.retriever.search(query, limit=20)
        logger.info("Retrieved %s candidates.", len(docs))

        top_docs = await self.reranker.rerank(query, docs, top_k=5)
        logger.info("Reranked top %s docs.", len(top_docs))

        context = ""
        for doc in top_docs:
            context += f"Decision ID: {doc.get('decision_id')}\nText: {doc.get('chunk_text')}\n---\n"

        system_prompt = augment_system_prompt_with_user_document_rule(
            """Sen Türk hukukunda uzman bir yapay zeka asistanısın. Verilen bağlamı kullanarak kullanıcının sorusunu yanıtla.
Yanıtını şu başlıklarla yapılandır:
1. Hukuki Sorun
2. İlgili Mevzuat
3. Emsal/İçtihat
4. Değerlendirme
5. Sonuç

Uygun yerlerde decision_id değerlerini kaynak olarak belirt. Yanıt bağlamda yoksa, mevcut bilgiye göre bilmediğini söyle.
Uydurma yapma."""
        )

        try:
            resp = await chat_completions_create_async(
                self.aclient,
                model=llm_primary_model(),
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Bağlam:\n{context}\n\nSoru: {query}"},
                ],
                temperature=0.0,
            )
            answer = resp.choices[0].message.content

            return {
                "query": query,
                "answer": answer,
                "sources": [d.get("decision_id") for d in top_docs],
                "context_used": context[:500] + "...",
            }
        except Exception as e:
            logger.error("LLM Generation failed: %s", e)
            raise


rag_pipeline = RAGPipeline()
