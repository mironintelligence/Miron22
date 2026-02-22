import os
from typing import List, Optional
from openai import OpenAI
from dotenv import load_dotenv
from .search import HybridSearchEngine

load_dotenv()

def _get_client() -> OpenAI:
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        raise RuntimeError("OPENAI_API_KEY missing")
    return OpenAI(api_key=key)

class RAGPipeline:
    def __init__(self, search_engine: HybridSearchEngine):
        self.search_engine = search_engine

    def generate_answer(self, query: str, context_docs: List[str]) -> str:
        """
        Retrieval Augmented Generation using OpenAI.
        """
        context_str = "\n\n".join(context_docs)
        
        prompt = f"""
        Aşağıdaki bağlamı kullanarak soruyu yanıtla.
        Bağlam:
        {context_str}

        Soru: {query}

        Eğer bağlamda yanıt yoksa, genel bilgiye dayanarak cevapla ama bunu belirt.
        """

        client = _get_client()
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Sen kıdemli bir hukuk asistanısın. Yanıtların net, hukuki terminolojiye uygun ve güvenilir olmalı."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3
        )
        
        return response.choices[0].message.content

    def run(self, query: str, top_k: int = 5) -> str:
        """
        Full RAG pipeline: Retrieve -> Generate
        """
        # Retrieve relevant documents
        # Note: HybridSearchEngine requires documents to be indexed first for BM25.
        # Assuming search_engine has indexed data or uses vector search primarily.
        
        # Fallback to vector search if BM25 is empty
        try:
            results = self.search_engine.hybrid_search(query, alpha=0.7) # Give more weight to vector search
            context_docs = [r['content'] for r in results]
        except Exception as e:
            print(f"Hybrid search failed, falling back to simple vector search: {e}")
            results = self.search_engine.search_vector(query, top_k=top_k)
            context_docs = [r['doc']['content'] for r in results]
        
        if not context_docs:
            return "İlgili doküman bulunamadı. Lütfen sorunuzu daha açık belirtin veya veritabanını kontrol edin."

        return self.generate_answer(query, context_docs)

# Example usage
# rag = RAGPipeline(search_engine)
