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
from fastapi.responses import StreamingResponse
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
    from db import init_pool, close_pool, recommended_sync_pool_bounds
    from db_async import db as async_db
except ImportError:
    from middleware.logging import LoggingMiddleware, SecurityHeadersMiddleware, BotProtectionMiddleware
    from middleware.rate_limit import RateLimitMiddleware
    from middleware.csrf import CSRFProtectionMiddleware
    from middleware.metrics import PrometheusMiddleware
    from middleware.concurrency import IdempotencyMiddleware, TimeoutMiddleware
    from middleware.chaos import ChaosMiddleware
    from db import init_pool, close_pool, recommended_sync_pool_bounds
    from db_async import db as async_db
from security import sanitize_text
from user_auth import get_current_user
from legal_acceptance_deps import require_legal_acceptance

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
_OPENAPI_TAGS = [
    {"name": "health", "description": "Liveness & readiness probes. No auth required."},
    {"name": "auth", "description": "Login, logout, token refresh, MFA, CSRF, session."},
    {"name": "user", "description": "Authenticated user profile, preferences, quotas."},
    {"name": "admin", "description": "Admin console endpoints. Require admin role + MFA."},
    {"name": "cases", "description": "Yargıtay & mevzuat search, case detail, simulation."},
    {"name": "contracts", "description": "Contract upload, risk analysis, report generation."},
    {"name": "pleadings", "description": "Template-driven dilekçe (petition) generation."},
    {"name": "calculators", "description": "Legal calculators (faiz, kıdem, harç, ...)."},
    {"name": "assistant", "description": "Libra AI chat assistant streaming endpoints."},
    {"name": "subscriptions", "description": "Plans, upgrades, invoicing, quota enforcement."},
    {"name": "reminders", "description": "Reminder/notification CRUD."},
    {"name": "feedback", "description": "User feedback submission."},
    {"name": "legal", "description": "Public legal documents and authenticated acceptance."},
    {"name": "metrics", "description": "Prometheus scrape endpoint."},
]

_OPENAPI_DESCRIPTION = """
Miron AI backend — Turkish legal intelligence platform.

**Error envelope**

Every non-2xx response follows the same shape:

```json
{
  "code": "AUTH_REQUIRED",
  "detail": "Oturumunuz sona erdi.",
  "request_id": "b0a2…"
}
```

Clients should branch on the machine-readable `code` (enum defined in
`backend/error_codes.py`), never on the localised `detail` string. The
`request_id` matches the `X-Request-ID` response header and backend
access logs — include it when reporting incidents.

**Authentication**

Most endpoints require a bearer JWT in the `Authorization` header.
Auth and CSRF flows are documented under the `auth` tag.
""".strip()

app = FastAPI(
    title="Miron AI Backend",
    version="1.4.0",
    description=_OPENAPI_DESCRIPTION,
    openapi_tags=_OPENAPI_TAGS,
    contact={"name": "Miron GROUP LLC", "url": "https://mironintelligence.vercel.app"},
    license_info={"name": "Proprietary"},
    swagger_ui_parameters={"defaultModelsExpandDepth": -1, "persistAuthorization": True},
)

def _database_url_declares_ssl(db_url: str) -> bool:
    """Render/Supabase bağlantı dizgilerinde sslmode farklı yazılabilir."""
    u = (db_url or "").lower()
    return (
        "sslmode=" in u
        or "sslmode%3d" in u
        or "ssl=true" in u
        or "?ssl=1" in u
        or "&ssl=1" in u
    )


