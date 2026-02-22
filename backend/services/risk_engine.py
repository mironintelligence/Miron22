from __future__ import annotations

import json
import logging
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field, ValidationError

try:
    from backend.openai_client import get_openai_client
except ImportError:
    from openai_client import get_openai_client

logger = logging.getLogger("miron.risk_engine")

# -------------------------------------------------------------------
# Pydantic Models for Strict Validation
# -------------------------------------------------------------------

class RiskAnalysisResult(BaseModel):
    risk_score: int = Field(..., ge=0, le=100, description="0-100 risk score where 100 is highest risk")
    risk_category: str = Field(..., description="Risk level: Low, Medium, High, Critical")
    winning_probability: float = Field(..., ge=0.0, le=100.0, description="Estimated winning probability percentage")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Model confidence in the analysis (0.0 to 1.0)")

    key_issues: List[str] = Field(default_factory=list, description="Critical legal weaknesses found")
    positive_signals: List[str] = Field(default_factory=list, description="Strengths or advantages found")
    missing_elements: List[str] = Field(default_factory=list, description="Crucial missing evidence or documents")

    tactical_strategy: List[str] = Field(default_factory=list, description="Proactive moves to gain advantage")
    defensive_strategy: List[str] = Field(default_factory=list, description="Moves to protect against risks")
    counter_strategy: List[str] = Field(default_factory=list, description="Responses to opponent's likely moves")
    settlement_analysis: List[str] = Field(default_factory=list, description="Settlement feasibility and timing")
    recommended_actions: List[str] = Field(default_factory=list, description="Immediate next steps")

    probability_logic: str = Field(..., description="Explanation of the scoring logic")


class RiskEngine:
    """
    AI-powered Risk & Strategy Engine.
    Uses LLM to perform deep legal analysis with strict output structure.
    """

    def analyze_risk(self, text: str) -> Dict[str, Any]:
        if not text or not text.strip():
            return self._empty_result("Metin boş veya yetersiz.")

        client = get_openai_client()
        if not client:
            logger.error("OpenAI client not configured.")
            return self._empty_result("AI servisi yapılandırılmamış.")

        prompt = self._build_prompt(text)

        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",  # Using 4o-mini for speed/cost balance, upgrade to 4o if needed
                messages=[
                    {"role": "system", "content": "Sen kıdemli bir Türk Hukuku stratejistisin. Görevin davayı analiz edip riskleri, stratejileri ve kazanma ihtimalini belirlemektir. Asla halüsinasyon görme. Sadece metindeki verilere dayan."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                response_format={"type": "json_object"}
            )

            content = response.choices[0].message.content
            if not content:
                raise ValueError("Boş yanıt döndü.")

            data = json.loads(content)
            
            # Validate with Pydantic
            validated = RiskAnalysisResult(**data)
            return validated.model_dump()

        except ValidationError as ve:
            logger.error(f"Risk analizi şema hatası: {ve}")
            return self._fallback_result(text, f"Şema doğrulama hatası: {str(ve)}")
        except json.JSONDecodeError:
            logger.error("Risk analizi JSON ayrıştırma hatası.")
            return self._fallback_result(text, "JSON format hatası.")
        except Exception as e:
            logger.error(f"Risk analizi beklenmeyen hata: {e}")
            return self._fallback_result(text, f"Analiz hatası: {str(e)}")

    def _build_prompt(self, text: str) -> str:
        return f"""
        Aşağıdaki dava/olay metnini Türk Hukuku ve Yargıtay içtihatları çerçevesinde analiz et.
        
        METİN:
        {text[:8000]}

        ANALİZ KURALLARI:
        1. Zamanaşımı, Hak Düşürücü Süre, Görev/Yetki, Tebligat Usulsüzlüğü gibi usuli tuzakları mutlaka kontrol et.
        2. İspat yükü kimde ve delil durumu (tanık, belge, bilirkişi) ne durumda?
        3. Risk Puanı (0-100): 0=Risk Yok, 100=Kesin Kayıp.
        4. Kazanma İhtimali (%): 100 - Risk Puanı (yaklaşık).
        5. Güven Skoru (0.0-1.0): Analizin ne kadar kesin veriye dayandığı.
        6. Stratejiler somut ve uygulanabilir olmalı.

        Lütfen yanıtı aşağıdaki JSON formatında ver:
        {{
            "risk_score": int,
            "risk_category": "Low" | "Medium" | "High" | "Critical",
            "winning_probability": float,
            "confidence_score": float,
            "key_issues": [str],
            "positive_signals": [str],
            "missing_elements": [str],
            "tactical_strategy": [str],
            "defensive_strategy": [str],
            "counter_strategy": [str],
            "settlement_analysis": [str],
            "recommended_actions": [str],
            "probability_logic": str
        }}
        """

    def _empty_result(self, msg: str) -> Dict[str, Any]:
        return {
            "risk_score": 0,
            "risk_category": "Unknown",
            "winning_probability": 0.0,
            "confidence_score": 0.0,
            "key_issues": [msg],
            "positive_signals": [],
            "missing_elements": [],
            "tactical_strategy": [],
            "defensive_strategy": [],
            "counter_strategy": [],
            "settlement_analysis": [],
            "recommended_actions": [],
            "probability_logic": "Veri yok."
        }

    def _fallback_result(self, text: str, error_msg: str) -> Dict[str, Any]:
        # Fallback to a simpler heuristic or just return error state
        # For now, return safe default with error message
        return {
            "risk_score": 50,
            "risk_category": "Medium",
            "winning_probability": 50.0,
            "confidence_score": 0.0,
            "key_issues": [f"AI Analizi Başarısız: {error_msg}"],
            "positive_signals": [],
            "missing_elements": [],
            "tactical_strategy": ["Manuel inceleme önerilir."],
            "defensive_strategy": [],
            "counter_strategy": [],
            "settlement_analysis": [],
            "recommended_actions": ["Sistemsel hata oluştu, lütfen tekrar deneyin."],
            "probability_logic": "Hata nedeniyle varsayılan değerler."
        }

risk_engine = RiskEngine()
