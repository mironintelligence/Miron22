from __future__ import annotations

import os
import re
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, status, Request, Response, Body, Depends
from pydantic import BaseModel, EmailStr, Field, validator

from stores.pg_users_store import (
    create_user, find_user_by_email, update_user_login,
    increment_failed_login, is_account_locked, reset_failed_login,
    create_session, revoke_session, is_session_valid,
    get_user_token_version, increment_token_version, log_audit,
    rotate_refresh_token_atomic,
)

from security import (
    create_access_token, create_refresh_token, decode_token, 
    token_fingerprint, hmac_hash, hash_password, verify_password, 
    sanitize_user_for_response
)
from user_auth import get_current_user
from stores.pg_users_store import find_user_by_id
from legal_compliance import document_version_hash, luhn_valid, card_last_four

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

class ConsentPayload(BaseModel):
    saas: bool = False
    mss: bool = False
    preinfo: bool = False
    kvkk: bool = False


class CardPayload(BaseModel):
    number: str = Field(default="", max_length=32)
    exp_month: str = Field(default="", max_length=2)
    exp_year: str = Field(default="", max_length=4)
    cvc: str = Field(default="", max_length=4)


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    firstName: str = Field(min_length=1, max_length=64)
    lastName: str = Field(min_length=1, max_length=64)
    mode: Optional[str] = Field(default="single", pattern="^(single|demo)$", max_length=16)
    discountCode: Optional[str] = Field(default=None, max_length=64)
    role: Optional[str] = Field(default="user", pattern="^(user)$")
    consents: Optional[ConsentPayload] = None
    card: Optional[CardPayload] = None

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
from db import get_db_cursor


def _permissions_for_user_row(u: Dict[str, Any]) -> list:
    role = (u.get("role") or "user").lower()
    perms = ["app.use"]
    if role == "admin":
        perms.extend(["admin.all", "admin.export", "app.billing"])
    else:
        perms.append("app.billing")
    return list(dict.fromkeys(perms))


def _insert_legal_consents(user_id: str, ip: str) -> None:
    if (os.getenv("ENVIRONMENT") or "").lower() == "test" and (
        os.getenv("TEST_USE_INMEMORY_PG_STORE", "true") or ""
    ).lower() != "false":
        return
    with get_db_cursor() as cur:
        for t in ("SaaS", "MSS", "PREINFO", "KVKK"):
            cur.execute(
                """
                INSERT INTO legal_consents (user_id, ip_address, agreement_type, document_version_hash)
                VALUES (%s, %s, %s, %s)
                """,
                (user_id, ip, t, document_version_hash(t)),
            )


@router.post("/register")
def register(payload: RegisterRequest, request: Request) -> Dict[str, Any]:
    email_norm = str(payload.email).strip().lower()
    ip = request.client.host if request.client else "127.0.0.1"
    if ip == "testclient":
        ip = "127.0.0.1"

    if find_user_by_email(email_norm):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email zaten kayıtlı.")

    cp = payload.consents
    if not cp or not (cp.saas and cp.mss and cp.preinfo and cp.kvkk):
        raise HTTPException(status_code=400, detail="Dört yasal onay kutusu da işaretlenmelidir.")

    used_code = None
    if payload.discountCode:
        dc = find_valid_discount(payload.discountCode)
        if not dc:
            raise HTTPException(status_code=400, detail="Geçersiz veya süresi dolmuş indirim kodu.")
        increment_usage(dc["code"])
        used_code = dc["code"]

    role = "user"
    demo_expires_at = None
    if payload.mode == "demo":
        with get_db_cursor() as cur:
            cur.execute(
                "SELECT status, approved_until FROM demo_requests WHERE email = %s LIMIT 1",
                (email_norm,),
            )
            r = cur.fetchone()
            if not r or r.get("status") != "approved":
                raise HTTPException(status_code=403, detail="Demo hesabı için onay bekleniyor.")
            approved_until = r.get("approved_until")
            if not approved_until:
                raise HTTPException(status_code=403, detail="Demo hesabı için süre tanımlanmamış.")
            demo_expires_at = approved_until
            role = "demo"

    v_token = secrets.token_urlsafe(32)

    user_data = {
        "email": email_norm,
        "firstName": payload.firstName.strip(),
        "lastName": payload.lastName.strip(),
        "hashed_password": hash_password(payload.password),
        "role": "user",
        "is_active": True,
        "is_verified": False,
        "verification_token": v_token,
        "used_discount_code": used_code,
        "demo_expires_at": demo_expires_at,
    }
    user_data["role"] = role

    user_id = create_user(user_data)

    _insert_legal_consents(str(user_id), ip)

    if payload.mode == "single":
        if (os.getenv("ENVIRONMENT") or "").lower() != "test" or (
            os.getenv("TEST_USE_INMEMORY_PG_STORE", "true") or ""
        ).lower() == "false":
            with get_db_cursor() as cur:
                cur.execute(
                    """
                    UPDATE users SET payment_card_on_file = FALSE,
                    trial_ends_at = NOW() + interval '15 days'
                    WHERE id = %s
                    """,
                    (user_id,),
                )
    try:
        log_audit(
            str(user_id),
            "REGISTER_LEGAL_CONSENTS",
            "legal",
            {"card_last4": card_last_four(payload.card.number) if payload.card else None},
            ip,
            request.headers.get("user-agent", "unknown"),
        )
    except Exception:
        pass

    send_verification_email(email_norm, v_token)

    return {"status": "ok", "requires_verification": True, "user_id": user_id, "message": "Kayıt başarılı! Lütfen e-postanızı doğrulayın."}


