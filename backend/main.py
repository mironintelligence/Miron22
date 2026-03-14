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
    from middleware.logging import LoggingMiddleware, SecurityHeadersMiddleware, BotProtectionMiddleware
    from middleware.rate_limit import RateLimitMiddleware
    from middleware.csrf import CSRFProtectionMiddleware
    from middleware.metrics import PrometheusMiddleware
    from middleware.concurrency import IdempotencyMiddleware, TimeoutMiddleware
    from middleware.chaos import ChaosMiddleware
    from db import init_pool, close_pool
    from db_async import db as async_db
except ImportError:
    from middleware.logging import LoggingMiddleware, SecurityHeadersMiddleware, BotProtectionMiddleware
    from middleware.rate_limit import RateLimitMiddleware
    from middleware.csrf import CSRFProtectionMiddleware
    from middleware.metrics import PrometheusMiddleware
    from middleware.concurrency import IdempotencyMiddleware, TimeoutMiddleware
    from middleware.chaos import ChaosMiddleware
    from db import init_pool, close_pool
    from db_async import db as async_db
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
        "SECRET_KEY",
        "DATABASE_URL",
        "JWT_SECRET",
        "DATA_HASH_KEY",
        "DATA_ENCRYPTION_KEY",
    ]
    missing = []
    print("--- STARTUP ENVIRONMENT CHECK ---")
    for var in required_vars:
        val = os.getenv(var)
        if not val:
            missing.append(var)
            print(f"❌ {var} is MISSING")
        else:
            if var in ["OPENAI_API_KEY", "SUPABASE_KEY", "SECRET_KEY", "JWT_SECRET", "DATA_HASH_KEY", "DATA_ENCRYPTION_KEY"]:
                masked = val[:4] + "*" * 4 + val[-4:] if len(val) > 8 else "****"
                print(f"✅ {var} is set ({masked})")
            elif var == "DATABASE_URL":
                try:
                    from urllib.parse import urlparse
                    u = urlparse(val)
                    host = u.hostname or ""
                    port = u.port or ""
                    user = u.username or ""
                    safe = f"{u.scheme}://{user}@{host}:{port}{u.path}"
                    print(f"✅ {var} is set ({safe})")
                    try:
                        sref = (os.getenv("SUPABASE_URL") or "").split("://", 1)[-1].split(".", 1)[0]
                        if sref and sref not in val:
                            print("⚠️ DATABASE_URL SUPABASE_URL ile aynı projeye işaret etmiyor olabilir.")
                    except Exception:
                        pass
                except Exception:
                    print(f"✅ {var} is set")
            else:
                print(f"✅ {var} is set ({val})")
    
    if missing:
        raise RuntimeError(f"Missing environment variables: {', '.join(missing)}")

    db_url = os.getenv("DATABASE_URL") or ""
    sb_url = (os.getenv("SUPABASE_URL") or "").strip()
    sb_ref = sb_url.split("://", 1)[-1].split(".", 1)[0] if sb_url else ""
    if sb_ref and sb_ref not in db_url:
        raise RuntimeError(
            "DATABASE_URL yanlış Supabase projesine/region’ına işaret ediyor. "
            f"SUPABASE_URL ref={sb_ref} ama DATABASE_URL içinde bu ref yok. "
            "Render’daki DATABASE_URL’yi Frankfurt (aws-1-eu-central-1) pooler string’i ile güncelle."
        )
    if "ap-northeast-2" in db_url:
        raise RuntimeError(
            "DATABASE_URL eski Seoul (ap-northeast-2) pooler’a işaret ediyor. "
            "Render’daki DATABASE_URL’yi aws-1-eu-central-1.pooler.supabase.com:6543 olacak şekilde güncelle."
        )
    if "sslmode=" not in db_url:
        raise RuntimeError("DATABASE_URL içine ?sslmode=require eklenmeli.")

    print("✅ All required environment variables are present and consistent.")
        
    # Init Sync DB Pool (Legacy)
    try:
        init_pool(min_conn=5, max_conn=50)
    except Exception as e:
        print(f"🔥 CRITICAL: Sync DB Pool Init Failed: {e}")
        
    # Async DB Pool init
    try:
        await async_db.init_pools()
    except Exception as e:
        print(f"🔥 CRITICAL: Async DB Pool Init Failed: {e}")

    try:
        from schema import ensure_schema
        ensure_schema()
    except Exception as e:
        raise RuntimeError(f"DB şeması hazırlanamadı: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    close_pool()
    await async_db.close_pools()

# ---------------------------
# ERROR HANDLERS (GLOBAL)
# ---------------------------
from fastapi.responses import JSONResponse
from starlette.requests import Request

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    # In production, do NOT expose stack trace
    # Log the full error internally
    print(f"[ERROR] Global Exception: {exc}")
    # traceback.print_exc() 
    
    return JSONResponse(
        status_code=500,
        content={"detail": "Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin."},
    )


# ---------------------------
# CORS
# ---------------------------

_origins_env = os.getenv("FRONTEND_ORIGINS")
_allowed_origins = [
    "http://localhost:5173",
    "https://miron22.vercel.app",
]
if _origins_env:
    for o in [x.strip() for x in _origins_env.split(",")]:
        if o and o not in _allowed_origins:
            _allowed_origins.append(o)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_origin_regex=os.getenv("FRONTEND_ORIGIN_REGEX", r"^https:\/\/.*\.vercel\.app$"),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# 3. Security Middlewares (Order Matters!)
app.add_middleware(BotProtectionMiddleware)
app.add_middleware(ChaosMiddleware) # Failure Injection (First to intercept everything)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(CSRFProtectionMiddleware) # Double Submit Cookie
app.add_middleware(IdempotencyMiddleware)
app.add_middleware(TimeoutMiddleware) # Global Timeout
app.add_middleware(PrometheusMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(LoggingMiddleware) # Outermost logger

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/api/health")
def api_health():
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
contract_router  = _safe_import("routes.contract_routes", "router")
notification_router = _safe_import("routes.notification_routes", "router")
billing_router   = _safe_import("routes.billing_routes", "router")
feedback_router  = _safe_import("routes.feedback_routes", "router")
analyze_router   = _safe_import("routes.analyze", "router")
orchestrator_router = _safe_import("routers.orchestrator", "router")
demo_request_router = _safe_import("routes.demo_request_routes", "router")
search_router    = _safe_import("routes.search_routes", "router")
admin_api_router = _safe_import("admin_router", "api_router")
admin_router     = _safe_import("admin_router", "router")

# ---------------------------
# ROOT
# ---------------------------
@app.get("/")
def root():
    return {"status": "ok", "msg": "Miron AI Backend çalışıyor!"}

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
            Metni detaylıca analiz et ve aşağıdaki JSON formatında, Türkçe karakterlere dikkat ederek, eksiksiz bir çıktı üret.
            Eğer bir bilgi metinde yoksa, değer olarak "Belirtilmemiş" yaz. Asla boş bırakma.

            İstenen JSON Yapısı:
            {{
                "dosya_no": "Dosya Numarası (Örn: 2023/123 E.)",
                "evrak_no": "Evrak Numarası (Varsa)",
                "davaci": "Davacı Adı Soyadı / Unvanı",
                "davali": "Davalı Adı Soyadı / Unvanı",
                "mahkeme": "Mahkeme Adı",
                "dava_turu": "Dava Türü",
                "konu_ozeti": "Uyuşmazlığın kısa ve net özeti",
                "deliller": ["Delil 1", "Delil 2"],
                "risk_analizi": {{
                    "zamanasimi_riski": "Zamanaşımı durumu",
                    "usuli_riskler": "Usuli eksiklikler veya riskler",
                    "maddi_hukuk_riskleri": "Maddi hukuk açısından riskler",
                    "risk_skoru": 50
                }},
                "strateji": "Önerilen hukuki strateji",
                "karsi_argumanlar": "Muhtemel karşı taraf argümanları"
            }}

            BELGE METNİ:
            {text[:20000]}
            """
            
            completion = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "Sen Türk hukukunda uzman bir yapay zeka asistanısın. Çıktın SADECE geçerli bir JSON objesi olmalı. Markdown formatı kullanma."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            import json
            structured_output = json.loads(completion.choices[0].message.content.strip())
            
            # Convert JSON to Markdown for compatibility with frontend display
            formatted = f"""
### DOSYA NO
{structured_output.get('dosya_no', 'Belirtilmemiş')}

### EVRAK NO
{structured_output.get('evrak_no', 'Belirtilmemiş')}

### DAVACI
{structured_output.get('davaci', 'Belirtilmemiş')}

### DAVALI
{structured_output.get('davali', 'Belirtilmemiş')}

### MAHKEME
{structured_output.get('mahkeme', 'Belirtilmemiş')}

### DAVA TÜRÜ
{structured_output.get('dava_turu', dava_turu)}

### UYUŞMAZLIK ÖZETİ
{structured_output.get('konu_ozeti', 'Belirtilmemiş')}

### TESPİT EDİLEN DELİLLER
{', '.join(structured_output.get('deliller', [])) or 'Belirtilmemiş'}

### RİSK ANALİZİ
- **Zamanaşımı:** {structured_output.get('risk_analizi', {}).get('zamanasimi_riski', 'Belirtilmemiş')}
- **Usuli Riskler:** {structured_output.get('risk_analizi', {}).get('usuli_riskler', 'Belirtilmemiş')}
- **Maddi Hukuk:** {structured_output.get('risk_analizi', {}).get('maddi_hukuk_riskleri', 'Belirtilmemiş')}

### STRATEJİ ÖNERİSİ
{structured_output.get('strateji', 'Belirtilmemiş')}

### MUHTEMEL KARŞI ARGÜMANLAR
{structured_output.get('karsi_argumanlar', 'Belirtilmemiş')}

### RİSK SKORU (%)
{structured_output.get('risk_analizi', {}).get('risk_skoru', 50)}
""".strip()
            
            summary = structured_output.get('konu_ozeti', "Otomatik analiz tamamlandı.")
            return formatted, summary, structured_output
            
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

    return formatted, summary, None


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

    formatted, summary, structured = smart_format(text, file.filename, dava_turu)

    return {
        "analysis": formatted,
        "formatted": formatted,
        "summary": summary,
        "dava_turu": dava_turu,
        "structured": structured,
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
if search_router:   app.include_router(search_router)
if contract_router: app.include_router(contract_router)
if notification_router: app.include_router(notification_router)
if billing_router:  app.include_router(billing_router)
if feedback_router: app.include_router(feedback_router)
if analyze_router:  app.include_router(analyze_router)
if orchestrator_router: app.include_router(orchestrator_router)
if demo_request_router: app.include_router(demo_request_router)
                    
                    

# New Auth Router (Supabase)
try:
    from auth_router import router as auth_router_new
except ImportError:
    from auth_router import router as auth_router_new

app.include_router(auth_router_new, prefix="/api/auth", tags=["Kimlik Doğrulama"])

# Pricing Router
try:
    from pricing_router import router as pricing_router
except ImportError:
    from pricing_router import router as pricing_router

app.include_router(pricing_router, prefix="/api/pricing", tags=["Pricing"])

# Admin Router (ensure it is included)
# Note: admin_router is already imported via _safe_import and included above with prefix="/admin"
# We don't need to re-import it unless _safe_import failed.

# CORS ayarlarının (allow_origins) frontend adresini (http://localhost:5173) kapsadığından emin ol.
