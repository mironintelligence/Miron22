from __future__ import annotations

import json
import os
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, status, Request, Body, Depends, Response
from pydantic import BaseModel, EmailStr, Field, validator

from stores.pg_users_store import (
    create_session,
    create_user,
    find_user_by_email,
    find_user_by_id,
    get_user_token_version,
    increment_failed_login,
    is_account_locked,
    log_audit,
    reset_failed_login,
    revoke_session,
    rotate_refresh_token_atomic,
    update_password,
    update_user_fields_by_id,
    update_user_login,
    update_user_verification,
    get_user_by_reset_token,
)
from security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hmac_hash,
    hash_password,
    sanitize_user_for_response,
    token_fingerprint,
    verify_password,
)
from user_auth import get_current_user
from legal_compliance import document_version_hash, luhn_valid, card_last_four

try:
    from services.pricing_service import find_valid_discount, increment_usage
except ImportError:
    try:
        from services.pricing_service import find_valid_discount, increment_usage
    except ImportError:

        def find_valid_discount(code):
            return None

        def increment_usage(code):
            pass


router = APIRouter()


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


class CompleteRegistrationRequest(BaseModel):
    firstName: str = Field(min_length=1, max_length=64)
    lastName: str = Field(min_length=1, max_length=64)
    mode: Optional[str] = Field(default="single", pattern="^(single|demo)$", max_length=16)
    discountCode: Optional[str] = Field(default=None, max_length=64)
    consents: ConsentPayload
    card: Optional[CardPayload] = None


import secrets
from db import get_db_cursor
from services.mail_service import send_reset_password_email


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


@router.post("/complete-registration")
def complete_registration(
    payload: CompleteRegistrationRequest,
    request: Request,
    user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    uid = str(user.get("id") or "")
    if not uid:
        raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı.")
    u = find_user_by_id(uid)
    if not u:
        raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı.")

    ip = request.client.host if request.client else "127.0.0.1"
    if ip == "testclient":
        ip = "127.0.0.1"

    cp = payload.consents
    if not cp or not (cp.saas and cp.mss and cp.preinfo and cp.kvkk):
        raise HTTPException(status_code=400, detail="Dört yasal onay kutusu da işaretlenmelidir.")

    email_norm = str(u.get("email") or user.get("email") or "").strip().lower()
    if not email_norm:
        raise HTTPException(status_code=400, detail="Hesapta e-posta tanımlı değil.")

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

    payment_on_file = bool(payload.card and payload.card.number and luhn_valid(payload.card.number))

    fields: Dict[str, Any] = {
        "first_name": payload.firstName.strip(),
        "last_name": payload.lastName.strip(),
        "role": role,
        "payment_card_on_file": payment_on_file,
    }
    if used_code:
        fields["used_discount_code"] = used_code
    if demo_expires_at is not None:
        fields["demo_expires_at"] = demo_expires_at

    if payload.mode == "single":
        fields["trial_ends_at"] = datetime.now(timezone.utc) + timedelta(days=15)

    if not update_user_fields_by_id(uid, fields):
        raise HTTPException(status_code=500, detail="Profil güncellenemedi.")

    if payload.mode == "single":
        if (os.getenv("ENVIRONMENT") or "").lower() != "test" or (
            os.getenv("TEST_USE_INMEMORY_PG_STORE", "true") or ""
        ).lower() == "false":
            with get_db_cursor() as cur:
                cur.execute(
                    """
                    UPDATE users SET trial_ends_at = COALESCE(trial_ends_at, NOW() + interval '15 days')
                    WHERE id = %s
                    """,
                    (uid,),
                )

    try:
        _insert_legal_consents(uid, ip)
    except Exception:
        pass

    try:
        log_audit(
            uid,
            "COMPLETE_REGISTRATION",
            "legal",
            {"card_last4": card_last_four(payload.card.number) if payload.card else None},
            ip,
            request.headers.get("user-agent", "unknown"),
        )
    except Exception:
        pass

    return {
        "status": "ok",
        "message": "Kayıt bilgileriniz kaydedildi.",
    }


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
    if update_user_verification(token):
        return {"status": "ok", "message": "E-posta başarıyla doğrulandı."}
    raise HTTPException(status_code=400, detail="Geçersiz veya süresi dolmuş token.")


@router.post("/forgot-password")
def forgot_password(email: str = Body(..., embed=True)):
    email_norm = (email or "").strip().lower()
    user = find_user_by_email(email_norm)
    if not user:
        return {"status": "ok", "message": "Eğer kayıtlıysa şifre sıfırlama bağlantısı gönderildi."}

    reset_token = secrets.token_urlsafe(32)
    with get_db_cursor() as cur:
        cur.execute(
            "UPDATE users SET reset_password_token = %s, reset_password_expires_at = NOW() + INTERVAL '1 hour' WHERE id = %s",
            (reset_token, user["id"]),
        )

    send_reset_password_email(email, reset_token)
    return {"status": "ok", "message": "Şifre sıfırlama bağlantısı gönderildi."}


class ResetPasswordBody(BaseModel):
    token: str
    new_password: str

    @validator("new_password")
    def validate_password_strength(cls, v):
        new_password = (v or "").strip()
        if not re.search(r"[A-Z]", new_password):
            raise ValueError("Şifre en az bir büyük harf içermelidir.")
        if not re.search(r"[a-z]", new_password):
            raise ValueError("Şifre en az bir küçük harf içermelidir.")
        if not re.search(r"\d", new_password):
            raise ValueError("Şifre en az bir rakam içermelidir.")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", new_password):
            raise ValueError("Şifre en az bir özel karakter içermelidir.")
        return new_password


@router.post("/reset-password")
def reset_password_endpoint(body: ResetPasswordBody):
    if not body.token:
        raise HTTPException(status_code=400, detail="Token gerekli.")

    u = get_user_by_reset_token(body.token)
    if not u:
        raise HTTPException(status_code=400, detail="Geçersiz veya süresi dolmuş token.")

    update_password(str(u["id"]), hash_password(body.new_password))
    return {"status": "ok", "message": "Şifreniz başarıyla güncellendi."}


def _client_ip(request: Request) -> str:
    ip = request.client.host if request.client else "127.0.0.1"
    if ip == "testclient":
        ip = "127.0.0.1"
    return ip


def _cookie_secure() -> bool:
    explicit = (os.getenv("COOKIE_SECURE") or "").strip().lower()
    if explicit in ("1", "true", "yes"):
        return True
    if explicit in ("0", "false", "no"):
        return False
    env = (os.getenv("ENVIRONMENT") or "").lower()
    return env in ("production", "prod", "staging")


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    secure = _cookie_secure()
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=secure,
        samesite="none" if secure else "lax",
        max_age=7 * 24 * 3600,
        path="/",
    )


