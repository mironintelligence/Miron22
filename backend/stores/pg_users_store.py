import os
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta, timezone
import uuid
import threading
from db import get_db_cursor, get_pool_status
from security import encrypt_value, decrypt_value, hmac_hash

logger = logging.getLogger("miron_pg_store")

# --- In-memory test store (default when ENVIRONMENT=test) ---

def _use_inmemory() -> bool:
    return (os.getenv("ENVIRONMENT") or "").lower() == "test" and (os.getenv("TEST_USE_INMEMORY_PG_STORE", "true") or "").lower() != "false"

_mem_lock = threading.Lock()
_mem_users_by_id: Dict[str, Dict[str, Any]] = {}
_mem_users_by_email: Dict[str, str] = {}
_mem_sessions_by_hash: Dict[str, Dict[str, Any]] = {}
_mem_audit_logs: List[Dict[str, Any]] = []


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _as_dt(x) -> Optional[datetime]:
    if isinstance(x, datetime):
        return x if x.tzinfo else x.replace(tzinfo=timezone.utc)
    if isinstance(x, str) and x.strip():
        s = x.strip().replace("Z", "+00:00")
        try:
            dt = datetime.fromisoformat(s)
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except ValueError:
            return None
    return None

# --- Helper Functions ---

def _norm_email(email: str) -> str:
    return (email or "").strip().lower()

def _row_to_user(row: Dict[str, Any]) -> Dict[str, Any]:
    """Convert DB row to user dict (decrypt PII)"""
    if not row:
        return None
    return dict(row)

# --- User Operations ---

def sync_local_password_hash(user_id: str, hashed_password: str) -> bool:
    """Set password_hash only (no token_version bump) — mirrors Supabase password into public.users."""
    uid = str(user_id or "").strip()
    if not uid or not hashed_password:
        return False
    if _use_inmemory():
        with _mem_lock:
            if uid not in _mem_users_by_id:
                return False
            _mem_users_by_id[uid]["password_hash"] = hashed_password
            return True
    with get_db_cursor() as cur:
        cur.execute(
            "UPDATE users SET password_hash = %s WHERE id = %s",
            (hashed_password, uid),
        )
        return cur.rowcount > 0


def create_user(user: Dict[str, Any]) -> str:
    if _use_inmemory():
        uid = str(user.get("id") or uuid.uuid4())
        email = _norm_email(user.get("email") or "")
        now = _now_utc()
        row = {
            "id": uid,
            "email": email,
            "password_hash": user.get("hashed_password"),
            "first_name": user.get("firstName") or user.get("first_name") or "",
            "last_name": user.get("lastName") or user.get("last_name") or "",
            "role": user.get("role", "user"),
            "is_active": user.get("is_active", True),
            "is_verified": user.get("is_verified", True),
            "token_version": int(user.get("token_version") or 1),
            "failed_login_attempts": int(user.get("failed_login_attempts") or 0),
            "locked_until": user.get("locked_until"),
            "created_at": now,
            "last_login_at": None,
            "last_login_ip": None,
            "refresh_token_hash": None,
            "verification_token": user.get("verification_token"),
            "reset_password_token": user.get("reset_password_token"),
            "reset_password_expires_at": user.get("reset_password_expires_at"),
            "mfa_enabled": bool(user.get("mfa_enabled") or False),
            "mfa_secret": user.get("mfa_secret") or "",
            "payment_card_on_file": bool(user.get("payment_card_on_file") or False),
            "trial_ends_at": user.get("trial_ends_at"),
        }
        with _mem_lock:
            _mem_users_by_id[uid] = row
            _mem_users_by_email[email] = uid
        return uid

    cols = ["email", "password_hash", "first_name", "last_name", "role", "is_active", "created_at"]
    fn = user.get("firstName") if user.get("firstName") is not None else user.get("first_name")
    ln = user.get("lastName") if user.get("lastName") is not None else user.get("last_name")
    vals = [
        _norm_email(user["email"]),
        user["hashed_password"],
        (fn if fn is not None else "") or "",
        (ln if ln is not None else "") or "",
        user.get("role", "user"),
        user.get("is_active", True),
        "NOW()",
    ]

    optional_map = {
        "is_verified": "is_verified",
        "verification_token": "verification_token",
        "reset_password_token": "reset_password_token",
        "reset_password_expires_at": "reset_password_expires_at",
        "enterprise_inquiry": "enterprise_inquiry",
        "used_discount_code": "used_discount_code",
        "demo_expires_at": "demo_expires_at",
        "subscription_plan": "subscription_plan",
        "subscription_status": "subscription_status",
        "mfa_enabled": "mfa_enabled",
        "mfa_secret": "mfa_secret",
        "payment_card_on_file": "payment_card_on_file",
        "trial_ends_at": "trial_ends_at",
        "phone": "phone",
        "city": "city",
        "law_firm": "law_firm",
    }

    with get_db_cursor() as cur:
        cur.execute(
            "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='users'"
        )
        existing = {r["column_name"] for r in cur.fetchall() or []}

        for k, col in optional_map.items():
            if k in user and col in existing:
                cols.append(col)
                vals.append(user.get(k))

        col_sql = ", ".join(cols)
        placeholders = []
        params = []
        for v in vals:
            if isinstance(v, str) and v == "NOW()":
                placeholders.append("NOW()")
            else:
                placeholders.append("%s")
                params.append(v)

        sql = f"INSERT INTO users ({col_sql}) VALUES ({', '.join(placeholders)}) RETURNING id;"
        cur.execute(sql, tuple(params))
        row = cur.fetchone()
        return str(row["id"])

