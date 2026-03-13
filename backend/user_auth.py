from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import Header, HTTPException, status

from security import decode_token
from stores.pg_users_store import find_user_by_id, get_user_token_version, is_account_locked


def get_current_user(authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    auth = (authorization or "").strip()
    if not auth.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bearer token gerekli.")

    token = auth.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bearer token gerekli.")

    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Geçersiz token.")

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

        if u.get("is_active") is False:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Hesap askıya alındı.")

        if u.get("is_verified") is False:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="E-posta doğrulanmamış.")

        current_tv = get_user_token_version(str(uid))
        if int(tv) != int(current_tv):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Oturum geçersiz.")

        return {"id": str(uid), "email": email, "role": u.get("role")}
    except Exception:
        raise
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token doğrulanamadı.")