def _clear_refresh_cookie(response: Response) -> None:
    secure = _cookie_secure()
    response.delete_cookie(
        key="refresh_token",
        path="/",
        secure=secure,
        httponly=True,
        samesite="none" if secure else "lax",
    )


def _user_for_client(u: Dict[str, Any]) -> Dict[str, Any]:
    su = sanitize_user_for_response(u)
    su["firstName"] = str(su.get("first_name") or su.get("firstName") or "")
    su["lastName"] = str(su.get("last_name") or su.get("lastName") or "")
    return su


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    firstName: str = Field(default="", max_length=64)
    lastName: str = Field(default="", max_length=64)
    mode: Optional[str] = None
    discountCode: Optional[str] = None
    consents: Optional[Dict[str, Any]] = None
    card: Optional[Dict[str, Any]] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=256)
    firstName: Optional[str] = Field(default="", max_length=64)
    lastName: Optional[str] = Field(default="", max_length=64)


@router.post("/register")
def register_account(payload: RegisterRequest, request: Request):
    email_norm = str(payload.email).strip().lower()
    if find_user_by_email(email_norm):
        raise HTTPException(status_code=409, detail="Bu e-posta zaten kayıtlı.")
    fn = (payload.firstName or "").strip()
    ln = (payload.lastName or "").strip()
    create_user(
        {
            "email": email_norm,
            "hashed_password": hash_password(payload.password),
            "firstName": fn,
            "lastName": ln,
            "role": "user",
            "is_active": True,
            "is_verified": True,
        }
    )
    ip = _client_ip(request)
    ua = request.headers.get("user-agent", "unknown")
    try:
        log_audit(None, "USER_REGISTER", email_norm, {"email": email_norm}, ip, ua)
    except Exception:
        pass
    return {"status": "ok", "message": "Kayıt oluşturuldu."}


