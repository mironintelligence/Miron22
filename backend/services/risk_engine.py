import re
from typing import Dict, Any, List

class DeterministicRiskEngine:
    def __init__(self):
        # Weighted factors for risk calculation
        self.risk_factors = [
            (r"\bdelil\b.*(yok|eksik)", 18, "Deliller yetersiz/eksik belirtilmiş."),
            (r"tan(ı|i)k\s*(bulunmuyor|yok)", 12, "Tanık bilgisi eksik."),
            (r"yetki itiraz(ı|i)", 10, "Yetki itirazı/tereddütü var."),
            (r"g(ö|o)revsizlik", 10, "Görev yönünden risk var."),
            (r"zamana(ş|s)ımı", 14, "Zamanaşımı riski."),
            (r"hak d(ü|u)ş(ü|u)r(ü|u)cü", 12, "Hak düşürücü süre riski."),
            (r"bilirki(ş|s)i raporu (aleyhe|aleyhte|olumsuz)", 10, "Bilirkişi raporu aleyhe."),
            (r"maddi zarar(ın|in) kan(ı|i)t(ı|i) (yok|zay(ı|i)f)", 14, "Maddi zarar kanıtı zayıf/eksik."),
            (r"yetkisizlik", 10, "Yetkisizlik ihtimali."),
            (r"usul(.*?)eksik|eksik (usul|şart)", 12, "Usuli eksiklik belirtilmiş."),
        ]
        
        self.positive_factors = [
            (r"fatura|dekont|s(ö|o)zle(s|ş)me", 6, "Maddi deliller mevcut (fatura/dekont/sözleşme)."),
            (r"tan(ı|i)k (ad|soyad|ifade)", 5, "Tanık ayrıntıları mevcut."),
            (r"yarg(ı|i)tay|emsal karar|i(ç|c)tihat", 7, "Emsal/yargıtay atıfları mevcut."),
            (r"bilirki(ş|s)i raporu leh(ine|inde)|olumlu", 8, "Bilirkişi raporu lehimize."),
        ]

    def analyze_risk(self, text: str) -> Dict[str, Any]:
        """
        Calculates risk score and winning probability based on deterministic rules.
        """
        if not text or not text.strip():
            return {
                "risk_score": 50,
                "winning_probability": 50.0,
                "key_issues": ["Metin boş"],
                "positive_signals": [],
                "recommended_actions": ["Dosya içeriği ekleyin."]
            }
        
        t = text.lower()
        risk_score = 20  # Base risk
        key_issues = []
        positive_signals = []

        # Check negative factors
        for pattern, weight, msg in self.risk_factors:
            if re.search(pattern, t):
                risk_score += weight
                key_issues.append(msg)

        # Check positive factors
        for pattern, bonus, note in self.positive_factors:
            if re.search(pattern, t):
                risk_score -= bonus
                positive_signals.append(note)

        # Clamp risk score
        risk_score = max(0, min(95, risk_score))
        
        # Calculate winning probability
        # winning_prob = 100 - risk_score + bonuses
        bonus_points = 3 if len(positive_signals) >= 2 else 0
        winning_probability = round(max(5.0, min(97.0, 100.0 - risk_score + bonus_points)), 2)

        return {
            "risk_score": risk_score,
            "winning_probability": winning_probability,
            "key_issues": key_issues,
            "positive_signals": positive_signals,
            "recommended_actions": self._generate_recommendations(key_issues)
        }

    def _generate_recommendations(self, issues: List[str]) -> List[str]:
        recommendations = []
        for issue in issues:
            if "Delil" in issue:
                recommendations.append("Eksik delilleri tamamlamak için ilgili kurumlara müzekkere yazılmalı.")
            elif "Tanık" in issue:
                recommendations.append("Tanık listesi hazırlanmalı ve mahkemeye sunulmalı.")
            elif "Zamanaşımı" in issue:
                recommendations.append("Zamanaşımı def'i ileri sürülmeli veya zamanaşımını kesen sebepler araştırılmalı.")
            elif "Görev" in issue:
                recommendations.append("Görev itirazı yapılmalı, dosyanın görevli mahkemeye gönderilmesi talep edilmeli.")
        
        if not recommendations:
            recommendations.append("Dosya kapsamlı incelenmeli ve strateji belirlenmeli.")
            
        return list(set(recommendations))

risk_engine = DeterministicRiskEngine()
