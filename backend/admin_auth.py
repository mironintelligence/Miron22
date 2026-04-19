import os
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, status
import jwt
import json
import uuid
from pathlib import Path

# Use same SECRET_KEY as security.py (consolidated) or distinct if needed.
# Per security requirements: "Admin endpointleri sadece admin erişebilecek."
# We should reuse the main security module to ensure consistency, 
# OR keep a separate admin secret if we want isolation. 
# Spec said "Admin tokens are signed with SECRET_KEY, while user tokens... with JWT_SECRET".
# Let's keep that separation.

SECRET_KEY = (os.getenv("SECRET_KEY") or "").strip()

ALGORITHM = "HS256"


def admin_jwt_signing_key() -> str:
    """Uygulama ayağa kalksın diye import anında patlamıyoruz; token üretiminde kontrol edilir."""
    if not SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="SECRET_KEY tanımlı değil. Render Web Service → Environment → SECRET_KEY ekleyin.",
        )
    return SECRET_KEY

DATA_DIR = Path(os.getenv("DATA_DIR") or "data")
DATA_DIR.mkdir(parents=True, exist_ok=True)
ADMIN_SESSIONS_FILE = DATA_DIR / "admin_sessions.json"


def _load_sessions() -> Dict[str, Any]:
    if not ADMIN_SESSIONS_FILE.exists():
        return {"sessions": []}
    try:
        with ADMIN_SESSIONS_FILE.open("r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, dict) and isinstance(data.get("sessions"), list):
                return data
    except Exception:
        pass
    return {"sessions": []}


def _save_sessions(data: Dict[str, Any]) -> None:
    import tempfile

    ADMIN_SESSIONS_FILE.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=ADMIN_SESSIONS_FILE.name + ".", dir=str(ADMIN_SESSIONS_FILE.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, ADMIN_SESSIONS_FILE)
    finally:
        try:
            if os.path.exists(tmp):
                os.remove(tmp)
        except Exception:
            pass


def issue_admin_token(admin_id: str, ttl_hours: int = 12, ip: Optional[str] = None, ua: Optional[str] = None) -> str:
    """
    Issue a stateless JWT token for admin.
    Reduced TTL to 12 hours for security.
    """
    expire = datetime.now(timezone.utc) + timedelta(hours=ttl_hours)
    jti = str(uuid.uuid4())
    payload = {
        "sub": str(admin_id),
        "role": "admin",
        "jti": jti,
        "exp": expire,
        "iat": datetime.now(timezone.utc)
    }
    token = jwt.encode(payload, admin_jwt_signing_key(), algorithm=ALGORITHM)
    if isinstance(token, bytes):
        token = token.decode("utf-8")
    data = _load_sessions()
    sessions = data.get("sessions") or []
    sessions.append(
        {
            "jti": jti,
            "admin_id": str(admin_id),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": expire.isoformat(),
            "last_seen_at": datetime.now(timezone.utc).isoformat(),
            "ip": ip,
            "ua": ua,
            "revoked": False,
            "revoked_at": None,
        }
    )
    data["sessions"] = sessions[-5000:]
    _save_sessions(data)
    return token


def revoke_admin_session(jti: str) -> bool:
    sid = str(jti or "").strip()
    if not sid:
        return False
    data = _load_sessions()
    sessions = data.get("sessions") or []
    changed = False
    for s in sessions:
        if str(s.get("jti") or "") == sid and not s.get("revoked"):
            s["revoked"] = True
            s["revoked_at"] = datetime.now(timezone.utc).isoformat()
            changed = True
    if changed:
        data["sessions"] = sessions
        _save_sessions(data)
    return changed


def get_admin_sessions(admin_id: Optional[str] = None, limit: int = 200) -> list:
    data = _load_sessions()
    sessions = data.get("sessions") or []
    if admin_id:
        sessions = [s for s in sessions if str(s.get("admin_id") or "") == str(admin_id)]
    sessions.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return sessions[: int(limit)]

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
    incoming = (_extract_bearer(authorization) or "").strip()
    if not incoming:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin token gerekli. Authorization: Bearer <token>",
        )
    
    try:
        # Verify signature with Admin Secret
        payload = jwt.decode(incoming, admin_jwt_signing_key(), algorithms=[ALGORITHM])
        admin_id = str(payload.get("sub") or "").strip()
        role = str(payload.get("role") or "").strip().lower()
        jti = payload.get("jti")
        
        if role != "admin" or not admin_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Geçersiz admin yetkisi.")

        sid = str(jti or "").strip()
        if sid:
            data = _load_sessions()
            sessions = data.get("sessions") or []
            for s in sessions:
                if str(s.get("jti") or "") == sid:
                    if s.get("revoked"):
                        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin oturumu sonlandırılmış.")
                    s["last_seen_at"] = datetime.now(timezone.utc).isoformat()
                    data["sessions"] = sessions
                    _save_sessions(data)
                    break
            
        return {
            "admin_id": admin_id,
            "role": "admin",
            "expires_at": payload.get("exp"),
            "jti": jti,
        }
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin token süresi doldu.")
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin token doğrulanamadı (imza veya süre). Sunucuda SECRET_KEY ile uyumlu olduğundan emin olun.",
        )
