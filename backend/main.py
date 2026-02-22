from __future__ import annotations

import io
import os
import re
import sys
import datetime
import pathlib
from typing import Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

import pdfplumber
from docx import Document

# ---------------------------
# PATH FIX (cwd bağımsız)
# ---------------------------
BASE_DIR = pathlib.Path(__file__).resolve().parent  # .../backend
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# .env'i backend/.env'ten yükle
load_dotenv(dotenv_path=BASE_DIR / ".env", override=True)

# ---------------------------
# OpenAI client (tek kaynak)
# ---------------------------
from openai_client import get_openai_client, get_openai_api_key
try:
    from backend.middleware.logging import LoggingMiddleware, SecurityHeadersMiddleware, RateLimitMiddleware, BotProtectionMiddleware
except ImportError:
    from middleware.logging import LoggingMiddleware, SecurityHeadersMiddleware, RateLimitMiddleware, BotProtectionMiddleware
from security import sanitize_text

# OpenAI error types (sürüm uyumlu)
try:
    from openai import AuthenticationError, BadRequestError, RateLimitError, APIConnectionError, APIStatusError
except Exception:
    AuthenticationError = BadRequestError = RateLimitError = APIConnectionError = APIStatusError = Exception

# Initialize lazily or checking env
client = None
try:
    # Try to init client but don't crash module if key missing (will be checked in startup)
    client = get_openai_client()
except Exception:
    client = None

# ---------------------------
# APP
# ---------------------------
app = FastAPI(title="Miron AI Backend", version="1.4.0")

@app.on_event("startup")
async def startup_event():
    """
    Runtime validation of environment variables.
    Fails clearly if critical keys are missing.
    """
    required_vars = [
        "SUPABASE_URL",
        "SUPABASE_KEY",
        "OPENAI_API_KEY",
        "SECRET_KEY"
    ]
    missing = []
    print("--- STARTUP ENVIRONMENT CHECK ---")
    for var in required_vars:
        val = os.getenv(var)
        if not val:
            missing.append(var)
            print(f"❌ {var} is MISSING")
        else:
            masked = val[:4] + "*" * 4 + val[-4:] if len(val) > 8 else "****"
            print(f"✅ {var} is set ({masked})")
    
    if missing:
        print(f"🔥 CRITICAL: Missing environment variables: {', '.join(missing)}")
        # We can choose to raise exception here to crash explicitly in logs
        # raise RuntimeError(f"Missing environment variables: {', '.join(missing)}")
    else:
        print("✅ All required environment variables are present.")

# ---------------------------
# CORS
# ---------------------------

_origins_env = os.getenv("FRONTEND_ORIGINS")
if _origins_env:
    _allowed_origins = [o.strip() for o in _origins_env.split(",") if o.strip()]
