from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query, Depends
from typing import Optional, List, Dict, Any
from datetime import datetime
import os, io, json, re

try:
    from backend.openai_client import get_openai_client
except ImportError:
    from openai_client import get_openai_client

import pdfplumber
from docx import Document

router = APIRouter(prefix="/api/risk", tags=["Risk & Strateji Analizi"])

# Use advanced model for simulation
SIMULATION_MODEL = "gpt-4o"  # High reasoning

class SimulationResponse(Dict[str, Any]):
    pass

@router.post("/simulate", response_model=SimulationResponse)
def simulate_case(
    case_description: str = Form(...),
    jurisdiction: str = Form("Türkiye"),
    user_role: str = Form("Davacı")
):
    """
    Advanced Case Simulation with Deep Reasoning.
    Uses a stronger model to predict outcomes, risks, and strategic moves.
    """
    client = get_openai_client()
    if not client:
        raise HTTPException(status_code=500, detail="AI Client init failed.")

    prompt = f"""
    Sen kıdemli bir stratejik dava danışmanısın.
    Aşağıdaki dava senaryosunu derinlemesine simüle et.
    
    SENARYO:
    {case_description}
    
    Taraf: {user_role}
    Yargı Yeri: {jurisdiction}
    
    GÖREVLERİN:
    1. Yargı Yeri ve Usul Analizi: Hangi mahkeme görevli? İspat yükü kimde?
    2. Risk Analizi: Zayıf noktalarımız neler? Karşı taraf ne diyebilir?
    3. Simülasyon:
       - En İyi Senaryo: (Kazanma ihtimali, süre, maliyet)
       - En Kötü Senaryo: (Kaybetme riski, masraflar)
       - En Olası Sonuç: (Gerekçeli tahmin)
    4. Stratejik Tavsiye: Şimdi ne yapmalıyız? (Delil, ihtar, sulh vb.)
    
    ÇIKTI FORMATI (JSON):
    {{
        "jurisdiction_analysis": "...",
        "burden_of_proof": "...",
        "risk_factors": ["risk1", "risk2"],
        "counter_arguments": ["arg1", "arg2"],
        "scenarios": {{
            "best_case": "...",
            "worst_case": "...",
            "most_probable": "..."
        }},
        "win_probability_percent": 60,
        "estimated_duration_months": 12,
        "strategic_recommendation": "..."
    }}
    Sadece JSON döndür.
    """
    
    try:
        completion = client.chat.completions.create(
            model=SIMULATION_MODEL,
            messages=[{"role": "system", "content": "You are a senior legal strategist. Output valid JSON only."}],
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            response_format={"type": "json_object"}
        )
        result = json.loads(completion.choices[0].message.content)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")

# ------- Helpers -------

def _safe_basename(name: str) -> str:
    return os.path.basename(name or "").strip()

def extract_text_from_bytes(filename: str, b: bytes) -> str:
    name = (filename or "").lower()
    if name.endswith(".pdf"):
        try:
            with pdfplumber.open(io.BytesIO(b)) as pdf:
                return "\n".join([p.extract_text() or "" for p in pdf.pages])
        except Exception:
            return b.decode("utf-8", errors="ignore")
    elif name.endswith(".docx"):
        try:
            doc = Document(io.BytesIO(b))
            return "\n".join([p.text for p in doc.paragraphs])
        except Exception:
            return b.decode("utf-8", errors="ignore")
    return b.decode("utf-8", errors="ignore")

def guess_case_type(text: str) -> str:
    t = (text or "").lower()
    if any(k in t for k in ["boşan", "nafaka", "velayet"]):
        return "Aile (Boşanma)"
    if any(k in t for k in ["tazminat", "alacak", "haksız fiil"]):
        return "Tazminat"
    if any(k in t for k in ["iş mahkemesi", "işe iade", "kıdem", "ihbar"]):
        return "İş Hukuku"
    if any(k in t for k in ["icra", "ödeme emri", "takip dosya"]):
        return "İcra-İflas"
    if any(k in t for k in ["şikayet", "cumhuriyet başsavcılığı", "tck"]):
        return "Ceza"
    return "Genel"

