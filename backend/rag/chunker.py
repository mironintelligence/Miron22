import logging
from typing import List, Dict, Any

# Assuming chunk size 800-1200 tokens.
# Using simple char splitting for now if no specialized library.
# Or semantic splitting if feasible.
# "Chunk: 800–1200 token segments" from prompt implies token awareness.
# We will use TikToken or rough char count. 1000 tokens ~ 4000 chars.

try:
    import tiktoken
    tokenizer = tiktoken.get_encoding("cl100k_base")
except ImportError:
    tokenizer = None
    logging.warning("TikToken not found. Using char splitting.")

class LegalChunker:
    def __init__(self, chunk_size=1000, overlap=100):
        self.chunk_size = chunk_size
        self.overlap = overlap

    def chunk_text(self, text: str) -> List[str]:
        if tokenizer:
            tokens = tokenizer.encode(text)
            chunks = []
            start = 0
            while start < len(tokens):
                end = min(start + self.chunk_size, len(tokens))
                chunk_tokens = tokens[start:end]
                chunks.append(tokenizer.decode(chunk_tokens))
                start += (self.chunk_size - self.overlap)
            return chunks
        else:
            # Simple char splitting fallback
            # Assuming ~4 chars per token
            chunk_chars = self.chunk_size * 4
            overlap_chars = self.overlap * 4
            chunks = []
            start = 0
            while start < len(text):
                end = min(start + chunk_chars, len(text))
                chunks.append(text[start:end])
                start += (chunk_chars - overlap_chars)
            return chunks

chunker = LegalChunker()
