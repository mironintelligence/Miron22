import os
import json
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, status

DATA_DIR = Path(os.getenv("DATA_DIR") or "data")
DATA_DIR.mkdir(parents=True, exist_ok=True)
ADMIN_SESSIONS_FILE = DATA_DIR / "admin_sessions.json"

def _now() -> datetime:
    return datetime.now(timezone.utc)

def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()

def _load_sessions() -> Dict[str, Any]:
    if not ADMIN_SESSIONS_FILE.exists():
        return {}
    try:
        with ADMIN_SESSIONS_FILE.open("r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, dict) else {}
    except Exception:
        return {}

def _save_sessions(data: Dict[str, Any]) -> None:
    ADMIN_SESSIONS_FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp = ADMIN_SESSIONS_FILE.with_suffix(".tmp")
    try:
        with tmp.open("w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, ADMIN_SESSIONS_FILE)
    finally:
        if tmp.exists():
            try:
                tmp.unlink()
            except Exception:
                pass

def issue_admin_token(admin_id: str, ttl_hours: int = 24) -> str:
    token = secrets.token_urlsafe(32)
    sessions = _load_sessions()
    sessions[token] = {
        "admin_id": admin_id,
        "issued_at": _iso(_now()),
        "expires_at": _iso(_now() + timedelta(hours=ttl_hours)),
    }
    _save_sessions(sessions)
    return token

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
    sessions = _load_sessions()
    info = sessions.get(incoming)
    if not info:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin token geçersiz.")
    try:
        exp = datetime.fromisoformat(str(info.get("expires_at"))).astimezone(timezone.utc)
    except Exception:
        exp = _now() - timedelta(days=1)
    if exp <= _now():
        # remove expired
        sessions.pop(incoming, None)
        _save_sessions(sessions)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin token süresi doldu.")
    return info
