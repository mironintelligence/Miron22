from __future__ import annotations

import io
import os
import re
import sys
import datetime
import pathlib
from typing import Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Body, Depends
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

# .env'i backend/.env'ten yükle. Shell env (CI/prod deploy platformu veya
# pytest fixture'ları) varsa onu koru; .env yalnızca eksik değerler için
# fallback gibi davransın. Böylece production'da Render/Vercel env vars
# güvende, testlerde ise ENVIRONMENT=test gibi shell değerleri .env
# tarafından sessizce ezilmez.
load_dotenv(dotenv_path=BASE_DIR / ".env", override=False)

# ---------------------------
# OpenAI client (tek kaynak)
# ---------------------------
from openai_client import get_openai_client, get_openai_api_key
from llm_gateway import chat_completions_create
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
from user_auth import get_current_user

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
    env = (os.getenv("ENVIRONMENT") or "").lower()
    if (os.getenv("SKIP_STARTUP_CHECKS", "false") or "").lower() == "true" or env in {"test", "dev", "development", "local"}:
        print(f"--- STARTUP ENVIRONMENT CHECK (skipped for ENVIRONMENT={env}) ---")
        return

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
from starlette.middleware.base import BaseHTTPMiddleware

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    print(f"[ERROR] Global Exception on {request.method} {request.url.path}: {exc}")
    traceback.print_exc()
    
    return JSONResponse(
        status_code=500,
        content={"detail": "Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin."},
    )


# ---------------------------
# CORS
# ---------------------------

# CORS — only explicitly allowed origins may send credentialed requests.
# Previously `allow_origin_regex` defaulted to `^https://.*\.vercel\.app$`,
# which combined with `allow_credentials=True` let ANY attacker deploy to
# Vercel and issue cross-origin credentialed requests to this API. We now
# require the operator to opt in explicitly via FRONTEND_ORIGIN_REGEX, and
# keep a narrow default allowlist.
_origins_env = os.getenv("FRONTEND_ORIGINS")
_allowed_origins = [
    "https://miron22.vercel.app",
    "https://mironintelligence.vercel.app",
    "https://www.mironintelligence.vercel.app",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:3000",
]
if _origins_env:
    for o in [x.strip() for x in _origins_env.split(",")]:
        if o and o not in _allowed_origins:
            _allowed_origins.append(o)

_origin_regex = (os.getenv("FRONTEND_ORIGIN_REGEX") or "").strip() or None


async def strict_api_admin_rbac(request: Request, call_next):
    """RBAC for /api/admin/*. Registered as BaseHTTPMiddleware *inside* CORS so
    JSONResponse short-circuits still get Access-Control-Allow-Origin."""
    if request.url.path.startswith("/api/admin"):
        auth = (request.headers.get("authorization") or "").strip()
        if not auth.lower().startswith("bearer "):
            return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
        try:
            user = get_current_user(auth)
            if (user.get("role") or "").lower() != "admin":
                return JSONResponse(status_code=403, content={"detail": "Forbidden"})
        except HTTPException as exc:
            return JSONResponse(status_code=int(exc.status_code), content={"detail": str(exc.detail)})
        except Exception:
            return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
    return await call_next(request)


# CORS middleware is registered *after* the stack below so it wraps every
# other middleware. Inner layers (Chaos, Timeout, CSRF, Idempotency, …) may
# return a plain Response without reaching the FastAPI app; those responses
# previously skipped the inner CORS layer, so Chrome reported "blocked by
# CORS" even for 403/500/504 bodies that were not cross-origin policy blocks.

# 3. Security Middlewares (Order Matters!)
app.add_middleware(BotProtectionMiddleware)
app.add_middleware(ChaosMiddleware) # Failure Injection (First to intercept everything)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(CSRFProtectionMiddleware) # Double Submit Cookie
app.add_middleware(IdempotencyMiddleware)
app.add_middleware(TimeoutMiddleware) # Global Timeout
app.add_middleware(PrometheusMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(LoggingMiddleware) # Request logger (still inside CORS)
app.add_middleware(BaseHTTPMiddleware, dispatch=strict_api_admin_rbac)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_origin_regex=_origin_regex,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    # Explicit header allowlist — "*" is ignored by browsers when credentials
    # are included, and being explicit lets the preflight cache be cleaner.
    allow_headers=[
        "Authorization",
        "Content-Type",
        "X-CSRF-Token",
        "X-Idempotency-Key",
        "X-Requested-With",
    ],
    expose_headers=["X-Request-ID"],
    max_age=600,
)


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
reminder_router  = _safe_import("routes.reminder_routes", "router")
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
            
            completion = chat_completions_create(
                client,
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


MAX_ANALYZE_BYTES = int(os.getenv("MAX_ANALYZE_BYTES", str(15 * 1024 * 1024)))  # 15 MB default
_ALLOWED_ANALYZE_EXTS = {".pdf", ".docx", ".txt"}


@app.post("/analyze")
async def analyze_file(file: UploadFile = File(...), _user: dict = Depends(get_current_user)):
    filename = (file.filename or "").strip()
    if not filename:
        raise HTTPException(status_code=400, detail="Dosya adı gerekli.")
    ext = pathlib.Path(filename).suffix.lower()
    if ext and ext not in _ALLOWED_ANALYZE_EXTS:
        raise HTTPException(status_code=415, detail="Yalnızca PDF, DOCX veya TXT desteklenir.")

    # Read in bounded chunks so a malicious client cannot exhaust memory
    # by streaming a large file past the size cap.
    buf = bytearray()
    chunk_size = 64 * 1024
    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        if len(buf) + len(chunk) > MAX_ANALYZE_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"Dosya çok büyük. Maksimum {MAX_ANALYZE_BYTES // (1024 * 1024)} MB.",
            )
        buf.extend(chunk)
    content = bytes(buf)
    text = extract_text(filename, content)

    lower = text.lower()
    if "tazminat" in lower:
        dava_turu = "Tazminat Davası"
    elif "boşan" in lower or "bosan" in lower:
        dava_turu = "Boşanma / Aile Hukuku"
    elif "iş kazası" in lower or "is kazasi" in lower:
        dava_turu = "İş Kazası"
    else:
        dava_turu = "Genel Hukuk Dosyası"

    formatted, summary, structured = smart_format(text, filename, dava_turu)

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
    chat_id: Optional[str] = Field(default=None, max_length=80)
    message: str = Field(..., min_length=1, max_length=8000)
    context: Optional[str] = Field(default=None, max_length=12000)

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
    return chat_completions_create(client, temperature=0.2, messages=messages)

@app.post("/assistant-chat")
def assistant_chat(req: ChatRequest = Body(...), _user: dict = Depends(get_current_user)):
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
if admin_router:
    # Admin API is exposed under both prefixes for backward-compat:
    #   /api/admin/* — preferred (used by the SPA + external clients)
    #   /admin/*     — legacy (still referenced by older tests/tools)
    # The two prefixes register the same handlers; keep tags separate so
    # OpenAPI docs group them clearly.
    app.include_router(admin_router, prefix="/api/admin", tags=["admin"])
    app.include_router(admin_router, prefix="/admin", tags=["admin-legacy"])
if calc_router:     app.include_router(calc_router)
if reports_router:  app.include_router(reports_router)
if yargitay_router: app.include_router(yargitay_router)
if mevzuat_router:  app.include_router(mevzuat_router)
if uyap_udf_router: app.include_router(uyap_udf_router)
if search_router:   app.include_router(search_router)
if reminder_router: app.include_router(reminder_router)
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
