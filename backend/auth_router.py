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
    purge_if_demo_expired,
    reset_failed_login,
    revoke_session,
    rotate_refresh_token_atomic,
    sync_local_password_hash,
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
from utils.request_meta import client_ip, client_meta, cookie_secure
from legal_compliance import document_version_hash, luhn_valid, card_last_four
from services.legal_cms_service import insert_acceptances as insert_user_legal_acceptances
from system_runtime import maintenance_mode_enabled
from supabase_password_login import try_supabase_password_login
from supabase_jwt import decode_supabase_access_token

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
    mode: Optional[str] = Field(default="single", pattern="^single$", max_length=16)
    discountCode: Optional[str] = Field(default=None, max_length=64)
    consents: ConsentPayload
    card: Optional[CardPayload] = None


import secrets
from db import get_db_cursor
from services.mail_service import send_reset_password_email, send_password_reset_otp_email


def _register_requires_supabase_jwt() -> bool:
    return (os.getenv("MIRON_REGISTER_REQUIRES_SUPABASE", "").strip().lower() in ("1", "true", "yes"))


def _supabase_jwt_email(request: Request) -> str:
    raw = (request.headers.get("authorization") or "").strip()
    if not raw.lower().startswith("bearer "):
        return ""
    tok = raw[7:].strip()
    if not tok:
        return ""
    try:
        claims = decode_supabase_access_token(tok)
        return str(claims.get("email") or "").strip().lower()
    except Exception:
        return ""


def _norm_name_part(s: str) -> str:
    return " ".join((s or "").strip().lower().split())


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

    ip, _ua = client_meta(request)

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

    payment_on_file = bool(payload.card and payload.card.number and luhn_valid(payload.card.number))

    fields: Dict[str, Any] = {
        "first_name": payload.firstName.strip(),
        "last_name": payload.lastName.strip(),
        "role": role,
        "payment_card_on_file": payment_on_file,
    }
    if used_code:
        fields["used_discount_code"] = used_code

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
        ip2, ua2 = client_meta(request)
        insert_user_legal_acceptances(uid, ["terms", "privacy", "ai_terms"], "complete_registration", ip2, ua2)
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
    ip, ua = client_meta(request)
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


class ForgotPasswordBody(BaseModel):
    email: EmailStr
    firstName: str = Field(..., min_length=1, max_length=64)
    lastName: str = Field(..., min_length=1, max_length=64)


@router.post("/forgot-password")
def forgot_password(body: ForgotPasswordBody):
    email_norm = str(body.email).strip().lower()
    user = find_user_by_email(email_norm)
    generic = {
        "status": "ok",
        "message": "Bilgiler kayıtlı bir hesapla eşleşirse e-postanıza 12 haneli doğrulama kodu gönderilir.",
    }
    if not user:
        return generic

    row_fn = str(user.get("first_name") or user.get("firstName") or "")
    row_ln = str(user.get("last_name") or user.get("lastName") or "")
    if _norm_name_part(row_fn) != _norm_name_part(body.firstName) or _norm_name_part(row_ln) != _norm_name_part(body.lastName):
        return generic

    key = (os.getenv("DATA_HASH_KEY") or "").strip()
    if not key:
        return generic

    code = f"{secrets.randbelow(10**12):012d}"
    otp_hash = hmac_hash(code, key)
    with get_db_cursor() as cur:
        cur.execute(
            """
            UPDATE users SET
              password_reset_otp_hash = %s,
              password_reset_otp_expires = NOW() + INTERVAL '15 minutes',
              reset_password_token = NULL,
              reset_password_expires_at = NULL
            WHERE id = %s
            """,
            (otp_hash, user["id"]),
        )

    try:
        send_password_reset_otp_email(email_norm, code)
    except Exception:
        pass
    return generic


class VerifyForgotOtpBody(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=32)


