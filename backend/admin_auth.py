import os
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, status
import jwt

# Use same SECRET_KEY as security.py (consolidated) or distinct if needed.
# Per security requirements: "Admin endpointleri sadece admin erişebilecek."
# We should reuse the main security module to ensure consistency, 
# OR keep a separate admin secret if we want isolation. 
# Spec said "Admin tokens are signed with SECRET_KEY, while user tokens... with JWT_SECRET".
# Let's keep that separation.

SECRET_KEY = os.getenv("SECRET_KEY") # Fail if missing
if not SECRET_KEY:
    raise ValueError("SECRET_KEY env var is missing for Admin Auth")

ALGORITHM = "HS256"

def issue_admin_token(admin_id: str, ttl_hours: int = 12) -> str:
    """
    Issue a stateless JWT token for admin.
    Reduced TTL to 12 hours for security.
    """
    expire = datetime.now(timezone.utc) + timedelta(hours=ttl_hours)
    payload = {
        "sub": str(admin_id),
        "role": "admin",
        "exp": expire,
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

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
        # Verify signature with Admin Secret
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
