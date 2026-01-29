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

# OpenAI error types (sürüm uyumlu)
try:
    from openai import AuthenticationError, BadRequestError, RateLimitError, APIateLimitError, APIConnectionError, APIStatusError
except Exception:
    AuthenticationError = BadRequestError = RateLimitError = APIConnectionError = APIStatusError = Exception

OPENAI_API_KEY = get_openai_api_key()
print("OPENAI_API_KEY present:", bool(OPENAI_API_KEY), "tail:", OPENAI_API_KEY[-6:] if OPENAI_API_KEY else "NONE")
client = get_openai_client()

# ---------------------------
# APP
# ---------------------------
app = FastAPI(title="Libra AI Backend", version="1.4.0")

# ---------------------------
# CORS
# ---------------------------
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()


# CORS: prod'da whitelist ver
allowed = os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:5173,http://localhost:5174")
origins = [x.strip() for x in allowed.split(",") if x.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


auth_router      = _safe_import("routes.auth_routes", "router")
pool_router      = _safe_import("routes.users_pool", "router")
assistant_router = _safe_import("assistant_routes", "router")
writer_router    = _safe_import("legal_writer", "writer_router")
stats_router     = _safe_import("stats_router", "stats_router")
risk_router      = _safe_import("risk_router", "router")
demo_router      = _safe_import("demo_router", "router")
calc_router      = _safe_import("calculators", "router")
reports_router   = _safe_import("reports", "router")
yargitay_router  = _safe_import("yargitay_search", "router")
mevzuat_router   = _safe_import("mevzuat_search", "router")
uyap_udf_router  = _safe_import("uyap_udf", "router")
billing_router   = _safe_import("routes.billing_routes", "router")
feedback_router  = _safe_import("routes.feedback_routes", "router")
admin_api_router = _safe_import("admin_router", "api_router")
admin_router     = _safe_import("admin_router", "router")

# ---------------------------
# ROOT
# ---------------------------
@app.get("/")
def root():
    return {"status": "ok", "msg": "Libra AI Backend çalışıyor!"}

# =============================
# EVRAK ANALİZ
# =============================
def smart_format(text: str, filename: str, dava_turu: str):
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
📄 Dosya Adı: {filename}

---

⚖ Dava Türü: {dava_turu}

---

📘 Dava Özeti:
{summary}

---

🧾 Taraflar:
{chr(10).join(f"- {t}" for t in taraflar[:12])}

---

📚 Olaylar ve Olgular:
{chr(10).join(f"- {o}" for o in olaylar[:12])}

---

📑 Hukuki Değerlendirme:
{chr(10).join(f"- {h}" for h in hukuki[:12])}

---

📘 Dayanak Maddeler:
{chr(10).join(f"- {d}" for d in dayanak[:12])}

---
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
SESSIONS_DIR = BASE_DIR / "sessions"
SESSIONS_DIR.mkdir(parents=True, exist_ok=True)

class ChatRequest(BaseModel):
    chat_id: Optional[str] = None
    message: str = Field(..., min_length=1)
    context: Optional[str] = None

SYSTEM_PROMPT = """
Senin adın *Libra Assistant*.
Türkiye’de aktif çalışan profesyonel bir avukat yapay zekâ asistanısın.

Kurallar:
- Kullanıcı hukuki soru sormuyorsa SADECE kısa cevap ver.
- Kullanıcı “adın ne / kimsin” derse AYNEN şöyle cevap ver:
  “Ben Libra Assistant. Türkiye hukukuna uygun şekilde hukuki analiz ve strateji üretmek için buradayım.”
- Hukuki sorularda: başlık + maddeler, kısa net.

Hukuki yanıt formatı:

### 📌 Konunun Özeti
- 1–3 cümle

### ⚖ Hukuki Değerlendirme
- Madde madde

### 🧾 Olası Haklar ve Talepler
- Madde madde

### 🧠 Stratejik Öneriler
- Delil/evrak/hamle önerileri

### 📚 İlgili Mevzuat
- Sadece gerçekten ilgili maddeler
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
        # .env yanlışsa burada patlar
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY eksik/boş ya da client oluşturulamadı.")

    chat_id = _sanitize_chat_id(req.chat_id)
    user_text = req.message.strip()
    context = (req.context or "").strip()

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if context:
        messages.append({"role": "system", "content": f"Dava/Dosya Bağlamı (özet):\n{context}"})
    messages.append({"role": "user", "content": user_text})

    try:
        completion = _run_llm(messages)
        reply = (completion.choices[0].message.content or "").strip()

        session_path = SESSIONS_DIR / f"{chat_id}.txt"
        with open(session_path, "a", encoding="utf-8") as f:
            f.write(f"User: {user_text}\nAssistant: {reply}\n\n")

        return {"reply": reply, "chat_id": chat_id}

    except AuthenticationError as e:
        # SENDEKİ HATA BU: invalid_api_key
        raise HTTPException(status_code=401, detail=f"OpenAI auth failed: {str(e)}")

    except RateLimitError as e:
        raise HTTPException(status_code=429, detail=f"OpenAI rate limit: {str(e)}")

    except APIConnectionError as e:
        raise HTTPException(status_code=503, detail=f"OpenAI connection error: {str(e)}")

    except (BadRequestError, APIStatusError) as e:
        code = getattr(e, "status_code", 400)
        raise HTTPException(status_code=int(code), detail=f"OpenAI API error: {str(e)}")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Assistant error: {repr(e)}")



from fastapi.routing import APIRoute

@app.get("/__routes")
def __routes():
    return sorted([
        {"path": r.path, "methods": sorted(list(r.methods or []))}
        for r in app.routes
        if isinstance(r, APIRoute)
    ], key=lambda x: x["path"])



# =============================
# ROUTER REGISTRATION
# =============================
if auth_router:     app.include_router(auth_router)
if writer_router:   app.include_router(writer_router)
if assistant_router: app.include_router(assistant_router)
if stats_router:    app.include_router(stats_router)
if risk_router:     app.include_router(risk_router)
if admin_router:    app.include_router(admin_router, prefix="/admin")
if pool_router:     app.include_router(pool_router)
if demo_router:     app.include_router(demo_router)
if calc_router:     app.include_router(calc_router)
if reports_router:  app.include_router(reports_router)
if yargitay_router: app.include_router(yargitay_router)
if mevzuat_router:  app.include_router(mevzuat_router)
if uyap_udf_router: app.include_router(uyap_udf_router)
if billing_router:  app.include_router(billing_router)
if feedback_router: app.include_router(feedback_router)
if admin_api_router: app.include_router(admin_api_router)                   






from routers.users_pool import router as userpool_router
import demo_router

app.include_router(userpool_router)
app.include_router(demo_router.router)


from routes.auth_routes import router as auth_router
app.include_router(auth_router)


from admin_router import router as admin_router

app.include_router(admin_router)


from admin_router import router as admin_router
app.include_router(admin_router)