def find_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    if _use_inmemory():
        e = _norm_email(email)
        with _mem_lock:
            uid = _mem_users_by_email.get(e)
            return dict(_mem_users_by_id.get(uid) or {}) if uid else None
    sql = "SELECT * FROM users WHERE email = %s LIMIT 1"
    with get_db_cursor() as cur:
        cur.execute(sql, (_norm_email(email),))
        row = cur.fetchone()
        return _row_to_user(row)

def find_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    if _use_inmemory():
        uid = str(user_id)
        with _mem_lock:
            return dict(_mem_users_by_id.get(uid) or {}) if uid in _mem_users_by_id else None
    sql = "SELECT * FROM users WHERE id = %s LIMIT 1"
    with get_db_cursor() as cur:
        cur.execute(sql, (user_id,))
        row = cur.fetchone()
        return _row_to_user(row)

def delete_user(email: str) -> bool:
    if _use_inmemory():
        e = _norm_email(email)
        with _mem_lock:
            uid = _mem_users_by_email.pop(e, None)
            if not uid:
                return False
            _mem_users_by_id.pop(uid, None)
            return True
    sql = "DELETE FROM users WHERE email = %s RETURNING id"
    with get_db_cursor() as cur:
        cur.execute(sql, (_norm_email(email),))
        return cur.fetchone() is not None


def purge_if_demo_expired(user: Optional[Dict[str, Any]]) -> bool:
    """If *user* is a demo account whose ``demo_expires_at`` is in the past,
    delete the row and return True. Otherwise return False.

    Used on login (after password check), refresh, and authenticated API
    calls so expired demos cannot keep using tokens.
    """
    if not user or (str(user.get("role") or "") != "demo"):
        return False
    exp = _as_dt(user.get("demo_expires_at"))
    if not exp or exp > _now_utc():
        return False
    email = _norm_email(str(user.get("email") or ""))
    if not email:
        return False
    return delete_user(email)


def update_user_password(email: str, hashed_password: str) -> bool:
    if _use_inmemory():
        e = _norm_email(email)
        with _mem_lock:
            uid = _mem_users_by_email.get(e)
            if not uid:
                return False
            _mem_users_by_id[uid]["password_hash"] = hashed_password
            return True
    sql = "UPDATE users SET password_hash = %s WHERE email = %s RETURNING id"
    with get_db_cursor() as cur:
        cur.execute(sql, (hashed_password, _norm_email(email)))
        return cur.fetchone() is not None

def update_user_role(email: str, role: str) -> bool:
    if _use_inmemory():
        e = _norm_email(email)
        with _mem_lock:
            uid = _mem_users_by_email.get(e)
            if not uid:
                return False
            _mem_users_by_id[uid]["role"] = role
            return True
    sql = "UPDATE users SET role = %s WHERE email = %s RETURNING id"
    with get_db_cursor() as cur:
        cur.execute(sql, (role, _norm_email(email)))
        return cur.fetchone() is not None

def update_user_active(email: str, is_active: bool) -> bool:
    if _use_inmemory():
        e = _norm_email(email)
        with _mem_lock:
            uid = _mem_users_by_email.get(e)
            if not uid:
                return False
            _mem_users_by_id[uid]["is_active"] = bool(is_active)
            return True
    sql = "UPDATE users SET is_active = %s WHERE email = %s RETURNING id"
    with get_db_cursor() as cur:
        cur.execute(sql, (is_active, _norm_email(email)))
        return cur.fetchone() is not None

