import os
import math
from typing import List, Dict, Any, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
import numpy as np
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# Initialize OpenAI
client = None
try:
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
except:
    pass

def get_embedding(text: str, model="text-embedding-3-large") -> List[float]:
    if not client:
        return [0.0] * 3072
    text = text.replace("\n", " ")
    return client.embeddings.create(input=[text], model=model).data[0].embedding

class YargitaySearchEngine:
    def __init__(self, db_url: str = None):
        self.db_url = db_url or os.getenv("DATABASE_URL")

    def _get_connection(self):
        if not self.db_url:
            return None
        return psycopg2.connect(self.db_url)

    def search(self, query: str, year: Optional[int] = None, court: Optional[str] = None, chamber: Optional[str] = None, limit: int = 50) -> Dict[str, Any]:
        """
        Performs hybrid search (Semantic + Keyword) on decisions table.
        """
        embedding = get_embedding(query)
        embedding_vector = str(embedding)
        
        conn = None
        try:
            conn = self._get_connection()
            if not conn:
                # Fallback for dev/sandbox without DB
                return self._mock_search(query)

            cur = conn.cursor(cursor_factory=RealDictCursor)

            # Base filters
            filters = []
            params = []
            
            if year:
                filters.append("EXTRACT(YEAR FROM decision_date) = %s")
                params.append(year)
            if court:
                filters.append("court = %s")
                params.append(court)
            if chamber:
                filters.append("chamber = %s")
                params.append(chamber)
            
            filter_sql = " AND ".join(filters)
            if filter_sql:
                filter_sql = " AND " + filter_sql

            # 1. Semantic Search
            # 1 - (embedding <=> query) gives similarity (1 is identical, 0 is opposite)
            # vector_cosine_ops distance is 1 - cosine_similarity. So we want to minimize distance.
            # But here we want score. 1 - distance is good.
            semantic_sql = f"""
                SELECT id, clean_text, summary, outcome, decision_number, case_number, court, chamber, decision_date,
                    1 - (embedding <=> %s::vector) AS semantic_score
                FROM decisions
                WHERE 1=1 {filter_sql}
                ORDER BY embedding <=> %s::vector
                LIMIT %s;
            """
            # Params: vector, filter_params, vector, limit
            sem_params = [embedding_vector] + params + [embedding_vector, limit]
            cur.execute(semantic_sql, sem_params)
            semantic_results = {row['id']: dict(row) for row in cur.fetchall()}

            # 2. Keyword Search
            # plainto_tsquery for simple query parsing
            keyword_sql = f"""
                SELECT id, clean_text, summary, outcome, decision_number, case_number, court, chamber, decision_date,
                    ts_rank_cd(to_tsvector('turkish', clean_text), plainto_tsquery('turkish', %s)) AS keyword_rank
                FROM decisions
                WHERE to_tsvector('turkish', clean_text) @@ plainto_tsquery('turkish', %s)
                {filter_sql}
                ORDER BY keyword_rank DESC
                LIMIT %s;
            """
            # Params: query, query, filter_params, limit
            kw_params = [query, query] + params + [limit]
            cur.execute(keyword_sql, kw_params)
            keyword_results = {row['id']: dict(row) for row in cur.fetchall()}

            cur.close()
            conn.close()

            # 3. Merge Results (RRF or Weighted Sum)
            # Using Weighted Sum as requested: 0.65 Semantic, 0.35 Keyword
            # We need to normalize scores first if they are on different scales.
            # Semantic is 0-1 (mostly). Keyword rank is unbounded (usually 0-1 or 0-something).
            # For simplicity and robustness, we just sum them with weights.
            
            merged = {}
            all_ids = set(semantic_results.keys()) | set(keyword_results.keys())
            
            for id in all_ids:
                sem_score = 0.0
                if id in semantic_results:
                    item = semantic_results[id]
                    sem_score = float(item['semantic_score'])
                    merged[id] = item
                
                kw_score = 0.0
                if id in keyword_results:
                    if id not in merged:
                        merged[id] = keyword_results[id]
                    kw_score = float(keyword_results[id]['keyword_rank'])
                
                # Normalize keyword score roughly (e.g. max 1.0)
                # This is heuristic.
                kw_score = min(kw_score, 1.0)
                
                final_score = (sem_score * 0.65) + (kw_score * 0.35)
                merged[id]['final_score'] = final_score
                merged[id]['semantic_score'] = sem_score
                merged[id]['keyword_rank'] = kw_score

            # Sort by final score
            sorted_results = sorted(merged.values(), key=lambda x: x['final_score'], reverse=True)
            
            return {
                "query": query,
                "results": sorted_results[:10]
            }

        except Exception as e:
            print(f"Search error: {e}")
            if conn:
                conn.close()
            # Fallback to mock if DB fails (e.g. table not found)
            return self._mock_search(query)

    def _mock_search(self, query: str) -> Dict[str, Any]:
        """
        Mock results for dev/sandbox environment
        """
        return {
            "query": query,
            "results": [
                {
                    "id": "mock-1",
                    "decision_number": "2023/1452 K.",
                    "case_number": "2023/1023 E.",
                    "court": "Yargıtay",
                    "chamber": "3. Hukuk Dairesi",
                    "date": "2023-11-15",
                    "summary": f"MOCK RESULT for '{query}': Kira alacağı nedeniyle tahliye talebi reddedilmiştir.",
                    "outcome": "ONAMA",
                    "clean_text": "Taraflar arasındaki kira sözleşmesinden kaynaklanan tahliye davasında...",
                    "semantic_score": 0.95,
                    "keyword_rank": 0.4,
                    "final_score": 0.88
                },
                {
                    "id": "mock-2",
                    "decision_number": "2022/8891 K.",
                    "case_number": "2022/5678 E.",
                    "court": "Yargıtay",
                    "chamber": "12. Hukuk Dairesi",
                    "date": "2022-05-20",
                    "summary": f"MOCK RESULT for '{query}': İtirazın iptali ve icra inkar tazminatı...",
                    "outcome": "BOZMA",
                    "clean_text": "İtirazın iptali davasında, davalının imza inkarı üzerine...",
                    "semantic_score": 0.82,
                    "keyword_rank": 0.3,
                    "final_score": 0.75
                }
            ]
        }

search_engine = YargitaySearchEngine()
