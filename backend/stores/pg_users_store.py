import logging
from typing import Optional, Dict, Any, List
from datetime import datetime
from backend.db import get_db_cursor
from backend.security import encrypt_value, decrypt_value, hmac_hash

logger = logging.getLogger("miron_pg_store")

# --- Helper Functions ---

def _norm_email(email: str) -> str:
    return (email or "").strip().lower()

def _row_to_user(row: Dict[str, Any]) -> Dict[str, Any]:
    """Convert DB row to user dict (decrypt PII)"""
    if not row:
        return None
    return dict(row)

# --- User Operations ---

def create_user(user: Dict[str, Any]) -> str:
    """Insert a new user and return ID"""
    sql = """
        INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, NOW())
        RETURNING id;
    """
    params = (
        _norm_email(user["email"]),
        user["hashed_password"],
        user.get("firstName"),
        user.get("lastName"),
        user.get("role", "user"),
        user.get("is_active", True)
    )
    with get_db_cursor() as cur:
        cur.execute(sql, params)
        row = cur.fetchone()
        return str(row["id"])

def find_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    sql = "SELECT * FROM users WHERE email = %s LIMIT 1"
    with get_db_cursor() as cur:
        cur.execute(sql, (_norm_email(email),))
        row = cur.fetchone()
        return _row_to_user(row)

def find_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    sql = "SELECT * FROM users WHERE id = %s LIMIT 1"
    with get_db_cursor() as cur:
        cur.execute(sql, (user_id,))
        row = cur.fetchone()
        return _row_to_user(row)

def delete_user(email: str) -> bool:
    sql = "DELETE FROM users WHERE email = %s RETURNING id"
    with get_db_cursor() as cur:
        cur.execute(sql, (_norm_email(email),))
        return cur.fetchone() is not None

def update_user_password(email: str, hashed_password: str) -> bool:
    sql = "UPDATE users SET password_hash = %s WHERE email = %s RETURNING id"
    with get_db_cursor() as cur:
        cur.execute(sql, (hashed_password, _norm_email(email)))
        return cur.fetchone() is not None

def update_user_role(email: str, role: str) -> bool:
    sql = "UPDATE users SET role = %s WHERE email = %s RETURNING id"
    with get_db_cursor() as cur:
        cur.execute(sql, (role, _norm_email(email)))
        return cur.fetchone() is not None

def update_user_active(email: str, is_active: bool) -> bool:
    sql = "UPDATE users SET is_active = %s WHERE email = %s RETURNING id"
    with get_db_cursor() as cur:
        cur.execute(sql, (is_active, _norm_email(email)))
        return cur.fetchone() is not None

def update_user_login(user_id: str, ip: str, refresh_hash: str):
    sql = """
        UPDATE users 
        SET last_login_at = NOW(), last_login_ip = %s, refresh_token_hash = %s, failed_login_attempts = 0
        WHERE id = %s
    """
    with get_db_cursor() as cur:
        cur.execute(sql, (ip, refresh_hash, user_id))

def get_user_token_version(user_id: str) -> int:
    sql = "SELECT token_version FROM users WHERE id = %s"
    with get_db_cursor() as cur:
        cur.execute(sql, (user_id,))
        row = cur.fetchone()
        if row and row.get("token_version"):
            return int(row["token_version"])
        return 1

def increment_token_version(user_id: str):
    """Global Logout: Invalidates all existing tokens"""
    sql = "UPDATE users SET token_version = token_version + 1 WHERE id = %s"
    with get_db_cursor() as cur:
        cur.execute(sql, (user_id,))

def increment_failed_login(email: str):
    """
    Increment failed login attempts and lock account if threshold reached.
    Lock for 15 minutes after 5 failed attempts.
    """
    sql = """
        UPDATE users 
        SET failed_login_attempts = failed_login_attempts + 1,
            locked_until = CASE 
                WHEN failed_login_attempts + 1 >= 5 THEN NOW() + INTERVAL '15 minutes'
                ELSE NULL 
            END
        WHERE email = %s
    """
    with get_db_cursor() as cur:
        cur.execute(sql, (_norm_email(email),))

def reset_failed_login(user_id: str):
    sql = """
        UPDATE users 
        SET failed_login_attempts = 0, locked_until = NULL
        WHERE id = %s
    """
    with get_db_cursor() as cur:
        cur.execute(sql, (user_id,))

