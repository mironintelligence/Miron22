from __future__ import annotations

import os
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, status, Request, Response
from pydantic import BaseModel, EmailStr, Field

# Use PostgreSQL Stores
from stores.pg_users_store import (
    create_user, find_user_by_email, update_user_login, 
    increment_failed_login, is_account_locked, reset_failed_login,
    create_session, revoke_session, is_session_valid
)

from security import (
    create_access_token, create_refresh_token, decode_token, 
    token_fingerprint, hmac_hash, hash_password, verify_password, 
    sanitize_user_for_response
)

# Pricing Service (Keep existing logic if needed, but ensure it works with PG if it uses stores)
# For now, we assume pricing service is independent or we might need to refactor it later.
# The user instruction was "Update auth_router.py to use PostgreSQL store".
try:
    from backend.services.pricing_service import find_valid_discount, increment_usage
except ImportError:
    from services.pricing_service import find_valid_discount, increment_usage

router = APIRouter()

def _now_utc() -> datetime:
    return datetime.now(timezone.utc)

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12, max_length=128) # Increased min length
    firstName: str = Field(min_length=1, max_length=64)
    lastName: str = Field(min_length=1, max_length=64)
    mode: Optional[str] = Field(default="single", max_length=16)
    discountCode: Optional[str] = Field(default=None, max_length=64)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


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

    user_data = {
        "email": email_norm,
        "firstName": payload.firstName.strip(),
        "lastName": payload.lastName.strip(),
        "hashed_password": hash_password(payload.password),
        "role": "user", # Default role
        "is_active": True,
        "used_discount_code": used_code
    }
    
    user_id = create_user(user_data)
    
    return {"status": "ok", "requires_verification": False, "user_id": user_id}


@router.post("/login")
def login(payload: LoginRequest, request: Request, response: Response) -> Dict[str, Any]:
    email_norm = str(payload.email).strip().lower()
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "unknown")
    fingerprint = token_fingerprint(ua, ip)
    
    # 1. Check Account Lockout
    if is_account_locked(email_norm):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS, 
            detail="Çok fazla başarısız giriş denemesi. Hesabınız 15 dakika kilitlendi."
        )

    user = find_user_by_email(email_norm)
    
    # 2. Verify Credentials
    if user and verify_password(payload.password, user.get("password_hash") or user.get("hashed_password")):
        # Success
        reset_failed_login(user["id"])
        
        role = user.get("role", "user")
        access_token = create_access_token({"sub": email_norm, "role": role, "uid": str(user["id"])})
        refresh_token = create_refresh_token({"sub": email_norm, "role": role, "fp": fingerprint, "uid": str(user["id"])})
        
        refresh_hash = hmac_hash(refresh_token, os.getenv("DATA_HASH_KEY", ""))
        
        # Update User Stats
        update_user_login(user["id"], ip, refresh_hash)
        
        # Create Session
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=int(os.getenv("REFRESH_TOKEN_TTL_SECONDS", "1209600")))
        create_session(user["id"], refresh_hash, fingerprint, ip, ua, expires_at)
        
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            secure=True,
            samesite="strict",
            max_age=int(os.getenv("REFRESH_TOKEN_TTL_SECONDS", "1209600")),
            path="/",
        )
        
        return {
            "status": "ok",
            "message": "Giriş başarılı",
            "access_token": access_token,
            "user": sanitize_user_for_response(user),
        }
    
    # Failure
    increment_failed_login(email_norm)
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Kullanıcı bulunamadı veya şifre hatalı.")


@router.post("/refresh")
def refresh(request: Request, response: Response) -> Dict[str, Any]:
    token = request.cookies.get("refresh_token", "")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token gerekli.")
    
    try:
        payload = decode_token(token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Geçersiz refresh token.")
    
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Geçersiz token türü.")
    
    # Fingerprint Check
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "unknown")
    fingerprint = token_fingerprint(ua, ip)
    
    if payload.get("fp") != fingerprint:
        # Possible token theft!
        # Revoke session immediately?
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Cihaz doğrulaması başarısız. Lütfen tekrar giriş yapın.")
    
    refresh_hash = hmac_hash(token, os.getenv("DATA_HASH_KEY", ""))
    
    # Check DB Session
    if not is_session_valid(refresh_hash):
         raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Oturum geçersiz veya sonlandırılmış.")

    # Rotation: Revoke Old -> Issue New
    revoke_session(refresh_hash, reason="rotation")
    
    email = str(payload.get("sub") or "").strip().lower()
    role = payload.get("role")
    user_id = payload.get("uid")
    
    new_access = create_access_token({"sub": email, "role": role, "uid": user_id})
    new_refresh = create_refresh_token({"sub": email, "role": role, "fp": fingerprint, "uid": user_id})
    new_refresh_hash = hmac_hash(new_refresh, os.getenv("DATA_HASH_KEY", ""))
    
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=int(os.getenv("REFRESH_TOKEN_TTL_SECONDS", "1209600")))
    create_session(user_id, new_refresh_hash, fingerprint, ip, ua, expires_at)
    
    # Update User Record (Optional, mostly for quick lookup)
    update_user_login(user_id, ip, new_refresh_hash)

    response.set_cookie(
        key="refresh_token",
        value=new_refresh,
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=int(os.getenv("REFRESH_TOKEN_TTL_SECONDS", "1209600")),
        path="/",
    )
    return {"status": "ok", "access_token": new_access}


@router.post("/logout")
def logout(request: Request, response: Response) -> Dict[str, Any]:
    token = request.cookies.get("refresh_token", "")
    if token:
        refresh_hash = hmac_hash(token, os.getenv("DATA_HASH_KEY", ""))
        revoke_session(refresh_hash, reason="logout")
        
    response.delete_cookie("refresh_token", path="/")
    return {"status": "ok"}
