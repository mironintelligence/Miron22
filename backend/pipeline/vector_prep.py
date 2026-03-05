import json
import logging
from typing import List, Dict, Any

class VectorPreparer:
    def __init__(self):
        self.logger = logging.getLogger("vector_prep")
        self.chunk_size = 1000 # words ~ 1200 tokens
        self.overlap = 150

    def prepare_chunks(self, doc: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Chunks the document text and attaches metadata.
        """
        full_text = doc.get("full_text", "")
        if not full_text: return []
        
        words = full_text.split()
        chunks = []
        
        for i in range(0, len(words), self.chunk_size - self.overlap):
            chunk_words = words[i:i + self.chunk_size]
            chunk_text = " ".join(chunk_words)
            
            chunk = {
                "decision_id": doc.get("decision_id"),
                "chunk_id": f"{doc.get('decision_id')}_{i}",
                "text": chunk_text,
                "metadata": {
                    "year": doc.get("year"),
                    "violation_type": doc.get("violation_type"),
                    "authority_score": doc.get("authority_score"),
                    "constitution_articles": doc.get("constitution_articles")
                }
            }
            chunks.append(chunk)
            
        return chunks

vector_prep = VectorPreparer()