@router.post("/verify-forgot-otp")
def verify_forgot_otp(body: VerifyForgotOtpBody):
    email_norm = str(body.email).strip().lower()
    digits = re.sub(r"\D", "", body.code or "")
    if len(digits) != 12:
        raise HTTPException(status_code=400, detail="Kod 12 haneli olmalıdır.")

    user = find_user_by_email(email_norm)
    if not user:
        raise HTTPException(status_code=400, detail="Geçersiz veya süresi dolmuş kod.")

    key = (os.getenv("DATA_HASH_KEY") or "").strip()
    if not key:
        raise HTTPException(status_code=503, detail="Sunucu yapılandırması eksik.")

    otp_hash = hmac_hash(digits, key)
    uid = str(user.get("id") or "")
    with get_db_cursor() as cur:
        cur.execute(
            """
            SELECT password_reset_otp_hash, password_reset_otp_expires
            FROM users WHERE id = %s
            """,
            (uid,),
        )
        row = cur.fetchone()
    if not row or not row.get("password_reset_otp_hash"):
        raise HTTPException(status_code=400, detail="Geçersiz veya süresi dolmuş kod.")
    exp = row.get("password_reset_otp_expires")
    exp_dt: Optional[datetime] = None
    if isinstance(exp, datetime):
        exp_dt = exp
    elif isinstance(exp, str) and exp.strip():
        try:
            exp_dt = datetime.fromisoformat(exp.strip().replace("Z", "+00:00"))
        except ValueError:
            exp_dt = None
    if exp_dt is not None and exp_dt.tzinfo is None:
        exp_dt = exp_dt.replace(tzinfo=timezone.utc)
    if exp_dt is None or exp_dt < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Geçersiz veya süresi dolmuş kod.")
    if str(row.get("password_reset_otp_hash") or "") != otp_hash:
        raise HTTPException(status_code=400, detail="Geçersiz veya süresi dolmuş kod.")

    reset_token = secrets.token_urlsafe(32)
    with get_db_cursor() as cur:
        cur.execute(
            """
            UPDATE users SET
              reset_password_token = %s,
              reset_password_expires_at = NOW() + INTERVAL '1 hour',
              password_reset_otp_hash = NULL,
              password_reset_otp_expires = NULL
            WHERE id = %s AND password_reset_otp_hash = %s
            """,
            (reset_token, uid, otp_hash),
        )
        if cur.rowcount != 1:
            raise HTTPException(status_code=400, detail="Geçersiz veya süresi dolmuş kod.")

    return {"status": "ok", "reset_token": reset_token}


def _validate_password_complexity(password: str) -> str:
    """Shared password complexity check (used by reset + register).
    Enforced unless PASSWORD_STRICT=false is set (e.g. for test/dev)."""
    pw = (password or "").strip()
    strict = (os.getenv("PASSWORD_STRICT", "true") or "").strip().lower() != "false"
    if not strict:
        if len(pw) < 8:
            raise ValueError("Şifre en az 8 karakter olmalıdır.")
        return pw
    if len(pw) < 8:
        raise ValueError("Şifre en az 8 karakter olmalıdır.")
    if not re.search(r"[A-Z]", pw):
        raise ValueError("Şifre en az bir büyük harf içermelidir.")
    if not re.search(r"[a-z]", pw):
        raise ValueError("Şifre en az bir küçük harf içermelidir.")
    if not re.search(r"\d", pw):
        raise ValueError("Şifre en az bir rakam içermelidir.")
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", pw):
        raise ValueError("Şifre en az bir özel karakter içermelidir.")
    return pw


class ResetPasswordBody(BaseModel):
    token: str
    new_password: str

    @validator("new_password")
    def validate_password_strength(cls, v):
        return _validate_password_complexity(v)


