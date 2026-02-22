import re
from typing import Dict, Any, List

class DeterministicRiskEngine:
    def __init__(self):
        self.risk_factors = [
            (r"\bdelil\b.*(yok|eksik|zayıf)", 18, "evidence", "Delil seti zayıf veya eksik."),
            (r"tan(ı|i)k\s*(bulunmuyor|yok|belirsiz)", 10, "evidence", "Tanık bilgileri belirsiz."),
            (r"yetki itiraz(ı|i)|yetkisizlik", 12, "jurisdiction", "Yetki itirazı riski."),
            (r"g(ö|o)revsizlik", 12, "jurisdiction", "Görev yönünden risk."),
            (r"zamana(ş|s)ımı", 16, "limitation", "Zamanaşımı riski."),
            (r"hak d(ü|u)ş(ü|u)r(ü|u)cü", 14, "limitation", "Hak düşürücü süre riski."),
            (r"tebligat|usuls(ü|u)z tebligat|ilanen tebligat", 12, "service", "Tebligat/tebliğ usulsüzlüğü riski."),
            (r"delil(ler)? (geç|s(ü|u)resinde sunulmad(ı|i))", 12, "procedural", "Delillerin süresinde sunulmaması riski."),
            (r"usul(.*?)eksik|eksik (usul|şart)", 12, "procedural", "Usuli eksiklik riski."),
            (r"bilirki(ş|s)i raporu (aleyhe|aleyhte|olumsuz)", 10, "evidence", "Bilirkişi raporu aleyhe."),
            (r"maddi zarar(ın|in) kan(ı|i)t(ı|i) (yok|zay(ı|i)f)", 14, "evidence", "Zararın ispatı zayıf."),
            (r"narratif|çelişki|tutars(ı|i)z", 8, "narrative", "Olay anlatımında tutarsızlık."),
            (r"haciz|tahsilat|infaz|icra", 8, "enforcement", "Tahsilat/infaz zafiyeti riski."),
        ]

        self.positive_factors = [
            (r"fatura|dekont|s(ö|o)zle(s|ş)me|ek protokol", 6, "evidence", "Yazılı delil seti güçlü."),
            (r"tan(ı|i)k (ad|soyad|ifade)", 5, "evidence", "Tanık bilgileri net."),
            (r"yarg(ı|i)tay|emsal karar|i(ç|c)tihat", 7, "precedent", "Emsal karar desteği var."),
            (r"bilirki(ş|s)i raporu leh(ine|inde)|olumlu", 8, "evidence", "Bilirkişi raporu lehine."),
            (r"ihtar|arabuluculuk|uzlaşma", 4, "procedural", "Usuli hazırlık adımları mevcut."),
        ]

    def analyze_risk(self, text: str) -> Dict[str, Any]:
        if not text or not text.strip():
            return {
                "risk_score": 50,
                "winning_probability": 50.0,
                "key_issues": ["Metin boş veya yetersiz."],
                "positive_signals": [],
                "recommended_actions": ["Somut olay ve delil setini ekleyin."],
                "tactical_strategy": [],
                "defensive_strategy": [],
                "counter_strategy": [],
                "settlement_analysis": [],
                "probability_logic": "Veri yok",
            }

        t = text.lower()
        risk_score = 20
        key_issues: List[str] = []
        positive_signals: List[str] = []
        categories: Dict[str, List[str]] = {
            "procedural": [],
            "jurisdiction": [],
            "limitation": [],
            "evidence": [],
            "service": [],
            "narrative": [],
            "enforcement": [],
        }

        for pattern, weight, category, msg in self.risk_factors:
            if re.search(pattern, t):
                risk_score += weight
                key_issues.append(msg)
                if category in categories:
                    categories[category].append(msg)

        for pattern, bonus, category, note in self.positive_factors:
            if re.search(pattern, t):
                risk_score -= bonus
                positive_signals.append(note)

        risk_score = max(0, min(95, risk_score))
        bonus_points = 3 if len(positive_signals) >= 2 else 0
        winning_probability = round(max(5.0, min(97.0, 100.0 - risk_score + bonus_points)), 2)

        tactical = []
        defensive = []
        counter = []
        settlement = []

        if categories["evidence"]:
            tactical.append("Delil zincirini güçlendirin, yazılı delilleri kronolojik ekleyin.")
        if categories["procedural"]:
            defensive.append("Süre ve usul şartlarını netleştirin, eksik giderimini belgeleyin.")
        if categories["jurisdiction"]:
            defensive.append("Görev ve yetki dayanaklarını HMK üzerinden somutlaştırın.")
        if categories["limitation"]:
            counter.append("Zamanaşımı kesen veya durduran işlemleri açıkça gösterin.")
        if categories["service"]:
            counter.append("Tebligatın usulüne uygun yapıldığını kanıtlayın.")
        if categories["narrative"]:
            tactical.append("Olay örgüsünü tarih sırasıyla yeniden kurun ve çelişkiyi giderin.")
        if categories["enforcement"]:
            settlement.append("Tahsilat riskine karşı teminat ve alternatif ödeme planları planlayın.")

        if not tactical:
            tactical.append("İddia ve delil zincirini maddelendirerek güçlendirin.")
        if not defensive:
            defensive.append("Zayıf noktaları önden kabul edip hukuki gerekçeyi güçlendirin.")
        if not counter:
            counter.append("Muhtemel karşı savunmaları somut delillerle çürütün.")
        if not settlement:
            settlement.append("Uzlaşma penceresini maliyet-fayda ile değerlendirin.")

        probability_logic = f"Risk skoru {risk_score} üzerinden ters ölçekleme ve pozitif sinyaller dikkate alındı."

        return {
            "risk_score": int(risk_score),
            "winning_probability": float(winning_probability),
            "key_issues": key_issues or ["Belirgin risk tespit edilmedi."],
            "positive_signals": positive_signals,
            "recommended_actions": self._generate_recommendations(categories, positive_signals),
            "tactical_strategy": tactical,
            "defensive_strategy": defensive,
            "counter_strategy": counter,
            "settlement_analysis": settlement,
            "probability_logic": probability_logic,
        }

    def _generate_recommendations(self, categories: Dict[str, List[str]], positives: List[str]) -> List[str]:
        recs: List[str] = []
        if categories["evidence"]:
            recs.append("Eksik delilleri tamamlamak için ilgili kurumlardan kayıt ve belge alın.")
        if categories["procedural"]:
            recs.append("Usuli eksiklikleri gideren ek dilekçe ve süre planı oluşturun.")
        if categories["jurisdiction"]:
            recs.append("Görev ve yetki tartışmasını içtihatla destekleyin.")
        if categories["limitation"]:
            recs.append("Zamanaşımı süresini kesen işlemleri kronolojik olarak belgeleyin.")
        if categories["service"]:
            recs.append("Tebligat usulüne uygunluk delillerini dosyaya ekleyin.")
        if categories["narrative"]:
            recs.append("Olay anlatımını çelişkisiz ve tarihli şekilde yeniden yapılandırın.")
        if categories["enforcement"]:
            recs.append("Tahsilat riskine karşı icra stratejisini alternatifli planlayın.")
        if positives:
            recs.append("Lehe unsurları tek tek delil bağlantısıyla öne çıkarın.")
        if not recs:
            recs.append("Dosya kapsamını güçlendirmek için delil ve mevzuat bağını artırın.")
        return list(dict.fromkeys(recs))

risk_engine = DeterministicRiskEngine()
