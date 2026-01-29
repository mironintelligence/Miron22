import os
import re
from typing import Optional
from fastapi import Header, HTTPException, status

def _extract_bearer(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    parts = authorization.strip().split(" ", 1)
    if len(parts) != 2:
        return None
    scheme, token = parts[0].strip(), parts[1].strip()
    if scheme.lower() != "bearer" or not token:
        return None
    return token

def _normalize_token(t: str) -> str:
    if not t:
        return ""
    t = t.strip()
    # env'e bazen "token" veya 'token' yazılıyor
    t = t.strip('"').strip("'").strip()
    # env'e yanlışlıkla "Bearer xxx" yazılmış olabilir
    t = re.sub(r"^Bearer\s+", "", t, flags=re.IGNORECASE).strip()
    return t

print("[ADMIN_AUTH_DEBUG] expected_raw=", repr(os.getenv("ADMIN_TOKEN")), "len=", len((os.getenv("ADMIN_TOKEN") or "")))


def require_admin(authorization: Optional[str] = Header(default=None)) -> None:
    raw_expected = os.getenv("ADMIN_TOKEN") or ""
    expected = _normalize_token(raw_expected)

    if not expected:
        raise HTTPException(status_code=500, detail="ADMIN_TOKEN env ayarlı değil.")

    incoming = _normalize_token(_extract_bearer(authorization) or "")

    if not incoming:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin token gerekli. Authorization: Bearer <token>"
        )

    if incoming != expected:
        # bilgi sızdırmadan debug: sadece uzunluk göster
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Admin token geçersiz. (expected_len={len(expected)} got_len={len(incoming)})"
        )
