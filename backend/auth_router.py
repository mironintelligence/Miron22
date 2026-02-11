from __future__ import annotations

import json
import os
import secrets
import smtplib
from datetime import datetime, timezone
from email.message import EmailMessage
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr, Field

try:
    from backend.auth import get_supabase_client
except Exception:
    from auth import get_supabase_client

router = APIRouter()

DATA_DIR = Path(os.getenv("DATA_DIR") or "data")
DATA_DIR.mkdir(parents=True, exist_ok=True)
VERIFICATION_FILE = DATA_DIR / "email_verification.json"


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()


def _load_verification() -> Dict[str, Any]:
    if not VERIFICATION_FILE.exists():
        return {}
    try:
        with VERIFICATION_FILE.open("r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, dict):
                return data
            return {}
    except Exception:
        return {}


def _save_verification(data: Dict[str, Any]) -> None:
    VERIFICATION_FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp = VERIFICATION_FILE.with_suffix(".tmp")
    try:
        with tmp.open("w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, VERIFICATION_FILE)
    finally:
        if tmp.exists():
            try:
                tmp.unlink()
            except Exception:
                pass


def _send_verification_email(to_email: str, token: str) -> None:
    backend_base = os.getenv("BACKEND_BASE_URL") or "https://miron22.onrender.com"
    verify_url = f"{backend_base.rstrip('/')}/api/auth/verify-email?token={token}"
    subject = "Miron AI e-posta doğrulama"
    body = (
        "Merhaba,\n\n"
        "Miron AI hesabınızı aktifleştirmek için aşağıdaki bağlantıya tıklayın:\n\n"
        f"{verify_url}\n\n"
        "Eğer bu işlemi siz başlatmadıysanız, bu e-postayı yok sayabilirsiniz.\n\n"
        "Miron AI"
    )

    host = os.getenv("SMTP_HOST")
    port = int(os.getenv("SMTP_PORT") or "587")
    username = os.getenv("SMTP_USERNAME")
    password = os.getenv("SMTP_PASSWORD")
    use_tls = (os.getenv("SMTP_USE_TLS") or "true").strip().lower() == "true"
    sender = os.getenv("EMAIL_FROM") or username

    if not host or not username or not password or not sender:
        return

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = to_email
    msg.set_content(body)

    if use_tls:
        with smtplib.SMTP(host, port) as s:
            s.starttls()
            s.login(username, password)
            s.send_message(msg)
    else:
        with smtplib.SMTP(host, port) as s:
            s.login(username, password)
            s.send_message(msg)


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    firstName: str = Field(min_length=1, max_length=64)
    lastName: str = Field(min_length=1, max_length=64)
    mode: Optional[str] = Field(default="single", max_length=16)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


def _to_dict(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, dict):
        return {k: _to_dict(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_to_dict(v) for v in value]
    dump = getattr(value, "model_dump", None)
    if callable(dump):
        try:
            return _to_dict(dump())
        except Exception:
            pass
    as_dict = getattr(value, "dict", None)
    if callable(as_dict):
        try:
            return _to_dict(as_dict())
        except Exception:
            pass
    d = getattr(value, "__dict__", None)
    if isinstance(d, dict):
        return _to_dict({k: v for k, v in d.items() if not k.startswith("_")})
    return str(value)


@router.post("/register")
def register(payload: RegisterRequest) -> Dict[str, Any]:
    client = get_supabase_client()
    mode = (payload.mode or "single").strip().lower()
    meta: Dict[str, Any] = {}
    if payload.firstName:
        meta["first_name"] = payload.firstName
    if payload.lastName:
        meta["last_name"] = payload.lastName

    try:
        resp = client.auth.sign_up(
            {
                "email": str(payload.email),
                "password": payload.password,
                "options": {"data": meta} if meta else {},
            }
        )
    except Exception as e:
        msg = str(e) or "Kayıt başarısız."
        code = status.HTTP_400_BAD_REQUEST
        if "already" in msg.lower() or "registered" in msg.lower():
            code = status.HTTP_409_CONFLICT
        raise HTTPException(status_code=code, detail=msg)

    data = _to_dict(resp) or {}
    user = data.get("user") or (data.get("data") or {}).get("user") or {}
    user = _to_dict(user) or {}
    email_norm = str(payload.email).strip().lower()

    if mode == "single":
        store = _load_verification()
        token = secrets.token_urlsafe(32)
        store[email_norm] = {
            "email": email_norm,
            "token": token,
            "mode": mode,
            "verified": False,
            "created_at": _iso(_now_utc()),
            "verified_at": None,
        }
        _save_verification(store)
        _send_verification_email(str(payload.email), token)
        requires_verification = True
    else:
        store = _load_verification()
        if email_norm in store:
            store.pop(email_norm, None)
            _save_verification(store)
        requires_verification = False

    return {"status": "ok", "user": user, "requires_verification": requires_verification}


@router.post("/login")
def login(payload: LoginRequest) -> Dict[str, Any]:
    client = get_supabase_client()
    try:
        resp = client.auth.sign_in_with_password(
            {"email": str(payload.email), "password": payload.password}
        )
    except Exception as e:
        msg = str(e) or "Giriş başarısız."
        code = status.HTTP_401_UNAUTHORIZED
        if "invalid" in msg.lower() or "credentials" in msg.lower():
            code = status.HTTP_401_UNAUTHORIZED
        elif "rate" in msg.lower():
            code = status.HTTP_429_TOO_MANY_REQUESTS
        raise HTTPException(status_code=code, detail=msg)

    data = _to_dict(resp) or {}
    session = data.get("session") or (data.get("data") or {}).get("session") or {}
    user = data.get("user") or (data.get("data") or {}).get("user") or {}

    session = _to_dict(session) or {}
    user = _to_dict(user) or {}
    token = session.get("access_token") or data.get("access_token") or None

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="JWT token alınamadı.",
        )

    email_norm = str(user.get("email") or payload.email).strip().lower()
    store = _load_verification()
    info = store.get(email_norm)
    if info and not info.get("verified"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email first.",
        )

    return {
        "status": "ok",
        "message": "Giriş başarılı",
        "token": token,
        "user": user,
        "expires_in": session.get("expires_in"),
        "token_type": session.get("token_type"),
        "refresh_token": session.get("refresh_token"),
    }


@router.get("/verify-email")
def verify_email(token: str) -> RedirectResponse:
    token = (token or "").strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing token")

    store = _load_verification()
    email_match = None
    info_match: Optional[Dict[str, Any]] = None
    for email, info in store.items():
        if info.get("token") == token:
            email_match = email
            info_match = dict(info)
            break

    if not email_match or not info_match:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired token")

    info_match["verified"] = True
    info_match["verified_at"] = _iso(_now_utc())
    info_match["token"] = None
    store[email_match] = info_match
    _save_verification(store)

    frontend_base = os.getenv("FRONTEND_BASE_URL") or "https://miron22.vercel.app"
    redirect_url = f"{frontend_base.rstrip('/')}/login?verified=1"
    return RedirectResponse(url=redirect_url)
