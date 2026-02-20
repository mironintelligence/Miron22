import asyncio
from typing import Dict, Any, List
from .normalization import normalization_service
from .risk_engine import risk_engine
from .rag import RAGPipeline
from .search import HybridSearchEngine
import os

class CaseOrchestrator:
    def __init__(self):
        # Initialize dependencies
        # Assuming DB_URL is set
        db_url = os.getenv("DATABASE_URL")
        self.search_engine = HybridSearchEngine(db_url)
        self.rag_pipeline = RAGPipeline(self.search_engine)

    async def analyze_case(self, case_text: str, user_role: str) -> Dict[str, Any]:
        """
        Orchestrates the full analysis flow:
        1. Normalize input
        2. Calculate risk (deterministic)
        3. Retrieve relevant precedents/laws (RAG)
        4. Generate strategic advice (LLM via RAG)
        """
        # 1. Normalize
        clean_text = normalization_service.clean_text(case_text)
        
        # 2. Risk Analysis (Fast, deterministic)
        risk_result = risk_engine.analyze_risk(clean_text)
        
        # 3. RAG / Strategy Generation (Slow, AI)
        # We query for specific strategic points based on risk findings
        query = f"""
        Bu dava için {user_role} tarafı adına strateji geliştir.
        Risk faktörleri: {', '.join(risk_result['key_issues'])}
        Olay Özeti: {clean_text[:500]}...
        
        Aşağıdakileri yanıtla:
        - En güçlü hukuki argümanımız ne olmalı?
        - Karşı tarafın en muhtemel hamlesi nedir?
        - Emsal kararlara göre kazanma şansımızı artıracak kritik hamle nedir?
        """
        
        strategy_advice = self.rag_pipeline.run(query)
        
        return {
            "risk_analysis": risk_result,
            "strategy_advice": strategy_advice,
            "normalized_text_preview": clean_text[:200]
        }

orchestrator = CaseOrchestrator()
