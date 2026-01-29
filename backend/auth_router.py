from __future__ import annotations

import base64, hashlib, hmac, json, os, time
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, Response, Request, Body, Depends

router = APIRouter(prefix="/auth", tags=["auth"])

BASE_DIR = Path(__file__).resolve().parent
USERS_FILE = BASE_DIR / "data" / "admin" / "users_pool.json"

COOKIE_NAME = "mi_session"
SESSION_SECRET = os.getenv("SESSION_SECRET", "CHANGE_ME_NOW").encode("utf-8")
SESSION_TTL_SECONDS = int(os.getenv("SESSION_TTL_SECONDS", str(60 * 60 * 24 * 7)))  # 7 gün

def _read_users() -> list[dict]:
    if not USERS_FILE.exists():
        return []
    try:
        return json.loads(USERS_FILE.read_text(encoding="utf-8"))
    except Exception:
        return []

def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")

def _b64url_decode(s: str) -> bytes:
    pad = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode((s + pad).encode("utf-8"))

def _sign(payload_b64: str) -> str:
    sig = hmac.new(SESSION_SECRET, payload_b64.encode("utf-8"), hashlib.sha256).digest()
    return _b64url(sig)

def make_cookie_token(payload: Dict[str, Any]) -> str:
    payload_json = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    payload_b64 = _b64url(payload_json)
    sig_b64 = _sign(payload_b64)
    return f"{payload_b64}.{sig_b64}"

def verify_cookie_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        payload_b64, sig_b64 = token.split(".", 1)
        expected = _sign(payload_b64)
        if not hmac.compare_digest(expected, sig_b64):
            return None
        payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
        exp = int(payload.get("exp", 0))
        if exp <= int(time.time()):
            return None
        return payload
    except Exception:
        return None

def get_current_user(request: Request) -> Dict[str, Any]:
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = verify_cookie_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid session")
    return payload

@router.post("/login")
def login(
    response: Response,
    email: str = Body(...),
    password: str = Body(...),
):
    email_norm = (email or "").strip().lower()
    password_raw = (password or "")
    if not email_norm or not password_raw:
        raise HTTPException(status_code=400, detail="Email ve şifre gerekli.")

    users = _read_users()
    user = next((u for u in users if (u.get("email") or "").strip().lower() == email_norm), None)
    if not user:
        raise HTTPException(status_code=401, detail="Hatalı e-posta veya şifre.")
    # Şifre case-sensitive (istediğin gibi)
    if (user.get("password") or "") != password_raw:
        raise HTTPException(status_code=401, detail="Hatalı e-posta veya şifre.")

    now = int(time.time())
    payload = {
        "email": user.get("email"),
        "role": user.get("role", "user"),
        "iat": now,
        "exp": now + SESSION_TTL_SECONDS,
    }
    token = make_cookie_token(payload)

    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=True,        # prod'da şart (https)
        samesite="lax",     # login akışında yeterli, cross-site ihtiyacın varsa "none" + https gerekir
        path="/",
        max_age=SESSION_TTL_SECONDS,
    )
    return {"status": "ok"}

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key=COOKIE_NAME, path="/")
    return {"status": "ok"}

@router.get("/me")
def me(user: Dict[str, Any] = Depends(get_current_user)):
    return {"authed": True, "user": {"email": user["email"], "role": user.get("role", "user")}}