class AttachPaymentIn(BaseModel):
    card: CardPayload


@router.post("/attach-payment")
def attach_payment(body: AttachPaymentIn, request: Request, user: Dict[str, Any] = Depends(get_current_user)):
    if not body.card or not luhn_valid(body.card.number):
        raise HTTPException(status_code=400, detail="Geçersiz kart.")
    uid = str(user.get("id"))
    ip = request.client.host if request.client else "127.0.0.1"
    if ip == "testclient":
        ip = "127.0.0.1"
    ua = request.headers.get("user-agent", "unknown")
    if (os.getenv("ENVIRONMENT") or "").lower() != "test" or (
        os.getenv("TEST_USE_INMEMORY_PG_STORE", "true") or ""
    ).lower() == "false":
        with get_db_cursor() as cur:
            cur.execute(
                """
                UPDATE users SET payment_card_on_file = TRUE,
                trial_ends_at = COALESCE(trial_ends_at, NOW() + interval '15 days')
                WHERE id = %s
                """,
                (uid,),
            )
    try:
        log_audit(uid, "ATTACH_PAYMENT_CARD", "billing", {"last4": card_last_four(body.card.number)}, ip, ua)
    except Exception:
        pass
    return {"status": "ok", "message": "Kart kaydedildi. 15 gün ücret alınmaz."}

@router.post("/verify-email")
def verify_email_endpoint(token: str = Body(..., embed=True)):
    # DB'de token'ı bul ve is_verified=True yap
    if update_user_verification(token):
        return {"status": "ok", "message": "E-posta başarıyla doğrulandı."}
    raise HTTPException(status_code=400, detail="Geçersiz veya süresi dolmuş token.")

@router.post("/forgot-password")
def forgot_password(email: str = Body(..., embed=True)):
    email_norm = (email or "").strip().lower()
    user = find_user_by_email(email_norm)
    if not user:
        # Güvenlik için kullanıcı bulunamadı dememek lazım ama UX için diyelim şimdilik
        return {"status": "ok", "message": "Eğer kayıtlıysa şifre sıfırlama bağlantısı gönderildi."}
    
    reset_token = secrets.token_urlsafe(32)
    # DB'ye kaydet (Expires in 1 hour)
    from db import get_db_cursor
    with get_db_cursor() as cur:
        cur.execute(
            "UPDATE users SET reset_password_token = %s, reset_password_expires_at = NOW() + INTERVAL '1 hour' WHERE id = %s",
            (reset_token, user["id"]),
        )
    
    send_reset_password_email(email, reset_token)
    return {"status": "ok", "message": "Şifre sıfırlama bağlantısı gönderildi."}

@router.post("/reset-password")
def reset_password(token: str = Body(...), new_password: str = Body(...)):
    if not token:
        raise HTTPException(status_code=400, detail="Token gerekli.")
    new_password = (new_password or "").strip()
    if not re.search(r"[A-Z]", new_password):
        raise HTTPException(status_code=400, detail="Şifre en az bir büyük harf içermelidir.")
    if not re.search(r"[a-z]", new_password):
        raise HTTPException(status_code=400, detail="Şifre en az bir küçük harf içermelidir.")
    if not re.search(r"\d", new_password):
        raise HTTPException(status_code=400, detail="Şifre en az bir rakam içermelidir.")
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", new_password):
        raise HTTPException(status_code=400, detail="Şifre en az bir özel karakter içermelidir.")

    u = get_user_by_reset_token(token)
    if not u:
        raise HTTPException(status_code=400, detail="Geçersiz veya süresi dolmuş token.")

    update_password(str(u["id"]), hash_password(new_password))
    return {"status": "ok", "message": "Şifreniz başarıyla güncellendi."}