def update_user_login(user_id: str, ip: str, refresh_hash: str):
    if _use_inmemory():
        uid = str(user_id)
        with _mem_lock:
            if uid not in _mem_users_by_id:
                return
            u = _mem_users_by_id[uid]
            u["last_login_at"] = _now_utc()
            u["last_login_ip"] = ip
            u["refresh_token_hash"] = refresh_hash
            u["failed_login_attempts"] = 0
            u["locked_until"] = None
        return
    sql = """
        UPDATE users 
        SET last_login_at = NOW(), last_login_ip = %s, refresh_token_hash = %s, failed_login_attempts = 0
        WHERE id = %s
    """
    with get_db_cursor() as cur:
        cur.execute(sql, (ip, refresh_hash, user_id))

def get_user_token_version(user_id: str) -> int:
    """Returns current token_version; returns -1 for a missing user row so
    comparisons with incoming token claims fail closed (prevents ghost auth
    after account deletion)."""
    if _use_inmemory():
        uid = str(user_id)
        with _mem_lock:
            u = _mem_users_by_id.get(uid)
            if not u:
                return -1
            return int(u.get("token_version") or 1)
    sql = "SELECT token_version FROM users WHERE id = %s"
    with get_db_cursor() as cur:
        cur.execute(sql, (user_id,))
        row = cur.fetchone()
        if not row:
            return -1
        return int(row.get("token_version") or 1)

def increment_token_version(user_id: str):
    """Global Logout: Invalidates all existing tokens"""
    if _use_inmemory():
        uid = str(user_id)
        with _mem_lock:
            if uid in _mem_users_by_id:
                _mem_users_by_id[uid]["token_version"] = int(_mem_users_by_id[uid].get("token_version") or 1) + 1
        return
    sql = "UPDATE users SET token_version = token_version + 1 WHERE id = %s"
    with get_db_cursor() as cur:
        cur.execute(sql, (user_id,))

def increment_failed_login(email: str):
    """
    Increment failed login attempts and lock account if threshold reached.
    Lock for 15 minutes after 5 failed attempts.
    """
    if _use_inmemory():
        e = _norm_email(email)
        with _mem_lock:
            uid = _mem_users_by_email.get(e)
            if not uid:
                return
            u = _mem_users_by_id[uid]
            n = int(u.get("failed_login_attempts") or 0) + 1
            u["failed_login_attempts"] = n
            if n >= 5:
                u["locked_until"] = _now_utc() + timedelta(minutes=15)
            else:
                u["locked_until"] = None
        return
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
    if _use_inmemory():
        uid = str(user_id)
        with _mem_lock:
            if uid in _mem_users_by_id:
                _mem_users_by_id[uid]["failed_login_attempts"] = 0
                _mem_users_by_id[uid]["locked_until"] = None
        return
    sql = """
        UPDATE users 
        SET failed_login_attempts = 0, locked_until = NULL
        WHERE id = %s
    """
    with get_db_cursor() as cur:
        cur.execute(sql, (user_id,))

def is_account_locked(email: str) -> bool:
    if _use_inmemory():
        e = _norm_email(email)
        with _mem_lock:
            uid = _mem_users_by_email.get(e)
            if not uid:
                return False
            locked_until = _as_dt(_mem_users_by_id[uid].get("locked_until"))
        return bool(locked_until and locked_until > _now_utc())
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
    if _use_inmemory():
        uid = str(user_id)
        with _mem_lock:
            if uid not in _mem_users_by_id:
                return False
            _mem_users_by_id[uid]["locked_until"] = _now_utc() + timedelta(minutes=int(duration_minutes))
            return True
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
    if _use_inmemory():
        uid = str(user_id)
        with _mem_lock:
            if uid not in _mem_users_by_id:
                return False
            _mem_users_by_id[uid]["locked_until"] = None
            _mem_users_by_id[uid]["failed_login_attempts"] = 0
            return True
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
    if _use_inmemory():
        with _mem_lock:
            logs = list(_mem_audit_logs)
        if user_id:
            logs = [l for l in logs if str(l.get("user_id") or "") == str(user_id)]
        logs.sort(key=lambda x: x.get("created_at") or _now_utc(), reverse=True)
        return logs[: int(limit)]
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

