import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, status
import jwt

SECRET_KEY = os.getenv("SECRET_KEY", "CHANGE_THIS_IN_PROD_OR_ENV_VAR")
ALGORITHM = "HS256"

def issue_admin_token(admin_id: str, ttl_hours: int = 24) -> str:
    """
    Issue a stateless JWT token for admin.
    """
    expire = datetime.now(timezone.utc) + timedelta(hours=ttl_hours)
    payload = {
        "sub": admin_id,
        "role": "admin",
        "exp": expire
    }
    encoded_jwt = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

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

def require_admin(authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    incoming = _extract_bearer(authorization)
    if not incoming:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin token gerekli. Authorization: Bearer <token>",
        )
    
    try:
        payload = jwt.decode(incoming, SECRET_KEY, algorithms=[ALGORITHM])
        admin_id = payload.get("sub")
        role = payload.get("role")
        
        if role != "admin" or not admin_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Geçersiz admin yetkisi.")
            
        return {
            "admin_id": admin_id,
            "role": role,
            "expires_at": payload.get("exp")
        }
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin token süresi doldu.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Geçersiz admin token.")