@router.post("/login")
def login(payload: LoginRequest, request: Request, response: Response):
    email_norm = str(payload.email).strip().lower()
    ip = request.client.host if request.client else "127.0.0.1"
    if ip == "testclient":
        ip = "127.0.0.1"
    ua = request.headers.get("user-agent", "unknown")
    
    user = find_user_by_email(email_norm)

    if not user:
        raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı veya şifre hatalı.")

    if is_account_locked(email_norm):
        raise HTTPException(status_code=423, detail="Hesap geçici olarak kilitli. Lütfen daha sonra tekrar deneyin.")

    if user.get("is_active") is False:
        raise HTTPException(status_code=403, detail="Hesap askıya alındı.")

    if user.get("is_verified") is False:
        raise HTTPException(status_code=403, detail="E-posta doğrulanmamış.")

    if not verify_password(payload.password, user.get("password_hash") or user.get("hashed_password")):
        increment_failed_login(email_norm)
        raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı veya şifre hatalı.")

    reset_failed_login(str(user["id"]))

    role = user.get("role", "user")
    uid = str(user["id"])
    tv = get_user_token_version(uid)
    access_token = create_access_token({"sub": email_norm, "role": role, "uid": uid, "tv": tv})
    refresh_token = create_refresh_token({"sub": email_norm, "role": role, "uid": uid, "tv": tv})

    refresh_hash = hmac_hash(refresh_token, os.getenv("DATA_HASH_KEY", ""))
    fingerprint = token_fingerprint(ua, ip)
    update_user_login(uid, ip, refresh_hash)
    create_session(
        user_id=uid,
        refresh_hash=refresh_hash,
        fingerprint=fingerprint,
        ip=ip,
        ua=ua,
        expires_at=_now_utc() + timedelta(days=7),
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=604800,
        path="/",
    )

    return {
        "status": "ok",
        "message": "Giriş başarılı",
        "access_token": access_token,
        "user": sanitize_user_for_response(user),
    }


@router.post("/refresh")
def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token", "")
    if not token:
        raise HTTPException(status_code=401, detail="Refresh token gerekli.")
    
    try:
        payload = decode_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Geçersiz refresh token.")
    
    email = str(payload.get("sub") or "").strip().lower()
    role = payload.get("role")
    user_id = payload.get("uid")
    tv = payload.get("tv")
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Geçersiz refresh token.")
    if not user_id or tv is None:
        raise HTTPException(status_code=401, detail="Geçersiz refresh token.")

    current_tv = get_user_token_version(str(user_id))
    if int(tv) != int(current_tv):
        response.delete_cookie("refresh_token", path="/")
        raise HTTPException(status_code=401, detail="Oturum geçersiz.")

    old_hash = hmac_hash(token, os.getenv("DATA_HASH_KEY", ""))
    if not rotate_refresh_token_atomic(old_hash, reason="rotation"):
        response.delete_cookie("refresh_token", path="/")
        raise HTTPException(status_code=401, detail="Oturum geçersiz.")
    
    new_access = create_access_token({"sub": email, "role": role, "uid": str(user_id), "tv": int(tv)})
    new_refresh = create_refresh_token({"sub": email, "role": role, "uid": str(user_id), "tv": int(tv)})
    
    response.set_cookie(
        key="refresh_token",
        value=new_refresh,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=604800,
        path="/"
    )
    ip = request.client.host if request.client else "127.0.0.1"
    if ip == "testclient":
        ip = "127.0.0.1"
    ua = request.headers.get("user-agent", "unknown")
    new_hash = hmac_hash(new_refresh, os.getenv("DATA_HASH_KEY", ""))
    fingerprint = token_fingerprint(ua, ip)
    create_session(
        user_id=str(user_id),
        refresh_hash=new_hash,
        fingerprint=fingerprint,
        ip=ip,
        ua=ua,
        expires_at=_now_utc() + timedelta(days=7),
    )
    return {"status": "ok", "access_token": new_access}


@router.get("/me")
def me(user: Dict[str, Any] = Depends(get_current_user)):
    u = find_user_by_id(str(user.get("id")))
    if not u:
        raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı.")
    su = sanitize_user_for_response(u)
    su["permissions"] = _permissions_for_user_row(u)
    return {"status": "ok", "user": su}


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
