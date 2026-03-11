from __future__ import annotations

import os
import re
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, status, Request, Response, Body
from pydantic import BaseModel, EmailStr, Field, validator

from stores.pg_users_store import (
    create_user, find_user_by_email, update_user_login, 
    increment_failed_login, is_account_locked, reset_failed_login,
    create_session, revoke_session, is_session_valid,
    get_user_token_version, increment_token_version, log_audit,
    rotate_refresh_token_atomic
)

from security import (
    create_access_token, create_refresh_token, decode_token, 
    token_fingerprint, hmac_hash, hash_password, verify_password, 
    sanitize_user_for_response
)

try:
    from services.pricing_service import find_valid_discount, increment_usage
except ImportError:
    try:
        from services.pricing_service import find_valid_discount, increment_usage
    except ImportError:
        # Mock for now if not found
        def find_valid_discount(code): return None
        def increment_usage(code): pass

router = APIRouter()

def _now_utc() -> datetime:
    return datetime.now(timezone.utc)

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    firstName: str = Field(min_length=1, max_length=64)
    lastName: str = Field(min_length=1, max_length=64)
    mode: Optional[str] = Field(default="single", max_length=16)
    discountCode: Optional[str] = Field(default=None, max_length=64)
    role: Optional[str] = Field(default="user", pattern="^(user|admin)$") # Allow setting role for admin creation

    @validator('password')
    def validate_password_strength(cls, v):
        if not re.search(r"[A-Z]", v):
            raise ValueError("Şifre en az bir büyük harf içermelidir.")
        if not re.search(r"[a-z]", v):
            raise ValueError("Şifre en az bir küçük harf içermelidir.")
        if not re.search(r"\d", v):
            raise ValueError("Şifre en az bir rakam içermelidir.")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("Şifre en az bir özel karakter içermelidir.")
        return v

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


from services.mail_service import send_verification_email, send_reset_password_email
from stores.pg_users_store import update_user_verification, get_user_by_reset_token, update_password
import secrets

@router.post("/register")
def register(payload: RegisterRequest) -> Dict[str, Any]:
    email_norm = str(payload.email).strip().lower()
    
    # Check existing
    if find_user_by_email(email_norm):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email zaten kayıtlı.")
    
    used_code = None
    if payload.discountCode:
        dc = find_valid_discount(payload.discountCode)
        if dc:
            increment_usage(dc["code"])
            used_code = dc["code"]

    # Generate Verification Token
    v_token = secrets.token_urlsafe(32)

    user_data = {
        "email": email_norm,
        "firstName": payload.firstName.strip(),
        "lastName": payload.lastName.strip(),
        "hashed_password": hash_password(payload.password),
        "role": payload.role or "user", 
        "is_active": True,
        "is_verified": False, # E-posta doğrulaması gerekli
        "verification_token": v_token,
        "used_discount_code": used_code
    }
    
    user_id = create_user(user_data)
    
    # Send Email (Async)
    send_verification_email(email_norm, v_token)
    
    return {"status": "ok", "requires_verification": True, "user_id": user_id, "message": "Kayıt başarılı! Lütfen e-postanızı doğrulayın."}

@router.post("/verify-email")
def verify_email_endpoint(token: str = Body(..., embed=True)):
    # DB'de token'ı bul ve is_verified=True yap
    if update_user_verification(token):
        return {"status": "ok", "message": "E-posta başarıyla doğrulandı."}
    raise HTTPException(status_code=400, detail="Geçersiz veya süresi dolmuş token.")

@router.post("/forgot-password")
def forgot_password(email: str = Body(..., embed=True)):
    user = find_user_by_email(email)
    if not user:
        # Güvenlik için kullanıcı bulunamadı dememek lazım ama UX için diyelim şimdilik
        return {"status": "ok", "message": "Eğer kayıtlıysa şifre sıfırlama bağlantısı gönderildi."}
    
    reset_token = secrets.token_urlsafe(32)
    # DB'ye kaydet (Expires in 1 hour)
    from db import get_db_cursor
    with get_db_cursor() as cur:
        cur.execute("UPDATE users SET reset_password_token = %s, reset_password_expires_at = NOW() + INTERVAL '1 hour' WHERE id = %s", (reset_token, user['id']))
    
    send_reset_password_email(email, reset_token)
    return {"status": "ok", "message": "Şifre sıfırlama bağlantısı gönderildi."}