else:
    _allowed_origins = [
        "http://localhost:5173",
        "https://miron22.vercel.app",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(LoggingMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(BotProtectionMiddleware)

@app.get("/health")
def health():
    return {"ok": True}
# ---------------------------
# ROUTER IMPORTS (opsiyonel)
# ---------------------------
import importlib

def _safe_import(path: str, name: str = "router"):
    try:
        mod = importlib.import_module(path)
        return getattr(mod, name)
    except Exception as e:
        print(f"[WARN] Router import failed: {path}.{name} -> {e}")
        return None


assistant_router = _safe_import("assistant_routes", "router")
writer_router    = _safe_import("legal_writer", "writer_router")
stats_router     = _safe_import("stats_router", "stats_router")
risk_router      = _safe_import("risk_router", "router")
calc_router      = _safe_import("calculators", "router")
reports_router   = _safe_import("reports", "router")
yargitay_router  = _safe_import("yargitay_search", "router")
mevzuat_router   = _safe_import("mevzuat_search", "router")
uyap_udf_router  = _safe_import("uyap_udf", "router")
billing_router   = _safe_import("routes.billing_routes", "router")
feedback_router  = _safe_import("routes.feedback_routes", "router")
analyze_router   = _safe_import("routes.analyze", "router")
orchestrator_router = _safe_import("routers.orchestrator", "router")
admin_api_router = _safe_import("admin_router", "api_router")
admin_router     = _safe_import("admin_router", "router")

# ---------------------------
# ROOT
# ---------------------------
@app.get("/")
def root():
    return {"status": "ok", "msg": "Libra AI Backend çalışıyor!"}

# =============================
# EVRAK ANALİZ (UPDATED FOR LEGAL STRUCTURE)
# =============================
def smart_format(text: str, filename: str, dava_turu: str):
    """
    Uses OpenAI to structure raw text into a professional legal analysis format.
    Fallback to simple parsing if AI fails or key missing.
    """
    if client:
        try:
            # AI-POWERED STRUCTURED ANALYSIS - DEEP MODE
            prompt = f"""
            Sen kıdemli bir hukuk analisti ve eski bir hakimsin.
            Metni cümle cümle analiz et, somut bilgi üret ve çıkarımları gerekçelendir.
            Her başlık dolu olmalı. Metinde açıkça yoksa çıkarım yap, çıkarım yapılamıyorsa nedenini açıkça yaz.
            Çıktıda '-' ya da boş ifade kullanma.

            Başlıklar aşağıdaki gibi ve Türkçe olmalı:

            ### DAVACI
            ### DAVALI
            ### MAHKEME
            ### DOSYA NO
            ### KARAR NO
            ### DAVA TÜRÜ
            ### TALEP KONUSU
            ### UYUŞMAZLIK ÖZETİ
            ### TESPİT EDİLEN DELİLLER
            ### İSPAT YÜKÜ
            ### ZAMANAŞIMI RİSKİ
            ### GÖREV / YETKİ SORUNU
            ### USULİ RİSKLER
            ### MADDİ HUKUK RİSKLERİ
            ### STRATEJİ ÖNERİSİ
            ### MUHTEMEL KARŞI ARGÜMANLAR
            ### RİSK SKORU (%)

            Her başlık altında kısa ve net paragraflar yaz. Çelişkileri, eksik delilleri, usuli tuzakları, ispat zayıflıklarını, zamanaşımı ve görev/yetki risklerini açıkça belirt.

            BELGE METNİ:
            {text[:20000]}
            """
            
            completion = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "Sen Türk hukukunda uzman, titiz ve analitik düşünen bir yapay zeka asistanısın. Çıktın profesyonel hukuk formatında olmalı."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1
            )
            structured_output = completion.choices[0].message.content.strip()
            
            # Extract a short summary for the summary field
            summary = "Miron AI tarafından yapılan detaylı analiz aşağıdadır."
            
            return structured_output, summary
            
        except Exception as e:
            print(f"AI Analysis Failed: {e}")
            # Fallback to legacy method below
            pass

    # LEGACY FALLBACK (Regex/Rule based)
    clean = text.replace("\r", "")
    lines = [l.strip() for l in clean.split("\n") if l.strip()]

    taraflar, olaylar, hukuki, dayanak = [], [], [], []

    for l in lines:
        low = l.lower()
        if "davacı" in low or "davalı" in low or "mahkeme" in low:
            taraflar.append(l)
        elif "olay" in low or "tarih" in low or "yaralan" in low:
            olaylar.append(l)
        elif "hukuki" in low or "sorumluluk" in low:
            hukuki.append(l)
        elif "madde" in low or "kanunu" in low:
            dayanak.append(l)

    summary = " ".join(lines)[:1200] + ("..." if len(" ".join(lines)) > 1200 else "")

    formatted = f"""
### DAVACI
{', '.join(taraflar[:2]) or "Metinde açıkça yer almıyor; çıkarım yapılamadı."}

### DAVALI
{', '.join(taraflar[2:4]) or "Metinde açıkça yer almıyor; çıkarım yapılamadı."}

### MAHKEME
Metinde açıkça yer almıyor; çıkarım yapılamadı.

### DOSYA NO
Metinde açıkça yer almıyor; çıkarım yapılamadı.

### KARAR NO
Metinde açıkça yer almıyor; çıkarım yapılamadı.

### DAVA TÜRÜ
{dava_turu}

### TALEP KONUSU
Metinde açıkça yer almıyor; çıkarım yapılamadı.

### UYUŞMAZLIK ÖZETİ
{summary}

### TESPİT EDİLEN DELİLLER
{chr(10).join(dayanak[:10]) or "Metinde açıkça yer almıyor; çıkarım yapılamadı."}

### İSPAT YÜKÜ
Metinde açıkça yer almıyor; çıkarım yapılamadı.

### ZAMANAŞIMI RİSKİ
Metinde açıkça yer almıyor; çıkarım yapılamadı.

### GÖREV / YETKİ SORUNU
Metinde açıkça yer almıyor; çıkarım yapılamadı.

### USULİ RİSKLER
Metinde açıkça yer almıyor; çıkarım yapılamadı.

### MADDİ HUKUK RİSKLERİ
Metinde açıkça yer almıyor; çıkarım yapılamadı.

### STRATEJİ ÖNERİSİ
Metinde açıkça yer almıyor; çıkarım yapılamadı.

### MUHTEMEL KARŞI ARGÜMANLAR
Metinde açıkça yer almıyor; çıkarım yapılamadı.

### RİSK SKORU (%)
50
""".strip()

    return formatted, summary


def extract_text(filename: str, data: bytes):
    fn = (filename or "").lower()

    if fn.endswith(".pdf"):
        try:
            with pdfplumber.open(io.BytesIO(data)) as pdf:
                return "\n".join([(page.extract_text() or "") for page in pdf.pages])
        except Exception:
            return data.decode("utf-8", errors="ignore")

    if fn.endswith(".docx"):
        try:
            doc = Document(io.BytesIO(data))
            return "\n".join([p.text for p in doc.paragraphs])
        except Exception:
            return data.decode("utf-8", errors="ignore")

    return data.decode("utf-8", errors="ignore")


@app.post("/analyze")
async def analyze_file(file: UploadFile = File(...)):
    content = await file.read()
    text = extract_text(file.filename, content)

    lower = text.lower()
    if "tazminat" in lower:
        dava_turu = "Tazminat Davası"
    elif "boşan" in lower or "bosan" in lower:
        dava_turu = "Boşanma / Aile Hukuku"
    elif "iş kazası" in lower or "is kazasi" in lower:
        dava_turu = "İş Kazası"
    else:
        dava_turu = "Genel Hukuk Dosyası"

    formatted, summary = smart_format(text, file.filename, dava_turu)

    return {
        "analysis": formatted,
        "formatted": formatted,
        "summary": summary,
        "dava_turu": dava_turu,
    }


# =============================
# ASSISTANT CHAT
# =============================

class ChatRequest(BaseModel):
    chat_id: Optional[str] = None
    message: str = Field(..., min_length=1)
    context: Optional[str] = None

SYSTEM_PROMPT = """
Senin adın *Miron AI Legal Assistant*.
Şu anki tarih: 2026.

TEMEL PRENSİPLER:
1. Sen SADECE ve SADECE bir hukuk asistanısın. Hukuk dışı (spor, magazin, yemek tarifi vb.) sorulara "Ben sadece hukuki konularda yardımcı olabilirim." diyerek nazikçe ret cevabı ver.
2. Cevapların profesyonel, net ve yapılandırılmış olmalı.
3. Asla tarih (gün/ay) belirtme, sadece "2026 yılı itibarıyla..." gibi genel ifadeler kullan.
4. Kullanıcı "adın ne" derse: "Ben Miron AI Legal Assistant. Türkiye hukukuna uygun analiz ve strateji desteği sağlarım." de.

YANIT FORMATI (HUKUKİ SORULAR İÇİN):

### 📌 Konunun Özeti
- 1–3 cümle ile durumu özetle.

### ⚖ Hukuki Değerlendirme
- Mevzuat ve içtihat ışığında analiz yap.

### 🧾 Olası Haklar ve Talepler
- Hangi davalar açılabilir?
- Hangi tazminatlar istenebilir?

### 🧠 Stratejik Öneriler
- Delil toplama, ihtarname, arabuluculuk vb. adımlar.

### 📚 İlgili Mevzuat
- Kanun maddeleri (TMK, TBK, HMK vb.)

MODEL KULLANIMI:
- Genel sorular ve analizler için hızlı model kullanılır.
- Simülasyon modunda derinlemesine stratejik analiz yapılır.
""".strip()

def _new_chat_id() -> str:
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"auto_assistant_{ts}"

def _sanitize_chat_id(chat_id: str) -> str:
    chat_id = (chat_id or "").strip()
    if not chat_id:
        return _new_chat_id()
    chat_id = re.sub(r"[^a-zA-Z0-9_\-]", "_", chat_id)
    return chat_id[:80]

def _run_llm(messages):
    # model fallback
    models = ["gpt-4o-mini", "gpt-4.1-mini", "gpt-4o"]
    last_err = None
    for m in models:
        try:
            return client.chat.completions.create(
                model=m,
                temperature=0.2,
                messages=messages,
            )
        except (BadRequestError, APIStatusError) as e:
            last_err = e
            continue
    raise last_err or Exception("OpenAI call failed (unknown)")

@app.post("/assistant-chat")
def assistant_chat(req: ChatRequest = Body(...)):
    global client
    if not client:
        # Try to init again if it failed at startup
        try:
             client = get_openai_client()
        except Exception:
             pass
        
    if not client:
        # .env yanlışsa burada patlar
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY eksik/boş ya da client oluşturulamadı.")

    chat_id = _sanitize_chat_id(req.chat_id)
    user_text = sanitize_text(req.message)
    context = sanitize_text(req.context or "")

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if context:
        messages.append({"role": "system", "content": f"Dava/Dosya Bağlamı (özet):\n{context}"})
    messages.append({"role": "user", "content": user_text})

    try:
        completion = _run_llm(messages)
        reply = (completion.choices[0].message.content or "").strip()
        return {"reply": reply, "chat_id": chat_id}

    except AuthenticationError:
        raise HTTPException(status_code=401, detail="Harici hizmet doğrulama hatası.")

    except RateLimitError:
        raise HTTPException(status_code=429, detail="Harici hizmet hız limiti aşıldı.")

    except APIConnectionError:
        raise HTTPException(status_code=503, detail="Harici hizmet bağlantı hatası.")

    except (BadRequestError, APIStatusError):
        raise HTTPException(status_code=400, detail="Harici hizmet isteği başarısız.")

    except Exception:
        raise HTTPException(status_code=500, detail="İşlem sırasında hata oluştu.")





# =============================
# ROUTER REGISTRATION
# =============================
if writer_router:   app.include_router(writer_router)
if assistant_router: app.include_router(assistant_router)
if stats_router:    app.include_router(stats_router)
if risk_router:     app.include_router(risk_router)
if admin_router:    app.include_router(admin_router, prefix="/admin")
if calc_router:     app.include_router(calc_router)
if reports_router:  app.include_router(reports_router)
if yargitay_router: app.include_router(yargitay_router)
if mevzuat_router:  app.include_router(mevzuat_router)
if uyap_udf_router: app.include_router(uyap_udf_router)
if billing_router:  app.include_router(billing_router)
if feedback_router: app.include_router(feedback_router)
if analyze_router:  app.include_router(analyze_router)
if orchestrator_router: app.include_router(orchestrator_router)
                    

# New Auth Router (Supabase)
try:
    from backend.auth_router import router as auth_router_new
except ImportError:
    from auth_router import router as auth_router_new

app.include_router(auth_router_new, prefix="/api/auth", tags=["Authentication"])

# Pricing Router
try:
    from backend.pricing_router import router as pricing_router
except ImportError:
    from pricing_router import router as pricing_router

app.include_router(pricing_router, prefix="/api/pricing", tags=["Pricing"])

# Admin Router (ensure it is included)
# Note: admin_router is already imported via _safe_import and included above with prefix="/admin"
# We don't need to re-import it unless _safe_import failed.

# CORS ayarlarının (allow_origins) frontend adresini (http://localhost:5173) kapsadığından emin ol.
