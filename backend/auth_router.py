from __future__ import annotations

import os
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional

import re
from fastapi import APIRouter, HTTPException, status, Request, Response
from pydantic import BaseModel, EmailStr, Field, validator

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    firstName: str = Field(min_length=1, max_length=64)
    lastName: str = Field(min_length=1, max_length=64)
    mode: Optional[str] = Field(default="single", max_length=16)
    discountCode: Optional[str] = Field(default=None, max_length=64)

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

# Use PostgreSQL Stores
from stores.pg_users_store import (
    create_user, find_user_by_email, update_user_login, 
    increment_failed_login, is_account_locked, reset_failed_login,
    create_session, revoke_session, is_session_valid,
    get_user_token_version, increment_token_version, log_audit
)

# ...

@router.post("/login")
def login(payload: LoginRequest, request: Request, response: Response) -> Dict[str, Any]:
    # ... (existing checks) ...
    
    # 2. Verify Credentials
    if user and verify_password(payload.password, user.get("password_hash") or user.get("hashed_password")):
        # Success
        ip = request.client.host
        ua = request.headers.get("user-agent")
        log_audit(str(user["id"]), "LOGIN_SUCCESS", "auth", None, ip, ua)
        reset_failed_login(user["id"])
        
        role = user.get("role", "user")
        tv = user.get("token_version", 1)
        
        access_token = create_access_token({"sub": email_norm, "role": role, "uid": str(user["id"]), "tv": tv})
        refresh_token = create_refresh_token({"sub": email_norm, "role": role, "fp": fingerprint, "uid": str(user["id"]), "tv": tv})
        
        # ... (rest of logic) ...

@router.post("/refresh")
def refresh(request: Request, response: Response) -> Dict[str, Any]:
    # ... (existing checks) ...
    
    # Check Token Version (Global Logout)
    user_id = payload.get("uid")
    token_tv = payload.get("tv", 0)
    current_tv = get_user_token_version(user_id)
    
    if token_tv < current_tv:
         raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Oturum sonlandırılmış (Global Logout).")

    # ... (rest of logic) ...
    
    new_access = create_access_token({"sub": email, "role": role, "uid": user_id, "tv": current_tv})
    new_refresh = create_refresh_token({"sub": email, "role": role, "fp": fingerprint, "uid": user_id, "tv": current_tv})
    
    # ... (rest of logic) ...

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