def is_account_locked(email: str) -> bool:
    sql = """
        SELECT locked_until, failed_login_attempts FROM users WHERE email = %s
    """
    with get_db_cursor() as cur:
        cur.execute(sql, (_norm_email(email),))
        row = cur.fetchone()
        if not row:
            return False
        
        locked_until = row.get("locked_until")
        if locked_until and locked_until > datetime.now(locked_until.tzinfo):
            return True
            
        return False

def lock_user(user_id: str, duration_minutes: int = 1440) -> bool:
    """Manually lock user for X minutes (default 24h)"""
    sql = """
        UPDATE users 
        SET locked_until = NOW() + (%s || ' minutes')::interval
        WHERE id = %s
        RETURNING id
    """
    with get_db_cursor() as cur:
        cur.execute(sql, (str(duration_minutes), user_id))
        return cur.fetchone() is not None

def unlock_user(user_id: str) -> bool:
    """Manually unlock user"""
    sql = """
        UPDATE users 
        SET locked_until = NULL, failed_login_attempts = 0
        WHERE id = %s
        RETURNING id
    """
    with get_db_cursor() as cur:
        cur.execute(sql, (user_id,))
        return cur.fetchone() is not None

def get_audit_logs(user_id: str = None, limit: int = 100) -> List[Dict[str, Any]]:
    sql = "SELECT * FROM audit_logs"
    params = []
    
    if user_id:
        sql += " WHERE user_id = %s"
        params.append(user_id)
        
    sql += " ORDER BY created_at DESC LIMIT %s"
    params.append(limit)
    
    with get_db_cursor() as cur:
        cur.execute(sql, tuple(params))
        rows = cur.fetchall()
        return [dict(r) for r in rows]

def list_users(limit=100, offset=0, role: str = None) -> List[Dict[str, Any]]:
    if role:
        sql = "SELECT * FROM users WHERE role = %s ORDER BY created_at DESC LIMIT %s OFFSET %s"
        params = (role, limit, offset)
    else:
        sql = "SELECT * FROM users ORDER BY created_at DESC LIMIT %s OFFSET %s"
        params = (limit, offset)
        
    with get_db_cursor() as cur:
        cur.execute(sql, params)
        rows = cur.fetchall()
        return [_row_to_user(r) for r in rows]

# --- Session Operations ---

def create_session(user_id: str, refresh_hash: str, fingerprint: str, ip: str, ua: str, expires_at: datetime):
    sql = """
        INSERT INTO sessions (user_id, refresh_token_hash, device_fingerprint, ip_address, user_agent, expires_at)
        VALUES (%s, %s, %s, %s, %s, %s)
    """
    with get_db_cursor() as cur:
        cur.execute(sql, (user_id, refresh_hash, fingerprint, ip, ua, expires_at))

def revoke_session(refresh_hash: str, reason: str = "logout"):
    sql = """
        UPDATE sessions 
        SET is_revoked = TRUE, revoked_at = NOW(), revoked_reason = %s
        WHERE refresh_token_hash = %s
    """
    with get_db_cursor() as cur:
        cur.execute(sql, (reason, refresh_hash))

def rotate_refresh_token_atomic(old_refresh_hash: str, reason: str = "rotation") -> bool:
    """
    Atomically checks if session is valid (not revoked, not expired) AND revokes it.
    Returns True if successful (session was valid and is now revoked).
    Returns False if session was already revoked or expired (Race condition or Replay attack).
    """
    sql = """
        UPDATE sessions
        SET is_revoked = TRUE, revoked_at = NOW(), revoked_reason = %s
        WHERE refresh_token_hash = %s 
          AND is_revoked = FALSE 
          AND expires_at > NOW()
        RETURNING id
    """
    with get_db_cursor() as cur:
        cur.execute(sql, (reason, old_refresh_hash))
        return cur.fetchone() is not None

def is_session_valid(refresh_hash: str) -> bool:
    sql = """
        SELECT id FROM sessions 
        WHERE refresh_token_hash = %s AND is_revoked = FALSE AND expires_at > NOW()
    """
    with get_db_cursor() as cur:
        cur.execute(sql, (refresh_hash,))
        return cur.fetchone() is not None

# --- Audit Logs ---

def log_audit(user_id: Optional[str], action: str, resource: str = None, details: Dict = None, ip: str = None, ua: str = None):
    import json
    sql = """
        INSERT INTO audit_logs (user_id, action, resource, details, ip_address, user_agent)
        VALUES (%s, %s, %s, %s, %s, %s)
    """
    with get_db_cursor() as cur:
        cur.execute(sql, (user_id, action, resource, json.dumps(details) if details else None, ip, ua))