def _warn_if_database_url_missing_supabase_ref(db_url: str, sb_url: str) -> None:
    if not sb_url or not db_url:
        return
    sb_ref = sb_url.split("://", 1)[-1].split(".", 1)[0]
    if not sb_ref or sb_ref in db_url:
        return
    import re

    m = re.search(r"postgres\.([a-z0-9]{5,32})\.", db_url, re.I)
    if m and m.group(1).lower() == sb_ref.lower():
        return
    print(
        f"⚠️ DATABASE_URL içinde SUPABASE_URL proje ref ({sb_ref}) görünmüyor. "
        "Bağlantı çalışıyorsa sorun olmayabilir; emin değilseniz Render env'deki DATABASE_URL / SUPABASE_URL çiftini kontrol edin."
    )


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
    _warn_if_database_url_missing_supabase_ref(db_url, sb_url)
    if "ap-northeast-2" in db_url:
        raise RuntimeError(
            "DATABASE_URL eski Seoul (ap-northeast-2) pooler’a işaret ediyor. "
            "Render’daki DATABASE_URL’yi aws-1-eu-central-1.pooler.supabase.com:6543 olacak şekilde güncelle."
        )
    if not _database_url_declares_ssl(db_url):
        raise RuntimeError(
            "DATABASE_URL SSL parametresi içermiyor. "
            "Örnek: ...?sslmode=require veya ssl=true (Supabase pooler genelde sslmode=require)."
        )

    dbl = db_url.lower()
    if "pooler.supabase.com" in dbl and ":5432" in dbl and ":6543" not in dbl:
        print(
            "⚠️ DATABASE_URL Supabase Session pooler (5432) kullanıyor. "
            "Yoğun trafikte MaxClientsInSessionMode hatası alabilirsiniz; "
            "tercihen Transaction pooler (:6543) ve ?pgbouncer=true kullanın."
        )

    print("✅ All required environment variables are present and consistent.")

    # Init Sync DB Pool (Legacy) — Supabase pooler için güvenli sınırlar: db.init_pool()
    try:
        init_pool()
        _plo, _phi = recommended_sync_pool_bounds()
        print(f"✅ Sync DB pool: min={_plo}, max={_phi}")
    except Exception as e:
        from logger_utils import log_exception as _log_exc
        _log_exc("sync DB pool init failed", e, stage="startup.sync_pool")

    # Async DB Pool init
    try:
        await async_db.init_pools()
    except Exception as e:
        from logger_utils import log_exception as _log_exc
        _log_exc("async DB pool init failed", e, stage="startup.async_pool")

    if (os.getenv("SKIP_ENSURE_SCHEMA", "false") or "").lower() == "true":
        print("⚠️ SKIP_ENSURE_SCHEMA=true — ensure_schema atlandı (yalnızca acil kurtarma).")
        return
    try:
        from schema import ensure_schema

        ensure_schema()
        try:
            from services.legal_cms_service import seed_v1_if_empty

            seed_v1_if_empty()
        except Exception as _seed_exc:
            from logger_utils import get_logger as _gl

            _gl("miron.startup").warning("legal CMS seed skipped", extra={"error": str(_seed_exc)})
    except Exception as e:
        import traceback

        print(traceback.format_exc())
        raise RuntimeError(f"DB şeması hazırlanamadı: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    close_pool()
    await async_db.close_pools()

# ---------------------------
# CORS
# ---------------------------
from fastapi.responses import JSONResponse
from starlette.requests import Request

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


def _cors_hdr(request: Request) -> dict[str, str]:
    origin = (request.headers.get("origin") or "").strip()
    if not origin:
        return {}
    if origin in _allowed_origins:
        return {"Access-Control-Allow-Origin": origin, "Access-Control-Allow-Credentials": "true"}
    if _origin_regex:
        try:
            if re.match(_origin_regex, origin):
                return {"Access-Control-Allow-Origin": origin, "Access-Control-Allow-Credentials": "true"}
        except re.error:
            pass
    return {}


from error_codes import AppError, ErrorCode, build_envelope, code_for_status
from logger_utils import get_logger, log_exception

_log = get_logger("miron.api")


def _request_id(request: Request) -> str | None:
    rid = getattr(request.state, "request_id", None)
    return str(rid) if rid else None


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    request_id = _request_id(request)
    log_exception(
        "unhandled exception",
        exc,
        method=request.method,
        path=request.url.path,
        request_id=request_id,
    )
    body = build_envelope(
        code=ErrorCode.INTERNAL_ERROR,
        detail="Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.",
        request_id=request_id,
    )
    return JSONResponse(status_code=500, content=body, headers=_cors_hdr(request))


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    request_id = _request_id(request)
    body = build_envelope(
        code=exc.code,
        detail=str(exc.detail),
        request_id=request_id,
        context=exc.context or None,
    )
    return JSONResponse(
        status_code=int(exc.status_code),
        content=body,
        headers={**(exc.headers or {}), **_cors_hdr(request)},
    )


@app.exception_handler(HTTPException)
async def http_exception_with_cors(request: Request, exc: HTTPException):
    request_id = _request_id(request)
    body = build_envelope(
        code=code_for_status(exc.status_code),
        detail=str(exc.detail) if exc.detail is not None else "",
        request_id=request_id,
    )
    return JSONResponse(
        status_code=int(exc.status_code),
        content=body,
        headers={**(exc.headers or {}), **_cors_hdr(request)},
    )


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

try:
    from middleware.cors_enforce import EnforceCorsHeadersMiddleware

    app.add_middleware(
        EnforceCorsHeadersMiddleware,
        allowed_origins=_allowed_origins,
        origin_regex=_origin_regex,
    )
except Exception as e:
    from logger_utils import get_logger as _gl
    _gl("miron.startup").warning("EnforceCorsHeadersMiddleware not loaded", extra={"error": str(e)})


@app.get(
    "/health",
    tags=["health"],
    summary="Liveness probe",
    description="Lightweight liveness check. Returns 200 as long as the process is up.",
    responses={200: {"content": {"application/json": {"example": {"ok": True}}}}},
)
def health():
    return {"ok": True}

@app.get(
    "/api/health",
    tags=["health"],
    summary="Liveness probe (api/ prefix)",
    description="Identical to /health — provided so callers routed through the /api prefix can hit it without rewrites.",
)
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
        from logger_utils import get_logger as _gl
        _gl("miron.startup").warning(
            "router import failed",
            extra={"import_path": path, "attr": name, "error": str(e)},
        )
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
legal_router     = _safe_import("routes.legal_routes", "router")

# ---------------------------
# ROOT
# ---------------------------
@app.get(
    "/",
    tags=["health"],
    summary="Service banner",
    description="Public landing endpoint used by uptime checks and smoke tests.",
)
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
async def analyze_file(file: UploadFile = File(...), _user: dict = Depends(require_legal_acceptance)):
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
Senin adın Miron AI Legal Assistant.
Şu anki tarih: 2026.

TEMEL PRENSİPLER:
1. Kullanıcının sorusunu veya talebini tam ve yardımcı biçimde yanıtla. Soru hukuki olmasa da genel bilgi, mantık ve iyi uygulamalarla cevap ver; kapsamı daraltıp ret etme.
2. Tüm yanıtlarında Türkiye hukukuna, kamu düzenine ve geçerli düzenlemelere uygun kal; yasadışı eylem, dolandırıcılık, şiddet, kişisel veri ihlali veya zarar verme talimatı verme. Bu tür istekleri kısa ve net reddet.
3. "Ben sadece hukuki sorularda yardımcı olabilirim", "yalnızca hukuk konusunda destek veririm" gibi genel ret ifadeleri kullanma.
4. Hukuki sonuç bağlayıcı değildir; gerektiğinde mesleki hukuki danışmanlık için bir avukata başvurulması gerektiğini tek cümleyle hatırlatabilirsin.
5. Cevapların profesyonel, net ve yapılandırılmış olmalı. ASLA emoji veya sembol kullanma.
6. Asla kesin gün/ay/tarih uydurma; gerektiğinde "2026 yılı itibarıyla genel çerçeve" gibi ifadeler kullan.
7. Kullanıcı "adın ne" derse: "Ben Miron AI Legal Assistant; Türkiye normlarına uygun analiz ve bilgilendirme sunarım." de.

YANIT BİÇİMİ:
- Soru açıkça hukuki / dava-usul / sözleşme vb. ise aşağıdaki başlıkları kullan.

### Konunun Özeti
- 1-3 cümle ile durumu özetle.

### Hukuki Değerlendirme
- Mevzuat ve (varsa bağlamdaki içtihat) ışığında analiz yap.

### Olası Haklar ve Talepler
- Uygunsa hangi yollar ve talepler düşünülebilir?

### Stratejik Öneriler
- Delil, süreç, arabuluculuk vb. adımlar.

### İlgili Mevzuat
- Kanun ve madde düzeyinde atıf (TMK, TBK, HMK vb.).

- Soru genel kültür, teknik, günlük yaşam veya hukuk dışı bir konudaysa bu başlıkları zorlama; net paragraflar ve gerekiyorsa maddeler halinde doğrudan yanıtla. Konu hukuka temas ediyorsa (ör. KVKK, tüketici, iş hukuku) ilgili çerçeveyi kısaca ekle.
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
def assistant_chat(req: ChatRequest = Body(...), _user: dict = Depends(require_legal_acceptance)):
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


@app.post("/assistant-chat/stream")
def assistant_chat_stream(req: ChatRequest = Body(...), _user: dict = Depends(require_legal_acceptance)):
    """SSE stream of the assistant reply. Each event: data: {"content": "..."}."""
    global client
    if not client:
        try:
            client = get_openai_client()
        except Exception:
            pass
    if not client:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY eksik/boş ya da client oluşturulamadı.")

    chat_id = _sanitize_chat_id(req.chat_id)
    user_text = sanitize_text(req.message)
    context = sanitize_text(req.context or "")

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if context:
        messages.append({"role": "system", "content": f"Dava/Dosya Bağlamı (özet):\n{context}"})
    messages.append({"role": "user", "content": user_text})

    def event_gen():
        import json as _json
        try:
            stream = chat_completions_create(
                client,
                temperature=0.2,
                messages=messages,
                stream=True,
            )
            for event in stream:
                try:
                    delta = event.choices[0].delta
                    chunk = getattr(delta, "content", None) or ""
                except Exception:
                    chunk = ""
                if chunk:
                    yield f"data: {_json.dumps({'content': chunk}, ensure_ascii=False)}\n\n"
            yield f"data: {_json.dumps({'done': True, 'chat_id': chat_id}, ensure_ascii=False)}\n\n"
        except Exception as _exc:
            yield f"data: {_json.dumps({'error': 'Asistan hatası oluştu.', 'done': True}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
            "Content-Type": "text/event-stream; charset=utf-8",
            "Connection": "keep-alive",
        },
    )


class TitleRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)


@app.post("/assistant-chat/title")
def assistant_chat_title(req: TitleRequest = Body(...), _user: dict = Depends(require_legal_acceptance)):
    """Generate a short Turkish title (4-6 words) for the given user message."""
    global client
    if not client:
        try:
            client = get_openai_client()
        except Exception:
            pass
    if not client:
        return {"title": ""}

    user_msg = sanitize_text(req.message)[:1500]
    prompt = (
        "Şu mesaj için 4-6 kelimelik kısa Türkçe başlık üret, "
        "sadece başlığı yaz, başka hiçbir şey yazma, tırnak kullanma:\n\n"
        f"{user_msg}"
    )
    try:
        completion = chat_completions_create(
            client,
            model="gpt-4o-mini",
            temperature=0.3,
            max_tokens=20,
            messages=[
                {"role": "system", "content": "Sen kısa Türkçe sohbet başlığı üretirsin."},
                {"role": "user", "content": prompt},
            ],
        )
        title = (completion.choices[0].message.content or "").strip().strip('"').strip("'")
        if len(title) > 32:
            title = title[:32].rstrip() + "…"
        return {"title": title}
    except Exception:
        return {"title": ""}



# =============================
# ROUTER REGISTRATION
# =============================
_LEGAL_ACCEPTANCE_DEPS = [Depends(require_legal_acceptance)]

