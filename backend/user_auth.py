from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import Header, HTTPException, status

from security import decode_token


def get_current_user(authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    auth = (authorization or "").strip()
    if not auth.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bearer token gerekli.")

    token = auth.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bearer token gerekli.")

    try:
        payload = decode_token(token)
        uid = payload.get("uid") or payload.get("user_id") or payload.get("id")
        return {
            "id": uid or payload.get("sub"),
            "email": payload.get("sub"),
            "role": payload.get("role"),
        }
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token doğrulanamadı.")

