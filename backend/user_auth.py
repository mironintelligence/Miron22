from __future__ import annotations

from typing import Any, Dict, Optional

import jwt
from fastapi import Header, HTTPException, status

from security import decode_token
from stores.pg_users_store import (
    find_user_by_email,
    find_user_by_id,
    get_user_token_version,
    is_account_locked,
    is_subscription_expired,
    purge_if_demo_expired,
)
from supabase_jwt import decode_supabase_access_token


def authenticate_bearer(authorization: Optional[str]) -> Dict[str, Any]:
    auth = (authorization or "").strip()
    if not auth.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bearer token gerekli.")

    token = auth.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bearer token gerekli.")

    payload: Dict[str, Any]
    is_legacy = False
    try:
        unverified = jwt.decode(token, options={"verify_signature": False})
        if unverified.get("type") == "access" and unverified.get("uid") is not None and unverified.get("tv") is not None:
            payload = decode_token(token)
            is_legacy = True
        else:
            payload = decode_supabase_access_token(token)
    except HTTPException:
        raise
    except jwt.InvalidTokenError:
        try:
            payload = decode_supabase_access_token(token)
        except jwt.InvalidTokenError:
            try:
                payload = decode_token(token)
                is_legacy = True
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token doğrulanamadı.",
                ) from None
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token doğrulanamadı.") from None

    if is_legacy:
        uid = payload.get("uid") or payload.get("user_id") or payload.get("id")
        email = (payload.get("sub") or "").strip().lower()
        tv = payload.get("tv")
        if not uid or tv is None or not email:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Geçersiz token.")
        if is_account_locked(email):
            raise HTTPException(status_code=423, detail="Hesap geçici olarak kilitli.")
        u = find_user_by_id(str(uid))
        if not u:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Kullanıcı bulunamadı.")
        if purge_if_demo_expired(u):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="DEMO_EXPIRED")
        if u.get("is_active") is False:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Hesap askıya alındı.")
        if is_subscription_expired(u):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="SUBSCRIPTION_EXPIRED")
        current_tv = get_user_token_version(str(uid))
        if int(tv) != int(current_tv):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Oturum geçersiz.")
        return {"id": str(uid), "email": email, "role": u.get("role")}

    uid = str(payload.get("sub") or "").strip()
    if not uid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Geçersiz token.")
    email = (payload.get("email") or "").strip().lower()
    # Primary lookup: Supabase "sub" == local user.id.
    # Fallback: when accounts were created via the legacy local flow,
    # ids differ but the verified email still resolves the same principal.
    u = find_user_by_id(uid)
    if not u and email:
        u = find_user_by_email(email)
    if not u:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Kullanıcı bulunamadı.")
    if purge_if_demo_expired(u):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="DEMO_EXPIRED")
    row_email = _norm_email(u.get("email"))
    if email and row_email and row_email != email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token e-posta eşleşmiyor.")
    if u.get("is_active") is False:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Hesap askıya alındı.")
    if is_subscription_expired(u):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="SUBSCRIPTION_EXPIRED")
    if row_email and is_account_locked(row_email):
        raise HTTPException(status_code=423, detail="Hesap geçici olarak kilitli.")
    resolved_id = str(u.get("id") or uid)
    return {"id": resolved_id, "email": row_email or email, "role": u.get("role")}


def _norm_email(v: Any) -> str:
    return (str(v or "")).strip().lower()


def user_has_admin_role(user: Dict[str, Any]) -> bool:
    """public.users.role — büyük/küçük harf duyarsız."""
    return str((user.get("role") or "")).strip().lower() == "admin"


def get_current_user(authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    return authenticate_bearer(authorization)
