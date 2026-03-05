import re
import json
import logging
import asyncio
from typing import Dict, Any, List

class LegalStructurer:
    def __init__(self):
        self.logger = logging.getLogger("structuring")
        
        # Regex Patterns
        self.chamber_pattern = re.compile(r'(Genel Kurul|Birinci Bölüm|İkinci Bölüm)', re.IGNORECASE)
        self.result_pattern = re.compile(r'(İhlal Edildiğine|İhlal Edilmediğine|Kabul Edilemezlik|Kabul Edilebilirlik)', re.IGNORECASE)
        self.vote_pattern = re.compile(r'(Oybirliğiyle|Oyçokluğuyla)', re.IGNORECASE)
        
        # Simple Law Extraction (e.g., "5271 sayılı Kanun'un 141. maddesi")
        self.law_article_pattern = re.compile(r'(\d{1,4})\s+sayılı\s+[A-Za-z\s]+\s+(?:Kanun(?:u|nun|un)?)\s+(\d+)\.', re.IGNORECASE)
        self.const_article_pattern = re.compile(r'Anayasa(?:\'nın|nın)?\s+(\d+)\.', re.IGNORECASE)
        
        # Citations (E.2014/123 K.2015/456)
        self.citation_pattern = re.compile(r'E\.\s*(\d{4}/\d+)\s*K\.\s*(\d{4}/\d+)', re.IGNORECASE)

    def extract_metadata(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        text = doc.get("full_text", "")
        raw_json = doc.get("raw_json")
        
        if isinstance(raw_json, str):
            try:
                raw_json = json.loads(raw_json)
            except:
                raw_json = {}
                
        info = raw_json.get("info", "") if raw_json else ""
        
        # 1. Chamber
        chamber = "Unknown"
        m = self.chamber_pattern.search(info)
        if m: chamber = m.group(1)
        
        # 2. Result & Vote (from text usually near end)
        result = "Unknown"
        vote = "Unknown"
        
        # Look in last 2000 chars for result
        end_text = text[-3000:]
        m_res = self.result_pattern.search(end_text)
        if m_res: result = m_res.group(1)
        
        m_vote = self.vote_pattern.search(end_text)
        if m_vote: vote = m_vote.group(1)
        
        # 3. Violation Type (Heuristic)
        violation = self._detect_violation(text)
        
        # 4. Articles
        laws = []
        for m in self.law_article_pattern.findall(text):
            laws.append(f"{m[0]} sayılı Kanun Madde {m[1]}")
            
        const_arts = []
        for m in self.const_article_pattern.findall(text):
            const_arts.append(f"Anayasa Madde {m}")
            
        # 5. Citations
        citations = []
        for m in self.citation_pattern.findall(text):
            citations.append(f"E.{m[0]} K.{m[1]}")
            
        return {
            "decision_id": str(doc.get("id")),
            "decision_number": doc.get("decision_no"),
            "year": doc.get("decision_date").year if doc.get("decision_date") else None,
            "chamber": chamber,
            "violation_type": violation,
            "constitution_articles": list(set(const_arts)),
            "law_articles": list(set(laws)),
            "cited_decisions": list(set(citations)),
            "result": result,
            "vote_type": vote
        }

    def _detect_violation(self, text: str) -> str:
        # Simple keyword matching
        if "ifade özgürlüğü" in text.lower(): return "İfade Özgürlüğü"
        if "adil yargılanma" in text.lower(): return "Adil Yargılanma Hakkı"
        if "mülkiyet hakkı" in text.lower(): return "Mülkiyet Hakkı"
        if "kişi hürriyeti" in text.lower(): return "Kişi Hürriyeti ve Güvenliği"
        if "özel hayat" in text.lower(): return "Özel Hayatın Gizliliği"
        if "yaşam hakkı" in text.lower(): return "Yaşam Hakkı"
        if "kötü muamele" in text.lower(): return "Kötü Muamele Yasağı"
        return "Diğer"

structurer = LegalStructurer()
