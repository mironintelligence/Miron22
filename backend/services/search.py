import os
import math
from typing import List, Dict, Any, Tuple
from rank_bm25 import BM25Okapi
import psycopg2
from psycopg2.extras import RealDictCursor
import numpy as np
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# Initialize OpenAI for embeddings
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def get_embedding(text: str, model="text-embedding-3-small") -> List[float]:
    text = text.replace("\n", " ")
    return client.embeddings.create(input=[text], model=model).data[0].embedding

class HybridSearchEngine:
    def __init__(self, db_url: str):
        self.db_url = db_url
        self.bm25 = None
        self.documents = [] # Cache for BM25 (in production, use Elasticsearch/OpenSearch for BM25)

    def index_documents(self, docs: List[Dict[str, str]]):
        """
        BM25 için belgeleri belleğe yükler (Basit implementasyon).
        Production'da bu işlem Elasticsearch/Solr/Meilisearch üzerinde yapılmalı.
        """
        self.documents = docs
        tokenized_corpus = [doc['content'].split(" ") for doc in docs]
        self.bm25 = BM25Okapi(tokenized_corpus)

    def search_bm25(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        if not self.bm25 or not self.documents:
            return []
        
        tokenized_query = query.split(" ")
        scores = self.bm25.get_scores(tokenized_query)
        
        # Get top k indices
        top_indices = np.argsort(scores)[::-1][:top_k]
        
        results = []
        for idx in top_indices:
            if scores[idx] > 0:
                results.append({
                    "doc": self.documents[idx],
                    "score": float(scores[idx]),
                    "type": "bm25"
                })
        return results

    def search_vector(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        PostgreSQL pgvector kullanarak semantik arama yapar.
        """
        try:
            embedding = get_embedding(query)
            embedding_vector = str(embedding)
            
            conn = psycopg2.connect(self.db_url)
            cur = conn.cursor(cursor_factory=RealDictCursor)
            
            # Assuming table 'legal_docs' with 'embedding' vector column
            # Using cosine distance (<=>) or L2 (<->)
            sql = """
                SELECT id, content, metadata, 1 - (embedding <=> %s::vector) as similarity
                FROM legal_docs
                ORDER BY similarity DESC
                LIMIT %s;
            """
            cur.execute(sql, (embedding_vector, top_k))
            rows = cur.fetchall()
            cur.close()
            conn.close()
            
            results = []
            for row in rows:
                results.append({
                    "doc": {"content": row['content'], "metadata": row['metadata']},
                    "score": float(row['similarity']),
                    "type": "vector"
                })
            return results
        except Exception as e:
            print(f"Vector search failed: {e}")
            return []

    def hybrid_search(self, query: str, alpha: float = 0.5) -> List[Dict[str, Any]]:
        """
        BM25 ve Vektör sonuçlarını birleştirir (Reciprocal Rank Fusion veya Weighted Sum).
        Burada basit Weighted Sum kullanıyoruz.
        """
        bm25_res = self.search_bm25(query, top_k=10)
        vector_res = self.search_vector(query, top_k=10)
        
        # Normalize scores (min-max normalization simplified)
        # Combine
        combined = {}
        
        # Add BM25 scores
        if bm25_res:
            max_bm25 = max(r['score'] for r in bm25_res)
            for r in bm25_res:
                content = r['doc']['content']
                norm_score = r['score'] / max_bm25 if max_bm25 > 0 else 0
                combined[content] = combined.get(content, 0) + (1 - alpha) * norm_score

        # Add Vector scores
        if vector_res:
            max_vec = max(r['score'] for r in vector_res)
            for r in vector_res:
                content = r['doc']['content']
                norm_score = r['score'] / max_vec if max_vec > 0 else 0
                combined[content] = combined.get(content, 0) + alpha * norm_score
        
        # Sort by final score
        sorted_results = sorted(combined.items(), key=lambda x: x[1], reverse=True)
        
        return [{"content": k, "score": v} for k, v in sorted_results[:10]]

# Example usage
# search_engine = HybridSearchEngine(os.getenv("DATABASE_URL"))