def list_users(limit=100, offset=0, role: str = None, search: str = None, is_active: Optional[bool] = None) -> List[Dict[str, Any]]:
    if _use_inmemory():
        with _mem_lock:
            users = list(_mem_users_by_id.values())
        if role:
            users = [u for u in users if u.get("role") == role]
        if is_active is not None:
            users = [u for u in users if bool(u.get("is_active", True)) == bool(is_active)]
        q = (search or "").strip().lower()
        if q:
            users = [
                u
                for u in users
                if q in str(u.get("email") or "").lower()
                or q in str(u.get("first_name") or "").lower()
                or q in str(u.get("last_name") or "").lower()
            ]
        users.sort(key=lambda x: x.get("created_at") or _now_utc(), reverse=True)
        return [dict(u) for u in users[int(offset) : int(offset) + int(limit)]]
    sql = "SELECT * FROM users"
    where = []
    params = []
    if role:
        where.append("role = %s")
        params.append(role)
    if is_active is not None:
        where.append("is_active = %s")
        params.append(bool(is_active))
    q = (search or "").strip().lower()
    if q:
        where.append("(LOWER(email) LIKE %s OR LOWER(COALESCE(first_name,'')) LIKE %s OR LOWER(COALESCE(last_name,'')) LIKE %s)")
        like = f"%{q}%"
        params.extend([like, like, like])
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
    params.extend([limit, offset])
        
    with get_db_cursor() as cur:
        cur.execute(sql, tuple(params))
        rows = cur.fetchall()
        return [_row_to_user(r) for r in rows]


def update_user_profile(
    email: str,
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
) -> bool:
    if _use_inmemory():
        e = _norm_email(email)
        with _mem_lock:
            uid = _mem_users_by_email.get(e)
            if not uid:
                return False
            u = _mem_users_by_id[uid]
            if first_name is not None:
                u["first_name"] = str(first_name or "")
            if last_name is not None:
                u["last_name"] = str(last_name or "")
            if role is not None:
                u["role"] = str(role)
            if is_active is not None:
                u["is_active"] = bool(is_active)
            return True

    sets = []
    params = []
    if first_name is not None:
        sets.append("first_name = %s")
        params.append(str(first_name or ""))
    if last_name is not None:
        sets.append("last_name = %s")
        params.append(str(last_name or ""))
    if role is not None:
        sets.append("role = %s")
        params.append(str(role))
    if is_active is not None:
        sets.append("is_active = %s")
        params.append(bool(is_active))
    if not sets:
        return True
    params.append(_norm_email(email))
    sql = f"UPDATE users SET {', '.join(sets)} WHERE email = %s RETURNING id"
    with get_db_cursor() as cur:
        cur.execute(sql, tuple(params))
        return cur.fetchone() is not None


# Whitelist of columns allowed to be updated via update_user_fields_by_id.
# Keeping this explicit prevents arbitrary column writes if a caller ever
# forwards untrusted keys (defense in depth against SQL-injection via
# identifier interpolation).
_ALLOWED_USER_UPDATE_COLUMNS = {
    "first_name",
    "last_name",
    "email",
    "role",
    "is_active",
    "is_verified",
    "payment_card_on_file",
    "trial_ends_at",
    "demo_expires_at",
    "used_discount_code",
    "subscription_plan",
    "subscription_status",
    "last_login_at",
    "last_login_ip",
    "refresh_token_hash",
    "failed_login_attempts",
    "locked_until",
    "reset_password_token",
    "reset_password_expires_at",
    "verification_token",
    "mfa_enabled",
    "mfa_secret",
    "enterprise_inquiry",
}


def update_user_fields_by_id(user_id: str, fields: Dict[str, Any]) -> bool:
    if not fields:
        return True
    uid = str(user_id)
    safe_fields = {k: v for k, v in fields.items() if k in _ALLOWED_USER_UPDATE_COLUMNS}
    rejected = set(fields.keys()) - set(safe_fields.keys())
    if rejected:
        logger.warning("update_user_fields_by_id: rejected columns %s", sorted(rejected))
    if not safe_fields:
        return True
    if _use_inmemory():
        with _mem_lock:
            u = _mem_users_by_id.get(uid)
            if not u:
                return False
            for k, v in safe_fields.items():
                u[k] = v
            return True
    cols = []
    params: List[Any] = []
    for k, v in safe_fields.items():
        cols.append(f"{k} = %s")
        params.append(v)
    params.append(uid)
    sql = f"UPDATE users SET {', '.join(cols)} WHERE id = %s RETURNING id"
    with get_db_cursor() as cur:
        cur.execute(sql, tuple(params))
        return cur.fetchone() is not None


# --- Session Operations ---

