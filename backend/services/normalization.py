import re
from typing import List

class NormalizationPipeline:
    def __init__(self):
        pass

    def clean_text(self, text: str) -> str:
        """
        Temel metin temizliği:
        - Fazla boşlukları sil (satır içi)
        - Satırları koru ama fazla satır boşluklarını indir
        """
        if not text:
            return ""
        
        text = re.sub(r'\r\n', '\n', text)
        text = re.sub(r'\r', '\n', text)
        
        text = re.sub(r'[ \t]+', ' ', text)
        
        text = re.sub(r'\n+', '\n', text)
        
        return text.strip()

    def chunk_text(self, text: str, chunk_size: int = 1000, overlap: int = 100) -> List[str]:
        """
        Metni chunk'lara böler (overlap ile).
        """
        if not text:
            return []
        
        chunks = []
        start = 0
        text_len = len(text)

        while start < text_len:
            end = start + chunk_size
            chunk = text[start:end]
            chunks.append(chunk)
            start += chunk_size - overlap
        
        return chunks

normalization_service = NormalizationPipeline()
