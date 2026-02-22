from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, status, Request, Response
from pydantic import BaseModel, EmailStr, Field

from stores.users_store import hash_password, verify_password, read_users, write_users, find_user_by_email
from stores.demo_users_store import read_demo_users, write_demo_users, purge_expired_demo_users
from security import create_access_token, create_refresh_token, decode_token, token_fingerprint, hmac_hash, sanitize_user_for_response
from backend.services.pricing_service import find_valid_discount, increment_usage

router = APIRouter()

def _now_utc() -> datetime:
    return datetime.now(timezone.utc)

def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
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
    users = read_users()
    if any(str(u.get("email","")).strip().lower() == email_norm for u in users):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email zaten kayıtlı.")
    
    used_code = None
    if payload.discountCode:
        dc = find_valid_discount(payload.discountCode)
        if dc:
            # Code is valid, consume it
            increment_usage(dc["code"])
            used_code = dc["code"]
        # If invalid, we ignore it or could raise error. 
        # Usually better to register anyway but warn? 
        # Or strict: if code provided but invalid -> fail?
        # User said "Prevent server crash under any invalid input".
        # Let's assume if code is invalid, just don't apply it, or maybe fail if user EXPECTS discount.
        # Frontend already validated price. If it became invalid in between, we might want to fail.
        # But let's keep it simple: if valid, use it.

    users.append({
        "email": email_norm,
        "firstName": payload.firstName.strip(),
        "lastName": payload.lastName.strip(),
        "hashed_password": hash_password(payload.password),
        "is_demo": False,
        "created_at": _iso(_now_utc()),
        "used_discount_code": used_code
    })
    write_users(users)
    return {"status": "ok", "requires_verification": False}


@router.post("/login")
def login(payload: LoginRequest, request: Request, response: Response) -> Dict[str, Any]:
    email_norm = str(payload.email).strip().lower()
    ip = request.client.host if request.client else ""
    ua = request.headers.get("user-agent", "")
    fingerprint = token_fingerprint(ua, ip)
    users = read_users()
    user = next((u for u in users if str(u.get("email","")).strip().lower() == email_norm), None)
    if user and verify_password(payload.password, user.get("hashed_password","")):
        access_token = create_access_token({"sub": email_norm, "role": user.get("role", "user")})
        refresh_token = create_refresh_token({"sub": email_norm, "role": user.get("role", "user"), "fp": fingerprint})
        user["refresh_token_hash"] = hmac_hash(refresh_token, os.getenv("DATA_HASH_KEY", ""))
        user["refresh_token_expires_at"] = _iso(_now_utc())
        user["refresh_token_fingerprint"] = fingerprint
        user["last_login_ip"] = ip
        user["last_login_ua"] = ua
        write_users(users)
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
    purge_expired_demo_users()
    demo_users = read_demo_users()
    du = next((d for d in demo_users if str(d.get("email","")).strip().lower() == email_norm), None)
    if du and verify_password(payload.password, du.get("hashed_password","")):
        access_token = create_access_token({"sub": email_norm, "role": "demo"})
        refresh_token = create_refresh_token({"sub": email_norm, "role": "demo", "fp": fingerprint})
        du["refresh_token_hash"] = hmac_hash(refresh_token, os.getenv("DATA_HASH_KEY", ""))
        du["refresh_token_expires_at"] = _iso(_now_utc())
        du["refresh_token_fingerprint"] = fingerprint
        du["last_login_ip"] = ip
        du["last_login_ua"] = ua
        write_demo_users(demo_users)
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
            "user": sanitize_user_for_response(du),
        }
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
    ip = request.client.host if request.client else ""
    ua = request.headers.get("user-agent", "")
    fingerprint = token_fingerprint(ua, ip)
    if payload.get("fp") != fingerprint:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Cihaz doğrulaması başarısız.")
    email = str(payload.get("sub") or "").strip().lower()
    role = payload.get("role")
    if role == "demo":
        users = read_demo_users()
    else:
        users = read_users()
    user = next((u for u in users if str(u.get("email","")).strip().lower() == email), None)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Kullanıcı bulunamadı.")
    stored_hash = str(user.get("refresh_token_hash") or "")
    if not stored_hash or stored_hash != hmac_hash(token, os.getenv("DATA_HASH_KEY", "")):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token geçersiz.")
    new_access = create_access_token({"sub": email, "role": role})
    new_refresh = create_refresh_token({"sub": email, "role": role, "fp": fingerprint})
    user["refresh_token_hash"] = hmac_hash(new_refresh, os.getenv("DATA_HASH_KEY", ""))
    user["refresh_token_expires_at"] = _iso(_now_utc())
    user["refresh_token_fingerprint"] = fingerprint
    if role == "demo":
        write_demo_users(users)
    else:
        write_users(users)
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
        try:
            payload = decode_token(token)
            email = str(payload.get("sub") or "").strip().lower()
            role = payload.get("role")
            if role == "demo":
                users = read_demo_users()
            else:
                users = read_users()
            user = next((u for u in users if str(u.get("email","")).strip().lower() == email), None)
            if user:
                user["refresh_token_hash"] = ""
                user["refresh_token_fingerprint"] = ""
                user["refresh_token_expires_at"] = ""
                if role == "demo":
                    write_demo_users(users)
                else:
                    write_users(users)
        except Exception:
            pass
    response.delete_cookie("refresh_token", path="/")
    return {"status": "ok"}