def create_session(user_id: str, refresh_hash: str, fingerprint: str, ip: str, ua: str, expires_at: datetime):
    if _use_inmemory():
        with _mem_lock:
            _mem_sessions_by_hash[str(refresh_hash)] = {
                "id": str(uuid.uuid4()),
                "user_id": str(user_id),
                "refresh_token_hash": str(refresh_hash),
                "device_fingerprint": fingerprint,
                "ip_address": ip,
                "user_agent": ua,
                "expires_at": _as_dt(expires_at) or (_now_utc() + timedelta(days=7)),
                "is_revoked": False,
                "revoked_at": None,
                "revoked_reason": None,
                "created_at": _now_utc(),
            }
        return

    # Bazı eski ortamlarda sessions.id için DEFAULT yoktu; id'yi uygulama seviyesinde üret.
    sid = str(uuid.uuid4())
    sql = """
        INSERT INTO sessions (id, user_id, refresh_token_hash, device_fingerprint, ip_address, user_agent, expires_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """
    with get_db_cursor() as cur:
        cur.execute(sql, (sid, user_id, refresh_hash, fingerprint, ip, ua, expires_at))

def revoke_session(refresh_hash: str, reason: str = "logout"):
    if _use_inmemory():
        h = str(refresh_hash)
        with _mem_lock:
            s = _mem_sessions_by_hash.get(h)
            if not s:
                return
            s["is_revoked"] = True
            s["revoked_at"] = _now_utc()
            s["revoked_reason"] = reason
        return
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
    if _use_inmemory():
        h = str(old_refresh_hash)
        with _mem_lock:
            s = _mem_sessions_by_hash.get(h)
            if not s:
                return False
            if s.get("is_revoked") is True:
                return False
            exp = _as_dt(s.get("expires_at"))
            if exp and exp <= _now_utc():
                return False
            s["is_revoked"] = True
            s["revoked_at"] = _now_utc()
            s["revoked_reason"] = reason
            return True
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
    if _use_inmemory():
        h = str(refresh_hash)
        with _mem_lock:
            s = _mem_sessions_by_hash.get(h)
            if not s:
                return False
            if s.get("is_revoked") is True:
                return False
            exp = _as_dt(s.get("expires_at"))
            return bool(not exp or exp > _now_utc())
    sql = """
        SELECT id FROM sessions 
        WHERE refresh_token_hash = %s AND is_revoked = FALSE AND expires_at > NOW()
    """
    with get_db_cursor() as cur:
        cur.execute(sql, (refresh_hash,))
        return cur.fetchone() is not None

# --- Audit Logs ---

def update_user_verification(token: str) -> bool:
    if _use_inmemory():
        tok = str(token)
        with _mem_lock:
            for u in _mem_users_by_id.values():
                if str(u.get("verification_token") or "") == tok:
                    u["is_verified"] = True
                    u["verification_token"] = None
                    return True
        return False
    sql = """
        UPDATE users 
        SET is_verified = TRUE, verification_token = NULL 
        WHERE verification_token = %s
        RETURNING id
    """
    with get_db_cursor() as cur:
        cur.execute(sql, (token,))
        return cur.fetchone() is not None

def get_user_by_reset_token(token: str) -> Optional[Dict[str, Any]]:
    if _use_inmemory():
        tok = str(token)
        now = _now_utc()
        with _mem_lock:
            for u in _mem_users_by_id.values():
                if str(u.get("reset_password_token") or "") == tok:
                    exp = _as_dt(u.get("reset_password_expires_at"))
                    if exp and exp > now:
                        return dict(u)
        return None
    sql = "SELECT * FROM users WHERE reset_password_token = %s AND reset_password_expires_at > NOW()"
    with get_db_cursor() as cur:
        cur.execute(sql, (token,))
        row = cur.fetchone()
        return _row_to_user(row)