@router.post("/reset-password")
def reset_password_endpoint(body: ResetPasswordBody):
    if not body.token:
        raise HTTPException(status_code=400, detail="Token gerekli.")

    u = get_user_by_reset_token(body.token)
    if not u:
        raise HTTPException(status_code=400, detail="Geçersiz veya süresi dolmuş token.")

    uid = str(u["id"])
    update_password(uid, hash_password(body.new_password))
    try:
        with get_db_cursor() as cur:
            cur.execute(
                """
                UPDATE users SET
                  reset_password_token = NULL,
                  reset_password_expires_at = NULL,
                  password_reset_otp_hash = NULL,
                  password_reset_otp_expires = NULL
                WHERE id = %s
                """,
                (uid,),
            )
    except Exception:
        pass
    return {"status": "ok", "message": "Şifreniz başarıyla güncellendi."}


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    secure = cookie_secure()
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
    secure = cookie_secure()
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
    accepted_terms_and_privacy: bool = False
    phone: Optional[str] = Field(default=None, max_length=32)
    city: Optional[str] = Field(default=None, max_length=128)
    law_firm: Optional[str] = Field(default=None, max_length=256)
    registration_plan: Optional[str] = Field(default=None, max_length=32)

    @validator("password")
    def _validate_register_password(cls, v):
        return _validate_password_complexity(v)

    @validator("mode")
    def _validate_mode(cls, v):
        if v is None or str(v).strip() == "":
            return "single"
        vv = str(v).strip().lower()
        if vv not in ("single", "multi"):
            raise ValueError("Geçersiz kayıt modu.")
        return vv

    @validator("registration_plan")
    def _validate_plan(cls, v):
        if v is None or str(v).strip() == "":
            return None
        vv = str(v).strip().lower()
        if vv not in ("legal", "enterprise"):
            raise ValueError("Geçersiz plan.")
        return vv


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
    if not payload.accepted_terms_and_privacy:
        raise HTTPException(
            status_code=400,
            detail="Kullanım Şartları ve Gizlilik Politikası kabul edilmelidir.",
        )
    if _register_requires_supabase_jwt():
        jwt_em = _supabase_jwt_email(request)
        if not jwt_em or jwt_em != email_norm:
            raise HTTPException(
                status_code=401,
                detail="E-posta doğrulaması tamamlanmalıdır (Supabase oturumu gerekli).",
            )

    plan = (payload.registration_plan or "").strip().lower()
    if plan == "legal":
        if not (payload.phone or "").strip() or not (payload.city or "").strip() or not (payload.law_firm or "").strip():
            raise HTTPException(
                status_code=400,
                detail="Miron AI Legal için telefon, şehir ve hukuk bürosu zorunludur.",
            )

    fn = (payload.firstName or "").strip()
    ln = (payload.lastName or "").strip()
    row: Dict[str, Any] = {
        "email": email_norm,
        "hashed_password": hash_password(payload.password),
        "firstName": fn,
        "lastName": ln,
        "role": "user",
        "is_active": True,
        "is_verified": True,
    }
    if (payload.phone or "").strip():
        row["phone"] = (payload.phone or "").strip()
    if (payload.city or "").strip():
        row["city"] = (payload.city or "").strip()
    if (payload.law_firm or "").strip():
        row["law_firm"] = (payload.law_firm or "").strip()
    if plan == "enterprise":
        row["enterprise_inquiry"] = True
        row["subscription_plan"] = "enterprise"
    elif plan == "legal":
        row["subscription_plan"] = "legal"

    uid = create_user(row)
    ip, ua = client_meta(request)
    try:
        insert_user_legal_acceptances(str(uid), ["terms", "privacy"], "signup", ip, ua)
    except Exception:
        pass
    try:
        log_audit(None, "USER_REGISTER", email_norm, {"email": email_norm}, ip, ua)
    except Exception:
        pass
    return {"status": "ok", "message": "Kayıt oluşturuldu."}


