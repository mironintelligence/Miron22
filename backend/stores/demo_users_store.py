import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any, Optional
try:
    from backend.security import encrypt_value, decrypt_value, hmac_hash
except ImportError:
    from security import encrypt_value, decrypt_value, hmac_hash

BACKEND_DIR = Path(__file__).resolve().parents[2]
DEMO_USERS_FILE = BACKEND_DIR / "data" / "demo_users.json"

def _ensure():
    DEMO_USERS_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not DEMO_USERS_FILE.exists():
        with DEMO_USERS_FILE.open("w", encoding="utf-8") as f:
            json.dump([], f, ensure_ascii=False, indent=2)

def _norm_email(email: str) -> str:
    return (email or "").strip().lower()

def _decode_user(u: Dict[str, Any]) -> Dict[str, Any]:
    email = u.get("email")
    if not email and u.get("email_enc"):
        email = decrypt_value(str(u.get("email_enc")))
    
    first_name = u.get("firstName")
    if first_name is None and u.get("firstName_enc"):
        first_name = decrypt_value(str(u.get("firstName_enc")))
        
    last_name = u.get("lastName")
    if last_name is None and u.get("lastName_enc"):
        last_name = decrypt_value(str(u.get("lastName_enc")))
        
    out = dict(u)
    out["email"] = _norm_email(str(email or ""))
    out["firstName"] = str(first_name or "")
    out["lastName"] = str(last_name or "")
    
    # Remove encrypted fields from output for cleaner usage
    out.pop("email_enc", None)
    out.pop("firstName_enc", None)
    out.pop("lastName_enc", None)
    out.pop("email_hash", None)
    
    return out

def _encode_user(u: Dict[str, Any]) -> Dict[str, Any]:
    email = _norm_email(str(u.get("email") or ""))
    out = dict(u)
    
    # Add hash for searching
    out["email_hash"] = hmac_hash(email, os.getenv("DATA_HASH_KEY", ""))
    
    # Encrypt PII
    out["email_enc"] = encrypt_value(email)
    out["firstName_enc"] = encrypt_value(str(u.get("firstName") or ""))
    out["lastName_enc"] = encrypt_value(str(u.get("lastName") or ""))
    
    # Remove plain text PII from storage
    out.pop("email", None)
    out.pop("firstName", None)
    out.pop("lastName", None)
    
    return out

def read_demo_users() -> List[Dict[str, Any]]:
    _ensure()
    try:
        with DEMO_USERS_FILE.open("r", encoding="utf-8") as f:
            data = json.load(f)
            if not isinstance(data, list):
                return []
            return [_decode_user(u) for u in data if isinstance(u, dict)]
    except Exception:
        return []

def write_demo_users(users: List[Dict[str, Any]]) -> None:
    _ensure()
    encoded = [_encode_user(u) for u in users if isinstance(u, dict)]
    with DEMO_USERS_FILE.open("w", encoding="utf-8") as f:
        json.dump(encoded, f, ensure_ascii=False, indent=2)

def purge_expired_demo_users(now=None):
    now = now or datetime.now(timezone.utc)
    users = read_demo_users()
    kept = []
    removed = 0
    for u in users:
        try:
            exp_str = str(u.get("expires_at") or "")
            if exp_str:
                exp = datetime.fromisoformat(exp_str.replace("Z", "+00:00"))
                if exp <= now:
                    removed += 1
                    continue
        except Exception:
            pass # Keep if parse fails or assume valid? Let's keep to be safe
        kept.append(u)
        
    if removed:
        write_demo_users(kept)
    return removed

def find_demo_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    email_norm = _norm_email(email)
    users = read_demo_users()
    for u in users:
        if _norm_email(str(u.get("email"))) == email_norm:
            return u
    return None