def update_password(user_id: str, hashed_password: str):
    """Updates the password and invalidates every existing session/access
    token by bumping token_version and revoking all outstanding sessions.
    This prevents a stolen pre-reset refresh or access token from surviving
    a password change."""
    uid = str(user_id)
    if _use_inmemory():
        with _mem_lock:
            if uid not in _mem_users_by_id:
                return
            u = _mem_users_by_id[uid]
            u["password_hash"] = hashed_password
            u["reset_password_token"] = None
            u["reset_password_expires_at"] = None
            u["token_version"] = int(u.get("token_version") or 1) + 1
            now = _now_utc()
            for h, s in list(_mem_sessions_by_hash.items()):
                if str(s.get("user_id")) == uid and not s.get("is_revoked"):
                    s["is_revoked"] = True
                    s["revoked_at"] = now
                    s["revoked_reason"] = "password_reset"
        return
    with get_db_cursor() as cur:
        cur.execute(
            """
            UPDATE users
            SET password_hash = %s,
                reset_password_token = NULL,
                reset_password_expires_at = NULL,
                token_version = COALESCE(token_version, 1) + 1
            WHERE id = %s
            """,
            (hashed_password, uid),
        )
        cur.execute(
            """
            UPDATE sessions
            SET is_revoked = TRUE,
                revoked_at = NOW(),
                revoked_reason = COALESCE(revoked_reason, 'password_reset')
            WHERE user_id = %s AND is_revoked = FALSE
            """,
            (uid,),
        )


def get_user_mfa(user_id: Optional[str] = None, email: Optional[str] = None) -> Dict[str, Any]:
    if not user_id and not email:
        return {"enabled": False, "secret": ""}
    if _use_inmemory():
        with _mem_lock:
            uid = str(user_id) if user_id else _mem_users_by_email.get(_norm_email(email or ""))
            u = _mem_users_by_id.get(uid) if uid else None
            return {"enabled": bool(u.get("mfa_enabled")) if u else False, "secret": str(u.get("mfa_secret") or "") if u else ""}

    try:
        with get_db_cursor() as cur:
            cur.execute(
                "SELECT mfa_enabled, mfa_secret FROM users WHERE id = %s LIMIT 1" if user_id else "SELECT mfa_enabled, mfa_secret FROM users WHERE email = %s LIMIT 1",
                (str(user_id) if user_id else _norm_email(email or ""),),
            )
            row = cur.fetchone() or {}
    except Exception:
        return {"enabled": False, "secret": ""}

    enabled = bool(row.get("mfa_enabled") or False)
    raw = str(row.get("mfa_secret") or "")
    if not raw:
        return {"enabled": enabled, "secret": ""}
    try:
        return {"enabled": enabled, "secret": decrypt_value(raw)}
    except Exception:
        return {"enabled": enabled, "secret": raw}


def set_user_mfa(user_id: str, secret: str, enabled: bool = True) -> bool:
    uid = str(user_id)
    if _use_inmemory():
        with _mem_lock:
            if uid not in _mem_users_by_id:
                return False
            _mem_users_by_id[uid]["mfa_enabled"] = bool(enabled)
            _mem_users_by_id[uid]["mfa_secret"] = str(secret or "")
            return True

    try:
        enc = encrypt_value(secret or "")
    except Exception:
        enc = str(secret or "")
    try:
        with get_db_cursor() as cur:
            cur.execute(
                "UPDATE users SET mfa_enabled = %s, mfa_secret = %s WHERE id = %s RETURNING id",
                (bool(enabled), enc, uid),
            )
            return cur.fetchone() is not None
    except Exception:
        return False


def disable_user_mfa(user_id: str) -> bool:
    uid = str(user_id)
    if _use_inmemory():
        with _mem_lock:
            if uid not in _mem_users_by_id:
                return False
            _mem_users_by_id[uid]["mfa_enabled"] = False
            _mem_users_by_id[uid]["mfa_secret"] = ""
            return True

    try:
        with get_db_cursor() as cur:
            cur.execute(
                "UPDATE users SET mfa_enabled = FALSE, mfa_secret = NULL WHERE id = %s RETURNING id",
                (uid,),
            )
            return cur.fetchone() is not None
    except Exception:
        return False

def log_audit(user_id: Optional[str], action: str, resource: str = None, details: Dict = None, ip: str = None, ua: str = None):
    if (os.getenv("AUDIT_LOG_ENABLED", "true") or "").lower() != "true":
        return
    if _use_inmemory():
        with _mem_lock:
            _mem_audit_logs.append(
                {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "action": action,
                    "resource": resource,
                    "details": details,
                    "ip_address": ip,
                    "user_agent": ua,
                    "created_at": _now_utc(),
                }
            )
        return
    status = get_pool_status()
    if status.get("status") != "active":
        return
    import json
    sql = """
        INSERT INTO audit_logs (user_id, action, resource, details, ip_address, user_agent)
        VALUES (%s, %s, %s, %s, %s, %s)
    """
    with get_db_cursor() as cur:
        # details JSON serialization fix
        d_json = json.dumps(details) if details else None
        cur.execute(sql, (user_id, action, resource, d_json, ip, ua))