@router.post("/login")
def login_account(payload: LoginRequest, request: Request, response: Response):
    email_norm = str(payload.email).strip().lower()
    ip = client_ip(request)
    ua = request.headers.get("user-agent", "unknown")

    try:
        user = find_user_by_email(email_norm)
        if user:
            if is_account_locked(email_norm):
                raise HTTPException(status_code=423, detail="Hesap geçici olarak kilitli. Lütfen daha sonra tekrar deneyin.")
            if user.get("is_active") is False:
                raise HTTPException(status_code=403, detail="Hesap askıya alındı.")

        stored_hash = (user.get("password_hash") or user.get("hashed_password")) if user else None
        local_pw_ok = bool(user and verify_password(payload.password, stored_hash))

        sb_principal = None
        if not local_pw_ok:
            sb_principal = try_supabase_password_login(email_norm, payload.password)

        if not local_pw_ok and not sb_principal:
            if user:
                increment_failed_login(email_norm)
            raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı veya şifre hatalı.")

        if sb_principal and not local_pw_ok:
            supa_id = str(sb_principal.get("id") or "").strip()
            resolved = find_user_by_id(supa_id) if supa_id else None
            if not resolved:
                resolved = find_user_by_email(email_norm)
            if not resolved:
                fn = (payload.firstName or "").strip()
                ln = (payload.lastName or "").strip()
                try:
                    create_user(
                        {
                            "id": supa_id,
                            "email": email_norm,
                            "hashed_password": hash_password(payload.password),
                            "firstName": fn,
                            "lastName": ln,
                            "role": "user",
                            "is_active": True,
                            "is_verified": True,
                        }
                    )
                except Exception:
                    pass
                resolved = find_user_by_id(supa_id) or find_user_by_email(email_norm)
            else:
                sync_local_password_hash(str(resolved["id"]), hash_password(payload.password))
            user = resolved
            if not user:
                raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı veya şifre hatalı.")
            row_email = str(user.get("email") or email_norm).strip().lower()
            if is_account_locked(row_email):
                raise HTTPException(status_code=423, detail="Hesap geçici olarak kilitli. Lütfen daha sonra tekrar deneyin.")
            if user.get("is_active") is False:
                raise HTTPException(status_code=403, detail="Hesap askıya alındı.")
            try:
                log_audit(str(user.get("id")), "USER_LOGIN_SUPABASE", row_email, {"via": "gotrue_password"}, ip, ua)
            except Exception:
                pass

        if maintenance_mode_enabled():
            r = str(user.get("role") or "user").strip().lower()
            if r != "admin":
                raise HTTPException(
                    status_code=503,
                    detail="Sistem bakım modunda. Yalnızca yönetici hesapları giriş yapabilir. Lütfen daha sonra tekrar deneyin.",
                )

        if purge_if_demo_expired(user):
            raise HTTPException(status_code=401, detail="DEMO_EXPIRED")

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
        try:
            tv = int(get_user_token_version(uid))
            if tv < 1:
                tv = 1
        except Exception:
            tv = 1
        access_token = create_access_token({"sub": email_norm, "role": role, "uid": uid, "tv": tv})
        refresh_token = create_refresh_token({"sub": email_norm, "role": role, "uid": uid, "tv": tv})

        # Supabase şema drift (sessions/users kolonları) login'i tamamen düşürmesin.
        session_persist_ok = True
        try:
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
        except Exception as e:
            session_persist_ok = False
            try:
                log_audit(uid, "USER_LOGIN_SESSION_WARN", email_norm, {"error": str(e)}, ip, ua)
            except Exception:
                pass

        try:
            log_audit(uid, "USER_LOGIN", email_norm, {"session_persist_ok": session_persist_ok}, ip, ua)
        except Exception:
            pass

        return {
            "status": "ok",
            "message": "Giriş başarılı",
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": _user_for_client(user),
            "session_persist_ok": session_persist_ok,
        }
    except HTTPException:
        raise
    except Exception as e:
        # Login endpoint'inde 5xx zincirini kır: beklenmeyen hata olsa da kullanıcıya
        # güvenli bir auth hatası dönelim, detay audit log'a düşsün.
        try:
            log_audit(None, "USER_LOGIN_CRASH", email_norm, {"error": str(e)}, ip, ua)
        except Exception:
            pass
        raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı veya şifre hatalı.") from e


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

    try:
        u_row = find_user_by_id(str(user_id))
        if not u_row:
            _clear_refresh_cookie(response)
            raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı.")
        if purge_if_demo_expired(u_row):
            _clear_refresh_cookie(response)
            raise HTTPException(status_code=401, detail="DEMO_EXPIRED")

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
        ip = client_ip(request)
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
    except HTTPException:
        raise
    except Exception as e:
        _clear_refresh_cookie(response)
        raise HTTPException(
            status_code=503,
            detail="Oturum yenileme sunucusuna ulaşılamadı. Lütfen tekrar giriş yapın.",
        ) from e


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