@router.post("/login")
def login_account(payload: LoginRequest, request: Request, response: Response):
    email_norm = str(payload.email).strip().lower()
    ip = _client_ip(request)
    ua = request.headers.get("user-agent", "unknown")

    user = find_user_by_email(email_norm)
    if not user:
        raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı veya şifre hatalı.")

    if is_account_locked(email_norm):
        raise HTTPException(status_code=423, detail="Hesap geçici olarak kilitli. Lütfen daha sonra tekrar deneyin.")

    if user.get("is_active") is False:
        raise HTTPException(status_code=403, detail="Hesap askıya alındı.")

    if not verify_password(payload.password, user.get("password_hash") or user.get("hashed_password")):
        increment_failed_login(email_norm)
        raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı veya şifre hatalı.")

    uid = str(user["id"])
    reset_failed_login(uid)

    fn = (payload.firstName or "").strip()
    ln = (payload.lastName or "").strip()
    if fn or ln:
        cur_fn = str(user.get("first_name") or user.get("firstName") or "").strip()
        cur_ln = str(user.get("last_name") or user.get("lastName") or "").strip()
        fields: Dict[str, Any] = {}
        if fn and not cur_fn:
            fields["first_name"] = fn
        if ln and not cur_ln:
            fields["last_name"] = ln
        if fields:
            update_user_fields_by_id(uid, fields)
            user = find_user_by_id(uid) or user

    role = user.get("role", "user")
    tv = get_user_token_version(uid)
    access_token = create_access_token({"sub": email_norm, "role": role, "uid": uid, "tv": tv})
    refresh_token = create_refresh_token({"sub": email_norm, "role": role, "uid": uid, "tv": tv})
    refresh_hash = hmac_hash(refresh_token, os.getenv("DATA_HASH_KEY", ""))
    fingerprint = token_fingerprint(ua, ip)
    update_user_login(uid, ip, refresh_hash)
    create_session(
        uid,
        refresh_hash,
        fingerprint,
        ip,
        ua,
        datetime.now(timezone.utc) + timedelta(days=7),
    )
    _set_refresh_cookie(response, refresh_token)
    try:
        log_audit(uid, "USER_LOGIN", email_norm, None, ip, ua)
    except Exception:
        pass

    return {
        "status": "ok",
        "message": "Giriş başarılı",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": _user_for_client(user),
    }


@router.post("/refresh")
async def refresh_session_endpoint(request: Request, response: Response):
    token = (request.cookies.get("refresh_token") or "").strip()
    if not token:
        try:
            raw = await request.body()
            if raw:
                j = json.loads(raw.decode("utf-8"))
                if isinstance(j, dict) and j.get("refresh_token"):
                    token = str(j.get("refresh_token") or "").strip()
        except Exception:
            pass
    if not token:
        raise HTTPException(status_code=401, detail="Refresh token gerekli.")

    try:
        pl = decode_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Geçersiz refresh token.") from None

    if pl.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Geçersiz refresh token.")

    email = str(pl.get("sub") or "").strip().lower()
    role = pl.get("role")
    user_id = pl.get("uid")
    tv = pl.get("tv")
    if not user_id or tv is None:
        raise HTTPException(status_code=401, detail="Geçersiz refresh token.")

    current_tv = get_user_token_version(str(user_id))
    if int(tv) != int(current_tv):
        _clear_refresh_cookie(response)
        raise HTTPException(status_code=401, detail="Oturum geçersiz.")

    old_hash = hmac_hash(token, os.getenv("DATA_HASH_KEY", ""))
    if not rotate_refresh_token_atomic(old_hash, reason="rotation"):
        _clear_refresh_cookie(response)
        raise HTTPException(status_code=401, detail="Oturum geçersiz.")

    new_access = create_access_token({"sub": email, "role": role, "uid": str(user_id), "tv": int(tv)})
    new_refresh = create_refresh_token({"sub": email, "role": role, "uid": str(user_id), "tv": int(tv)})
    ip = _client_ip(request)
    ua = request.headers.get("user-agent", "unknown")
    new_hash = hmac_hash(new_refresh, os.getenv("DATA_HASH_KEY", ""))
    fingerprint = token_fingerprint(ua, ip)
    create_session(
        str(user_id),
        new_hash,
        fingerprint,
        ip,
        ua,
        datetime.now(timezone.utc) + timedelta(days=7),
    )
    _set_refresh_cookie(response, new_refresh)
    return {"status": "ok", "access_token": new_access, "refresh_token": new_refresh}


@router.post("/logout")
def logout_account(request: Request, response: Response):
    token = (request.cookies.get("refresh_token") or "").strip()
    if token:
        try:
            revoke_session(hmac_hash(token, os.getenv("DATA_HASH_KEY", "")), reason="logout")
        except Exception:
            pass
    _clear_refresh_cookie(response)
    return {"status": "ok", "message": "Çıkış yapıldı."}


@router.get("/me")
def me(user: Dict[str, Any] = Depends(get_current_user)):
    u = find_user_by_id(str(user.get("id")))
    if not u:
        raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı.")
    su = _user_for_client(u)
    su["permissions"] = _permissions_for_user_row(u)
    return {"status": "ok", "user": su}