if legal_router:
    app.include_router(legal_router)
if writer_router:
    app.include_router(writer_router, dependencies=_LEGAL_ACCEPTANCE_DEPS)
if assistant_router:
    app.include_router(assistant_router, dependencies=_LEGAL_ACCEPTANCE_DEPS)
if stats_router:
    app.include_router(stats_router, dependencies=_LEGAL_ACCEPTANCE_DEPS)
if risk_router:
    app.include_router(risk_router, dependencies=_LEGAL_ACCEPTANCE_DEPS)
if admin_router:
    # Admin API is exposed under both prefixes for backward-compat:
    #   /api/admin/* — preferred (used by the SPA + external clients)
    #   /admin/*     — legacy (still referenced by older tests/tools)
    # The two prefixes register the same handlers; keep tags separate so
    # OpenAPI docs group them clearly.
    app.include_router(admin_router, prefix="/api/admin", tags=["admin"])
    app.include_router(admin_router, prefix="/admin", tags=["admin-legacy"])
if calc_router:
    app.include_router(calc_router, dependencies=_LEGAL_ACCEPTANCE_DEPS)
if reports_router:
    app.include_router(reports_router, dependencies=_LEGAL_ACCEPTANCE_DEPS)
if yargitay_router:
    app.include_router(yargitay_router, dependencies=_LEGAL_ACCEPTANCE_DEPS)
if mevzuat_router:
    app.include_router(mevzuat_router, dependencies=_LEGAL_ACCEPTANCE_DEPS)
if uyap_udf_router:
    app.include_router(uyap_udf_router, dependencies=_LEGAL_ACCEPTANCE_DEPS)
if search_router:
    app.include_router(search_router, dependencies=_LEGAL_ACCEPTANCE_DEPS)
if reminder_router:
    app.include_router(reminder_router, dependencies=_LEGAL_ACCEPTANCE_DEPS)
if contract_router:
    app.include_router(contract_router, dependencies=_LEGAL_ACCEPTANCE_DEPS)
if notification_router:
    app.include_router(notification_router, dependencies=_LEGAL_ACCEPTANCE_DEPS)
if billing_router:
    app.include_router(billing_router, dependencies=_LEGAL_ACCEPTANCE_DEPS)
if feedback_router:
    app.include_router(feedback_router)
if analyze_router:
    app.include_router(analyze_router, dependencies=_LEGAL_ACCEPTANCE_DEPS)
if orchestrator_router:
    app.include_router(orchestrator_router, dependencies=_LEGAL_ACCEPTANCE_DEPS)
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

# Stripe Router
stripe_router = _safe_import("routes.stripe_router", "router")
if stripe_router:
    app.include_router(stripe_router)


# Admin Router (ensure it is included)
# Note: admin_router is already imported via _safe_import and included above with prefix="/admin"
# We don't need to re-import it unless _safe_import failed.

# CORS ayarlarının (allow_origins) frontend adresini (http://localhost:5173) kapsadığından emin ol.
