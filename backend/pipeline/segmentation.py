import re
import logging
from typing import Dict, Any

class LegalSegmenter:
    def __init__(self):
        self.logger = logging.getLogger("segmentation")
        
        # Regex for Section Headers
        self.sections = {
            "subject": re.compile(r'(BAŞVURUNUN KONUSU|BAŞVURU KONUSU)', re.IGNORECASE),
            "events": re.compile(r'(OLAYLAR|BAŞVURU SÜRECİ)', re.IGNORECASE),
            "reasoning": re.compile(r'(İLGİLİ HUKUK|HUKUKİ DEĞERLENDİRME|ESASIN İNCELENMESİ|DEĞERLENDİRME)', re.IGNORECASE),
            "judgment": re.compile(r'(HÜKÜM|SONUÇ|KARAR)', re.IGNORECASE)
        }

    def segment(self, text: str) -> Dict[str, str]:
        # Find start indices
        starts = {}
        for name, pattern in self.sections.items():
            match = pattern.search(text)
            if match:
                starts[name] = match.start()
        
        # Sort indices
        sorted_starts = sorted(starts.items(), key=lambda x: x[1])
        
        segments = {
            "subject": "",
            "events": "",
            "reasoning": "",
            "judgment": ""
        }
        
        if not sorted_starts:
            # Fallback: Treat as one block or use semantic splitting later
            segments["reasoning"] = text[:5000] # Rough guess
            return segments
            
        for i, (name, start_idx) in enumerate(sorted_starts):
            end_idx = sorted_starts[i+1][1] if i < len(sorted_starts) - 1 else len(text)
            
            # Extract content (excluding the header itself roughly)
            # Header length usually < 50 chars
            content = text[start_idx:end_idx].strip()
            
            # Remove the header line
            first_newline = content.find('\n')
            if first_newline != -1 and first_newline < 100:
                content = content[first_newline:].strip()
                
            segments[name] = content
            
        return segments

segmenter = LegalSegmenter()