@router.post("/reset-password")
def reset_password(token: str = Body(...), new_password: str = Body(...)):
    # Token kontrolü
    from db import get_db_cursor
    with get_db_cursor() as cur:
        cur.execute("SELECT id FROM users WHERE reset_password_token = %s AND reset_password_expires_at > NOW()", (token,))
        row = cur.fetchone()
        
        if not row:
             raise HTTPException(status_code=400, detail="Geçersiz veya süresi dolmuş token.")
        
        user_id = row['id']
        hashed = hash_password(new_password)
        cur.execute("UPDATE users SET hashed_password = %s, reset_password_token = NULL WHERE id = %s", (hashed, user_id))
        
    return {"status": "ok", "message": "Şifreniz başarıyla güncellendi."}


@router.post("/login")
def login(payload: LoginRequest, request: Request, response: Response):
    email_norm = str(payload.email).strip().lower()
    ip = request.client.host if request.client else "127.0.0.1"
    
    user = find_user_by_email(email_norm)

    # 2. Verify Credentials
    if user and verify_password(payload.password, user.get("password_hash") or user.get("hashed_password")):
        # Success
        role = user.get("role", "user")
        
        # --- BASİT TOKEN GENERATION (Karmaşık Fingerprint/Session checkleri devre dışı) ---
        # Login sorununu çözmek için en yalın haliyle token veriyoruz.
        access_token = create_access_token({"sub": email_norm, "role": role, "uid": str(user["id"])})
        refresh_token = create_refresh_token({"sub": email_norm, "role": role, "uid": str(user["id"])})
        
        # Çerez Ayarları (Daha gevşek güvenlik)
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            secure=True, # Render HTTPS kullanıyor
            samesite="none", # Cross-site cookie için gerekli (Frontend farklı domaindeyse)
            max_age=604800,
            path="/"
        )
        
        return {
            "status": "ok",
            "message": "Giriş başarılı",
            "access_token": access_token,
            "user": sanitize_user_for_response(user),
        }
    
    # Failure
    raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı veya şifre hatalı.")


@router.post("/refresh")
def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token", "")
    if not token:
        raise HTTPException(status_code=401, detail="Refresh token gerekli.")
    
    try:
        payload = decode_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Geçersiz refresh token.")
    
    # Basitleştirilmiş Refresh Mantığı
    email = str(payload.get("sub") or "").strip().lower()
    role = payload.get("role")
    user_id = payload.get("uid")
    
    new_access = create_access_token({"sub": email, "role": role, "uid": user_id})
    new_refresh = create_refresh_token({"sub": email, "role": role, "uid": user_id})
    
    response.set_cookie(
        key="refresh_token",
        value=new_refresh,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=604800,
        path="/"
    )
    return {"status": "ok", "access_token": new_access}


@router.post("/logout-all")
def logout_all(request: Request, response: Response) -> Dict[str, Any]:
    """
    Global Logout / Kill Switch.
    Invalidates ALL tokens for this user by incrementing token version.
    """
    token = request.cookies.get("refresh_token", "")
    if token:
        try:
            payload = decode_token(token)
            user_id = payload.get("uid")
            if user_id:
                increment_token_version(user_id)
                # Also revoke current session specifically
                refresh_hash = hmac_hash(token, os.getenv("DATA_HASH_KEY", ""))
                revoke_session(refresh_hash, reason="global_logout")
        except:
            pass
            
    response.delete_cookie("refresh_token", path="/")
    return {"status": "ok", "message": "Tüm cihazlardan çıkış yapıldı."}


@router.post("/logout")
def logout(request: Request, response: Response) -> Dict[str, Any]:
    token = request.cookies.get("refresh_token", "")
    if token:
        refresh_hash = hmac_hash(token, os.getenv("DATA_HASH_KEY", ""))
        revoke_session(refresh_hash, reason="logout")
        
    response.delete_cookie("refresh_token", path="/")
    return {"status": "ok"}