def analyze_risk(text: str) -> Dict[str, Any]:
    """
    Basit ama işe yarar bir risk puanı; anahtar kelimelere göre ağırlıklandırma.
    Harvey AI’nin 'risk bulguları + öneriler + kazanma olasılığı' yaklaşımını taklit eder.
    """
    if not text or not text.strip():
        return {"risk_score": 50, "winning_probability": 50.0, "key_issues": ["Metin boş"], "recommended_actions": ["Dosya içeriği ekleyin."]}

    t = text.lower()

    # risk faktörleri (ağırlık: 0-20)
    factors = [
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

    risk_score = 20  # başlangıç baz riski
    key_issues: List[str] = []

    for pattern, weight, msg in factors:
        if re.search(pattern, t):
            risk_score += weight
            key_issues.append(msg)

    # metin uzunluğu ve yapı
    length = len(t)
    if length < 800:
        risk_score += 8
        key_issues.append("Metin kısa/özet; detay eksikleri olabilir.")
    elif length > 8000:
        risk_score += 6
        key_issues.append("Metin çok uzun; dağınıklık ve tutarsızlık riski.")

    # olumlu sinyaller (risk azaltır)
    positives = [
        (r"fatura|dekont|s(ö|o)zle(s|ş)me", 6, "Maddi deliller mevcut (fatura/dekont/sözleşme)."),
        (r"tan(ı|i)k (ad|soyad|ifade)", 5, "Tanık ayrıntıları mevcut."),
        (r"yarg(ı|i)tay|emsal karar|i(ç|c)tihat", 7, "Emsal/yargıtay atıfları mevcut."),
        (r"bilirki(ş|s)i raporu leh(ine|inde)|olumlu", 8, "Bilirkişi raporu lehimize."),
    ]
    positives_found = []
    for pattern, bonus, note in positives:
        if re.search(pattern, t):
            risk_score -= bonus
            positives_found.append(note)

    # sınırlar
    risk_score = max(0, min(95, risk_score))

    # kazanma olasılığı (ters ölçek + ufak normalize)
    winning_probability = round(max(5.0, min(97.0, 100.0 - risk_score + (3 if len(positives_found) >= 2 else 0))), 2)

    # öneriler
    recommended = []
    if any("Deliller yetersiz" in k for k in key_issues):
        recommended.append("Delil listesini netleştirin; sözleşme/fatura/rapor eklerini belirtin.")
    if any("tanık" in k.lower() for k in key_issues):
        recommended.append("Tanık ad-soyad ve beyan özetlerini ekleyin; ulaşılabilirlik belirtin.")
    if any("zamanaşımı" in k.lower() for k in key_issues):
        recommended.append("Sürelerin kesildiğini/uzadığını gösteren işlemleri belgeleyin.")
    if any("yetki" in k.lower() for k in key_issues) or any("görev" in k.lower() for k in key_issues):
        recommended.append("Görev/Yetki itirazına karşı dayanak HMK maddelerini ve yerleşik içtihatları ekleyin.")
    if not recommended:
        recommended.append("İddia-savunma kurgusunu maddeleyin; kanun ve emsal atıflarını güçlendirin.")

    # pozitif notları da bilgi amaçlı ekle
    if positives_found:
        recommended.append("Lehte unsurlar: " + "; ".join(positives_found))

    return {
        "risk_score": int(risk_score),
        "winning_probability": float(winning_probability),
        "key_issues": key_issues or ["Belirgin risk bulunmadı."],
        "recommended_actions": recommended,
    }

def _save_report(payload: Dict[str, Any], text: str):
    os.makedirs("reports", exist_ok=True)
    case_type = guess_case_type(text)
    payload["dilekce_turu"] = case_type
    # stats_router ile uyumlu isim: success_rate
    payload["success_rate"] = payload.get("winning_probability", 0.0)

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    fname = f"reports/risk_{ts}.json"
    with open(fname, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    return fname

# ------- Endpoints -------

@router.post("/analyze")
async def risk_analyze(
    file: Optional[UploadFile] = File(None),
    case_text: Optional[str] = Form(None),
    first_name: Optional[str] = Form(None),
    last_name: Optional[str] = Form(None),
):
    """
    Yüklenen dosya **veya** case_text üzerinden risk puanı ve strateji önerisi üretir.
    Raporu `reports/` altına JSON olarak kaydeder (Dashboard ile uyumlu).
    """
    if not file and not (case_text and case_text.strip()):
        raise HTTPException(status_code=400, detail="Dosya veya metin (case_text) gereklidir.")

    if file:
        raw = await file.read()
        text = extract_text_from_bytes(file.filename, raw)
        source = _safe_basename(file.filename)
    else:
        text = case_text.strip()
        source = "metin"

    result = analyze_risk(text)
    result.update({
        "source": source,
        "case_type_guess": guess_case_type(text),
        "length": len(text),
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    })

    saved = _save_report(dict(result), text)
    result["saved_report"] = saved
    return result


@router.post("/analyze-cloud-file")
def risk_analyze_cloud_file(
    first_name: str = Query(...),
    last_name: str = Query(...),
    filename: str = Query(...),
):
    """
    Kullanıcının Libra Cloud 'uploads' klasöründeki dosyasını doğrudan analiz eder.
    """
    key = f"{first_name.strip().lower()}.{last_name.strip().lower()}"
    fname = _safe_basename(filename)
    path = os.path.join("user_data", key, "uploads", fname)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Dosya bulunamadı.")

    with open(path, "rb") as f:
        raw = f.read()
    text = extract_text_from_bytes(fname, raw)

    result = analyze_risk(text)
    result.update({
        "source": fname,
        "case_type_guess": guess_case_type(text),
        "length": len(text),
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    })
    saved = _save_report(dict(result), text)
    result["saved_report"] = saved
    return result
