from __future__ import annotations

import os
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, status, Request, Body, Depends
from pydantic import BaseModel, Field, validator

from stores.pg_users_store import (
    find_user_by_email,
    find_user_by_id,
    log_audit,
    update_user_fields_by_id,
    update_user_verification,
    get_user_by_reset_token,
    update_password,
)
from security import hash_password, sanitize_user_for_response
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


@router.get("/me")
def me(user: Dict[str, Any] = Depends(get_current_user)):
    u = find_user_by_id(str(user.get("id")))
    if not u:
        raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı.")
    su = sanitize_user_for_response(u)
    su["permissions"] = _permissions_for_user_row(u)
    return {"status": "ok", "user": su}
