from __future__ import annotations

import os, json, secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Body, Request, Header, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field, field_validator

from admin_auth import require_admin, issue_admin_token, ADMIN_TOKEN_COOKIE
from security import hash_password, verify_password, sanitize_user_for_response
from stores.pg_users_store import (
    create_user, find_user_by_email, find_user_by_id, list_users,
    delete_user, update_user_role, update_user_password, update_user_active,
    lock_user, unlock_user, get_audit_logs,
    log_audit, update_user_profile, get_user_mfa, set_user_mfa, disable_user_mfa
)
from stores.demo_users_store import read_demo_users, write_demo_users, purge_expired_demo_users # Keep for demo requests mostly
from stores.demo_requests_store import list_demo_requests as store_list_demo_requests, approve_demo_request as store_approve_demo_request, reject_demo_request as store_reject_demo_request
from services.mail_service import send_reset_password_email
from utils.totp import generate_base32_secret, verify_totp
from admin_auth import get_admin_sessions, revoke_admin_session
from user_auth import get_current_user, user_has_admin_role
from admin_panel_gate import (
    COOKIE_NAME as ADMIN_PANEL_GATE_COOKIE,
    issue_admin_panel_gate_jwt,
    verify_admin_panel_gate,
    require_admin_panel_gate,
)

# ------------------------
# Storage (JSON files for temp data)
# ------------------------
DATA_DIR = Path(os.getenv("DATA_DIR") or "data")
DATA_DIR.mkdir(parents=True, exist_ok=True)

DEMO_REQUESTS_FILE = DATA_DIR / "demo_requests.json"
SYSTEM_CONFIG_FILE = DATA_DIR / "system_config.json"

def _now() -> datetime:
    return datetime.now(timezone.utc)

def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()

def _load_json(path: Path, default):
    if not path.exists():
        return default
    try:
        with path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default

def _atomic_write_json(path: Path, data) -> None:
    import tempfile
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=path.name + ".", dir=str(path.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)
    finally:
        try:
            if os.path.exists(tmp):
                os.remove(tmp)
        except Exception:
            pass

# ------------------------
# Models
# ------------------------
class SetPasswordIn(BaseModel):
    password: str = Field(min_length=4, max_length=128)

class AdminLoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=4, max_length=128)
    otp: Optional[str] = Field(default=None, max_length=12)

class CreateUserIn(BaseModel):
    firstName: str = Field(default="", max_length=64)
    lastName: str = Field(default="", max_length=64)
    username: str = Field(default="", max_length=128)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: str = Field(default="user", pattern="^(user|admin|demo)$")
    is_active: bool = True

class UpdateRoleIn(BaseModel):
    role: str = Field(..., pattern="^(user|admin|demo)$")

class UpdateUserIn(BaseModel):
    firstName: Optional[str] = Field(default=None, max_length=64)
    lastName: Optional[str] = Field(default=None, max_length=64)
    role: Optional[str] = Field(default=None, pattern="^(user|admin|demo)$")
    is_active: Optional[bool] = None

class BulkUsersIn(BaseModel):
    action: str = Field(..., pattern="^(activate|suspend|set_role|delete|set_password)$")
    emails: List[EmailStr] = Field(min_length=1, max_length=1000)
    role: Optional[str] = Field(default=None, pattern="^(user|admin|demo)$")
    password: Optional[str] = Field(default=None, min_length=4, max_length=128)

class ImportUsersIn(BaseModel):
    mode: str = Field(default="skip", pattern="^(skip|upsert)$")
    users: List[Dict[str, Any]] = Field(min_length=1, max_length=5000)

class SystemConfigIn(BaseModel):
    maintenance_mode: bool = False
    allow_registration: bool = True
    max_tokens_per_user: int = 1000

# ------------------------
# Router
# ------------------------
router = APIRouter(tags=["admin"])


class AdminExchangeIn(BaseModel):
    otp: Optional[str] = Field(default=None, max_length=12)


class AdminMfaSetupIn(BaseModel):
    secret: str = Field(min_length=10, max_length=128)
    otp: str = Field(min_length=6, max_length=12)


class AdminPanelUnlockIn(BaseModel):
    password: str = Field(min_length=1, max_length=256)


class AdminPanelBootstrapIn(BaseModel):
    """Tek istekte panel şifresi + isteğe bağlı 2FA; cookie + admin token."""

    password: str = Field(min_length=1, max_length=256)
    otp: Optional[str] = Field(default=None, max_length=12)

    @field_validator("password", mode="before")
    @classmethod
    def _strip_panel_password(cls, v: object) -> str:
        return str(v or "").strip()

    @field_validator("otp", mode="before")
    @classmethod
    def _normalize_panel_otp(cls, v: object) -> Optional[str]:
        if v is None:
            return None
        s = str(v).strip()
        return s or None


# ------------------------
# Admin panel password gate (httpOnly cookie; ADMIN_PANEL_PASSWORD env)
# ------------------------


@router.get("/panel-unlock/status")
def admin_panel_unlock_status(request: Request, user: Dict[str, Any] = Depends(get_current_user)):
    if not user_has_admin_role(user):
        raise HTTPException(status_code=403, detail="Bu işlem için hesabınızın rolü 'admin' olmalı.")
    configured = bool((os.getenv("ADMIN_PANEL_PASSWORD") or "").strip())
    if not configured:
        return {"unlocked": True, "configured": False}
    uid = str(user.get("id"))
    return {"unlocked": verify_admin_panel_gate(request, uid), "configured": True}


def _panel_password_ok(body_password: str, user: Dict[str, Any]) -> bool:
    """Accept env ADMIN_PANEL_PASSWORD or, as a fallback for admin accounts, the user's own login password.
    This avoids total lockout when the panel secret was rotated/lost while a verified admin is logged in.
    """
    body_pw = str(body_password or "")
    if not body_pw:
        return False
    expected = (os.getenv("ADMIN_PANEL_PASSWORD") or "").strip()
    if expected and secrets.compare_digest(body_pw, expected):
        return True
    stored_hash = str(user.get("password_hash") or user.get("hashed_password") or "")
    if stored_hash and verify_password(body_pw, stored_hash):
        return True
    return False


@router.post("/panel-unlock")
def admin_panel_unlock(body: AdminPanelUnlockIn, request: Request, user: Dict[str, Any] = Depends(get_current_user)):
    if not user_has_admin_role(user):
        raise HTTPException(status_code=403, detail="Bu işlem için hesabınızın rolü 'admin' olmalı.")

    ip = request.client.host if request.client else "127.0.0.1"
    if ip == "testclient":
        ip = "127.0.0.1"
    ua = request.headers.get("user-agent", "unknown")

    user_row = find_user_by_id(str(user.get("id"))) or user
    if not _panel_password_ok(body.password, user_row):
        log_audit(str(user.get("id")), "ADMIN_PANEL_GATE_FAIL", "auth", {"reason": "invalid_password"}, ip, ua)
        raise HTTPException(status_code=401, detail="Geçersiz şifre.")

    token = issue_admin_panel_gate_jwt(str(user.get("id")))
    log_audit(str(user.get("id")), "ADMIN_PANEL_GATE_OK", "auth", None, ip, ua)
    resp = JSONResponse({"ok": True})
    secure = request.url.scheme == "https"
    resp.set_cookie(
        key=ADMIN_PANEL_GATE_COOKIE,
        value=token,
        httponly=True,
        secure=secure,
        samesite="none" if secure else "lax",
        max_age=8 * 3600,
        path="/",
    )
    return resp


@router.post("/panel-unlock/logout")
def admin_panel_unlock_logout(request: Request, user: Dict[str, Any] = Depends(get_current_user)):
    if not user_has_admin_role(user):
        raise HTTPException(status_code=403, detail="Bu işlem için hesabınızın rolü 'admin' olmalı.")
    resp = JSONResponse({"ok": True})
    secure = request.url.scheme == "https"
    resp.delete_cookie(key=ADMIN_PANEL_GATE_COOKIE, path="/", samesite="none" if secure else "lax", secure=secure)
    return resp


def _admin_exchange_payload(request: Request, user: Dict[str, Any], otp: Optional[str], via: str = "exchange") -> Dict[str, Any]:
    """Panel kilidi aşılmış kabul edilir; MFA ve admin token üretimi."""
    if not user_has_admin_role(user):
        raise HTTPException(status_code=403, detail="Bu işlem için hesabınızın rolü 'admin' olmalı.")

    ip = request.client.host if request.client else "127.0.0.1"
    if ip == "testclient":
        ip = "127.0.0.1"
    ua = request.headers.get("user-agent", "unknown")

    mfa_required = (os.getenv("ADMIN_MFA_REQUIRED", "false") or "").lower() == "true"
    mfa = get_user_mfa(user_id=str(user.get("id")))

    if mfa_required and not bool(mfa.get("enabled")):
        secret = generate_base32_secret()
        issuer = (os.getenv("MFA_ISSUER") or "Miron AI").strip()
        email = (user.get("email") or "").strip().lower()
        label = f"{issuer}:{email or 'admin'}"
        otpauth_url = f"otpauth://totp/{label}?secret={secret}&issuer={issuer}"
        log_audit(str(user.get("id")), "ADMIN_MFA_SETUP_REQUIRED", "auth", {"via": via}, ip, ua)
        return {"ok": False, "mfa_setup_required": True, "secret": secret, "otpauth_url": otpauth_url}

    if bool(mfa.get("enabled")):
        if not otp or not verify_totp(str(mfa.get("secret") or ""), str(otp or "")):
            log_audit(str(user.get("id")), "ADMIN_MFA_FAILED", "auth", {"via": via}, ip, ua)
            raise HTTPException(status_code=401, detail="2FA doğrulaması gerekli.")

    token = issue_admin_token(admin_id=str(user.get("id")), ip=ip, ua=ua)
    log_audit(str(user.get("id")), "ADMIN_EXCHANGE_SUCCESS", "auth", None, ip, ua)
    return {"ok": True, "token": token}


@router.post("/panel-bootstrap")
def admin_panel_bootstrap(body: AdminPanelBootstrapIn, request: Request, user: Dict[str, Any] = Depends(get_current_user)):
    """Panel şifresi + (varsa) 2FA tek adımda; httpOnly gate çerezi set edilir, admin JWT döner."""
    if not user_has_admin_role(user):
        raise HTTPException(status_code=403, detail="Bu işlem için hesabınızın rolü 'admin' olmalı.")

    ip = request.client.host if request.client else "127.0.0.1"
    if ip == "testclient":
        ip = "127.0.0.1"
    ua = request.headers.get("user-agent", "unknown")

    user_row = find_user_by_id(str(user.get("id"))) or user
    if not _panel_password_ok(body.password, user_row):
        log_audit(str(user.get("id")), "ADMIN_PANEL_GATE_FAIL", "auth", {"reason": "invalid_password"}, ip, ua)
        raise HTTPException(status_code=401, detail="Geçersiz şifre.")

    gate_jwt = issue_admin_panel_gate_jwt(str(user.get("id")))
    log_audit(str(user.get("id")), "ADMIN_PANEL_GATE_OK", "auth", {"via": "panel_bootstrap"}, ip, ua)

    payload = _admin_exchange_payload(request, user, body.otp, via="panel_bootstrap")
    resp = JSONResponse(payload)
    secure = request.url.scheme == "https"
    resp.set_cookie(
        key=ADMIN_PANEL_GATE_COOKIE,
        value=gate_jwt,
        httponly=True,
        secure=secure,
        samesite="none" if secure else "lax",
        max_age=8 * 3600,
        path="/",
    )
    admin_token = payload.get("token") or payload.get("access_token") or ""
    if admin_token:
        resp.set_cookie(
            key=ADMIN_TOKEN_COOKIE,
            value=admin_token,
            httponly=True,
            secure=secure,
            samesite="none" if secure else "lax",
            max_age=12 * 3600,
            path="/",
        )
    return resp


# ------------------------
# Admin Accounts & Login
# ------------------------

def _bootstrap_default_admin() -> None:
    if (os.getenv("BOOTSTRAP_MODE", "false") or "").lower() != "true":
        return
    default_email = os.getenv("DEFAULT_ADMIN_EMAIL") or "cdtmiron@gmail.com"
    default_pw = os.getenv("DEFAULT_ADMIN_PASSWORD")
    
    admin = find_user_by_email(default_email)
    if admin and not user_has_admin_role(admin):
        update_user_role(default_email, "admin")
        update_user_active(default_email, True)
        log_audit(str(admin.get("id")), "ADMIN_BOOTSTRAP_PROMOTE", "system", {"email": default_email})
        return

    if not admin:
        if not default_pw:
            return
        create_user({
            "email": default_email,
            "firstName": "System",
            "lastName": "Admin",
            "hashed_password": hash_password(default_pw),
            "role": "admin",
            "is_active": True
        })
        log_audit(None, "ADMIN_BOOTSTRAP", "system", {"email": default_email})


@router.post("/bootstrap/promote")
def bootstrap_promote_admin(
    email: str = Body(..., embed=True),
    x_bootstrap_token: Optional[str] = Header(default=None),
):
    if (os.getenv("BOOTSTRAP_MODE", "false") or "").lower() != "true":
        raise HTTPException(status_code=403, detail="Bootstrap modu kapalı.")
    token = (os.getenv("BOOTSTRAP_TOKEN") or "").strip()
    if not token:
        raise HTTPException(status_code=500, detail="BOOTSTRAP_TOKEN eksik.")
    if (x_bootstrap_token or "").strip() != token:
        raise HTTPException(status_code=401, detail="Geçersiz bootstrap token.")

    target = str(email or "").strip().lower()
    if not target:
        raise HTTPException(status_code=400, detail="E-posta gerekli.")
    user = find_user_by_email(target)
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")

    ok = update_user_role(target, "admin")
    if not ok:
        raise HTTPException(status_code=500, detail="Rol güncellenemedi.")
    log_audit(str(user.get("id")), "ADMIN_BOOTSTRAP_PROMOTE", "system", {"email": target})
    return {"ok": True, "email": target, "role": "admin"}

@router.post("/login")
def admin_login(body: AdminLoginIn, request: Request):
    _bootstrap_default_admin()
    
    email = str(body.email).strip().lower()
    user = find_user_by_email(email)
    
    ip = request.client.host if request.client else "127.0.0.1"
    if ip == "testclient": ip = "127.0.0.1"
    ua = request.headers.get("user-agent", "unknown")

    if (os.getenv("BOOTSTRAP_MODE", "false") or "").lower() == "true":
        default_email = os.getenv("DEFAULT_ADMIN_EMAIL") or "cdtmiron@gmail.com"
        if email == default_email and body.password == os.getenv("DEFAULT_ADMIN_PASSWORD"):
            if not user:
                raise HTTPException(status_code=401, detail="Admin kullanıcı bulunamadı. Önce bootstrap tamamlanmalı.")

    if not user or not verify_password(body.password, user.get("password_hash") or user.get("hashed_password")):
        log_audit(None, "ADMIN_LOGIN_FAILED", email, {"reason": "invalid_credentials"}, ip, ua)
        raise HTTPException(status_code=401, detail="Geçersiz admin bilgileri.")
        
    if not user_has_admin_role(user):
        log_audit(str(user["id"]), "ADMIN_LOGIN_DENIED", email, {"reason": "not_admin"}, ip, ua)
        raise HTTPException(status_code=403, detail="Bu hesap yönetici rolünde değil.")

    mfa_required = (os.getenv("ADMIN_MFA_REQUIRED", "false") or "").lower() == "true"
    mfa = get_user_mfa(user_id=str(user.get("id")))
    if mfa_required and not bool(mfa.get("enabled")):
        secret = generate_base32_secret()
        issuer = (os.getenv("MFA_ISSUER") or "Miron AI").strip()
        label = f"{issuer}:{email}"
        otpauth_url = f"otpauth://totp/{label}?secret={secret}&issuer={issuer}"
        log_audit(str(user["id"]), "ADMIN_MFA_SETUP_REQUIRED", "auth", {"email": email}, ip, ua)
        return {"ok": False, "mfa_setup_required": True, "secret": secret, "otpauth_url": otpauth_url}

    if bool(mfa.get("enabled")):
        if not body.otp or not verify_totp(str(mfa.get("secret") or ""), str(body.otp or "")):
            log_audit(str(user["id"]), "ADMIN_MFA_FAILED", "auth", {"email": email}, ip, ua)
            raise HTTPException(status_code=401, detail="2FA doğrulaması başarısız.")

    token = issue_admin_token(admin_id=str(user["id"]), ip=ip, ua=ua)
    log_audit(str(user["id"]), "ADMIN_LOGIN_SUCCESS", "auth", None, ip, ua)
    
    return {
        "ok": True,
        "token": token,
        "admin": sanitize_user_for_response(user),
    }


class AdminMfaConfirmIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=4, max_length=128)
    secret: str = Field(min_length=10, max_length=128)
    otp: str = Field(min_length=6, max_length=12)


@router.post("/2fa/confirm")
def admin_mfa_confirm(body: AdminMfaConfirmIn, request: Request):
    email = str(body.email).strip().lower()
    user = find_user_by_email(email)
    ip = request.client.host if request.client else "127.0.0.1"
    if ip == "testclient":
        ip = "127.0.0.1"
    ua = request.headers.get("user-agent", "unknown")

    if not user or not verify_password(body.password, user.get("password_hash") or user.get("hashed_password")):
        log_audit(None, "ADMIN_MFA_CONFIRM_FAILED", email, {"reason": "invalid_credentials"}, ip, ua)
        raise HTTPException(status_code=401, detail="Geçersiz admin bilgileri.")
    if not user_has_admin_role(user):
        raise HTTPException(status_code=403, detail="Bu hesap yönetici rolünde değil.")

    secret = str(body.secret or "").strip()
    if not verify_totp(secret, str(body.otp or "")):
        log_audit(str(user["id"]), "ADMIN_MFA_CONFIRM_FAILED", "auth", {"reason": "invalid_otp"}, ip, ua)
        raise HTTPException(status_code=401, detail="Geçersiz doğrulama kodu.")

    if not set_user_mfa(str(user["id"]), secret, enabled=True):
        raise HTTPException(status_code=500, detail="2FA kaydedilemedi.")

    token = issue_admin_token(admin_id=str(user["id"]), ip=ip, ua=ua)
    log_audit(str(user["id"]), "ADMIN_MFA_ENABLED", "auth", None, ip, ua)
    resp = JSONResponse({"ok": True, "token": token, "admin": sanitize_user_for_response(user)})
    secure = request.url.scheme == "https"
    resp.set_cookie(
        key=ADMIN_TOKEN_COOKIE,
        value=token,
        httponly=True,
        secure=secure,
        samesite="none" if secure else "lax",
        max_age=12 * 3600,
        path="/",
    )
    return resp


@router.post("/exchange")
def admin_exchange(body: AdminExchangeIn, request: Request, user: Dict[str, Any] = Depends(require_admin_panel_gate)):
    payload = _admin_exchange_payload(request, user, body.otp)
    resp = JSONResponse(payload)
    admin_token = payload.get("token") or payload.get("access_token") or ""
    if admin_token:
        secure = request.url.scheme == "https"
        resp.set_cookie(
            key=ADMIN_TOKEN_COOKIE,
            value=admin_token,
            httponly=True,
            secure=secure,
            samesite="none" if secure else "lax",
            max_age=12 * 3600,
            path="/",
        )
    return resp


@router.post("/2fa/setup")
def admin_mfa_setup(body: AdminMfaSetupIn, request: Request, user: Dict[str, Any] = Depends(require_admin_panel_gate)):
    if not user_has_admin_role(user):
        raise HTTPException(status_code=403, detail="Bu işlem için hesabınızın rolü 'admin' olmalı.")

    ip = request.client.host if request.client else "127.0.0.1"
    if ip == "testclient":
        ip = "127.0.0.1"
    ua = request.headers.get("user-agent", "unknown")

    secret = str(body.secret or "").strip()
    if not verify_totp(secret, str(body.otp or "")):
        log_audit(str(user.get("id")), "ADMIN_MFA_CONFIRM_FAILED", "auth", {"via": "exchange"}, ip, ua)
        raise HTTPException(status_code=401, detail="Geçersiz doğrulama kodu.")

    if not set_user_mfa(str(user.get("id")), secret, enabled=True):
        raise HTTPException(status_code=500, detail="2FA kaydedilemedi.")
    log_audit(str(user.get("id")), "ADMIN_MFA_ENABLED", "auth", {"via": "exchange"}, ip, ua)
    return {"ok": True}


@router.post("/2fa/disable")
def admin_mfa_disable(admin: Dict[str, Any] = Depends(require_admin)):
    if not disable_user_mfa(str(admin.get("admin_id"))):
        raise HTTPException(status_code=500, detail="2FA kapatılamadı.")
    log_audit(str(admin.get("admin_id")), "ADMIN_MFA_DISABLED", "auth")
    return {"ok": True}

@router.get("/admins", dependencies=[Depends(require_admin)])
def list_admins():
    users = list_users(role="admin")
    return [sanitize_user_for_response(u) for u in users]

@router.post("/create-admin")
def create_admin(body: CreateUserIn, admin: Dict[str, Any] = Depends(require_admin)):
    # Same as create user but role=admin
    if find_user_by_email(body.email):
        raise HTTPException(status_code=409, detail="Admin zaten mevcut.")
    
    user_data = {
        "email": body.email,
        "firstName": body.firstName,
        "lastName": body.lastName,
        "hashed_password": hash_password(body.password),
        "role": "admin",
        "is_active": True
    }
    uid = create_user(user_data)
    log_audit(str(admin.get("admin_id")), "ADMIN_CREATE_ADMIN", str(body.email), {"new_admin_id": uid})
    
    return {"ok": True, "id": uid}

@router.get("/health", dependencies=[Depends(require_admin)])
def admin_health():
    return {"ok": True, "ts": _iso(_now())}

# ------------------------
# Demo Requests (DB)
# ------------------------
@router.get("/demo-requests", dependencies=[Depends(require_admin)])
def list_demo_requests():
    rows = store_list_demo_requests()
    return rows[:200]

@router.post("/demo-requests/{request_id}/approve")
def approve_demo_request(request_id: str, admin: Dict[str, Any] = Depends(require_admin)):
    row = store_approve_demo_request(request_id)
    if not row:
        raise HTTPException(status_code=404, detail="Demo talebi bulunamadı.")

    email = str(row.get("email") or "").strip().lower()
    approved_until = row.get("approved_until")
    if email:
        u = find_user_by_email(email)
        if u:
            update_user_role(email, "demo")
            try:
                update_user_profile(email, role="demo", is_active=True)
            except Exception:
                pass
        else:
            import secrets
            from datetime import timedelta, timezone

            tmp_pw = secrets.token_urlsafe(12)
            reset_token = secrets.token_urlsafe(32)
            expires = datetime.now(timezone.utc) + timedelta(hours=6)
            uid = create_user(
                {
                    "email": email,
                    "firstName": "",
                    "lastName": "",
                    "hashed_password": hash_password(tmp_pw),
                    "role": "demo",
                    "is_active": True,
                    "is_verified": True,
                    "demo_expires_at": approved_until,
                    "reset_password_token": reset_token,
                    "reset_password_expires_at": expires,
                }
            )
            try:
                send_reset_password_email(email, reset_token)
            except Exception:
                pass
            log_audit(str(admin.get("admin_id")), "DEMO_USER_CREATED", email, {"new_user_id": uid})

    log_audit(str(admin.get("admin_id")), "DEMO_APPROVE", email, {"approved_until": str(approved_until)})
    return {"ok": True, "email": email, "approved_until": approved_until}

@router.post("/demo-requests/{request_id}/reject")
def reject_demo_request(request_id: str, admin: Dict[str, Any] = Depends(require_admin)):
    row = store_reject_demo_request(request_id)
    if not row:
        raise HTTPException(status_code=404, detail="Demo talebi bulunamadı.")

    email = row.get("email")
    log_audit(str(admin.get("admin_id")), "DEMO_REJECT", email)
    return {"ok": True, "email": email}

# ------------------------
# User Management (PG)
# ------------------------
@router.get("/users")
def list_all_users(
    search: Optional[str] = None,
    role: Optional[str] = None,
    active: Optional[bool] = None,
    limit: int = 200,
    offset: int = 0,
    admin: Dict[str, Any] = Depends(require_admin),
):
    arr = list_users(limit=int(limit), offset=int(offset), role=role, search=search, is_active=active)
    return [sanitize_user_for_response(u) for u in arr]

@router.post("/users")
def admin_create_user(body: CreateUserIn, admin: Dict[str, Any] = Depends(require_admin)):
    if find_user_by_email(body.email):
        raise HTTPException(status_code=409, detail="Bu email zaten var.")

    try:
        from auth_router import _validate_password_complexity

        _validate_password_complexity(body.password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    fn = (body.firstName or "").strip()
    ln = (body.lastName or "").strip()
    un = (body.username or "").strip()
    if un and (not fn and not ln):
        parts = un.split()
        fn = parts[0]
        ln = " ".join(parts[1:]) if len(parts) > 1 else ""

    role = str(body.role or "user").strip().lower()
    if role not in {"user", "admin", "demo"}:
        role = "user"

    try:
        uid = create_user({
            "email": body.email,
            "firstName": fn or None,
            "lastName": ln or None,
            "hashed_password": hash_password(body.password),
            "role": role,
            "is_active": bool(body.is_active),
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Kullanıcı oluşturulamadı: {e}") from e

    log_audit(str(admin.get("admin_id")), "USER_CREATE", str(body.email), {"new_user_id": uid, "role": role})
    return {"ok": True, "id": uid}

@router.delete("/users/{email}")
def admin_delete_user(email: str, admin: Dict[str, Any] = Depends(require_admin)):
    if not delete_user(email):
        raise HTTPException(status_code=404, detail="User bulunamadı.")

    log_audit(str(admin.get("admin_id")), "USER_DELETE", email)
    return {"ok": True}

@router.post("/users/{email}/set-password")
def admin_set_password(email: str, body: SetPasswordIn, admin: Dict[str, Any] = Depends(require_admin)):
    if not update_user_password(email, hash_password(body.password)):
        raise HTTPException(status_code=404, detail="User bulunamadı.")

    log_audit(str(admin.get("admin_id")), "USER_SET_PASSWORD", email)
    return {"ok": True}

@router.put("/users/{email}/role")
def admin_update_role(email: str, body: UpdateRoleIn, admin: Dict[str, Any] = Depends(require_admin)):
    if not update_user_role(email, body.role):
        raise HTTPException(status_code=404, detail="User bulunamadı.")

    log_audit(str(admin.get("admin_id")), "USER_ROLE_UPDATE", email, {"new_role": body.role})
    return {"ok": True, "role": body.role}

@router.put("/users/{email}/suspend")
def admin_toggle_suspend(email: str, active: bool = Body(..., embed=True), admin: Dict[str, Any] = Depends(require_admin)):
    if not update_user_active(email, active):
        raise HTTPException(status_code=404, detail="User bulunamadı.")

    log_audit(str(admin.get("admin_id")), "USER_SUSPEND_TOGGLE", email, {"is_active": active})
    return {"ok": True, "is_active": active}

@router.post("/users/{user_id}/lock")
def admin_lock_user(user_id: str, admin: Dict[str, Any] = Depends(require_admin)):
    if not lock_user(user_id):
        raise HTTPException(status_code=404, detail="User bulunamadı.")

    log_audit(str(admin.get("admin_id")), "USER_LOCKED", user_id)
    return {"ok": True}

@router.post("/users/{user_id}/unlock")
def admin_unlock_user(user_id: str, admin: Dict[str, Any] = Depends(require_admin)):
    if not unlock_user(user_id):
        raise HTTPException(status_code=404, detail="User bulunamadı.")

    log_audit(str(admin.get("admin_id")), "USER_UNLOCKED", user_id)
    return {"ok": True}

@router.post("/users/{user_id}/reset-password")
def admin_reset_password_by_id(user_id: str, body: SetPasswordIn, admin: Dict[str, Any] = Depends(require_admin)):
    # Need to find email from ID first? Or update store to use ID.
    # Update_user_password uses EMAIL.
    # Let's find user first.
    user = find_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User bulunamadı.")
        
    if not update_user_password(user["email"], hash_password(body.password)):
        raise HTTPException(status_code=500, detail="Update failed.")

    log_audit(str(admin.get("admin_id")), "USER_RESET_PASSWORD", user["email"])
    return {"ok": True}


@router.put("/users/{email}")
def admin_update_user(email: str, body: UpdateUserIn, admin: Dict[str, Any] = Depends(require_admin)):
    ok = update_user_profile(
        email,
        first_name=body.firstName,
        last_name=body.lastName,
        role=body.role,
        is_active=body.is_active,
    )
    if not ok:
        raise HTTPException(status_code=404, detail="User bulunamadı.")
    log_audit(
        str(admin.get("admin_id")),
        "USER_UPDATE",
        str(email),
        {"firstName": body.firstName, "lastName": body.lastName, "role": body.role, "is_active": body.is_active},
    )
    return {"ok": True}


@router.post("/users/bulk")
def admin_bulk_users(body: BulkUsersIn, admin: Dict[str, Any] = Depends(require_admin)):
    self_user = find_user_by_id(str(admin.get("admin_id"))) or {}
    self_email = str(self_user.get("email") or "").strip().lower()
    emails = [str(e).strip().lower() for e in body.emails if str(e).strip()]
    emails = list(dict.fromkeys(emails))

    updated = 0
    deleted = 0
    skipped = 0
    errors = 0

    for em in emails:
        try:
            if self_email and em == self_email and body.action in {"delete", "suspend"}:
                skipped += 1
                continue
            if body.action == "activate":
                if update_user_active(em, True):
                    updated += 1
                else:
                    errors += 1
            elif body.action == "suspend":
                if update_user_active(em, False):
                    updated += 1
                else:
                    errors += 1
            elif body.action == "set_role":
                if not body.role:
                    raise ValueError("role_missing")
                if update_user_role(em, body.role):
                    updated += 1
                else:
                    errors += 1
            elif body.action == "set_password":
                if not body.password:
                    raise ValueError("password_missing")
                if update_user_password(em, hash_password(body.password)):
                    updated += 1
                else:
                    errors += 1
            elif body.action == "delete":
                if delete_user(em):
                    deleted += 1
                else:
                    errors += 1
        except Exception:
            errors += 1

    log_audit(
        str(admin.get("admin_id")),
        "USER_BULK_ACTION",
        "users",
        {"action": body.action, "count": len(emails), "updated": updated, "deleted": deleted, "skipped": skipped, "errors": errors},
    )
    return {"ok": True, "total": len(emails), "updated": updated, "deleted": deleted, "skipped": skipped, "errors": errors}


@router.get("/users/export")
def admin_export_users(
    format: str = "csv",
    search: Optional[str] = None,
    role: Optional[str] = None,
    active: Optional[bool] = None,
    admin: Dict[str, Any] = Depends(require_admin),
):
    from fastapi.responses import Response
    import csv
    import io

    fmt = (format or "csv").strip().lower()
    users = list_users(limit=50000, offset=0, role=role, search=search, is_active=active)
    rows = [sanitize_user_for_response(u) for u in users]

    if fmt == "json":
        payload = json.dumps({"users": rows}, ensure_ascii=False).encode("utf-8")
        log_audit(str(admin.get("admin_id")), "USER_EXPORT", "users", {"format": "json", "count": len(rows)})
        return Response(
            content=payload,
            media_type="application/json; charset=utf-8",
            headers={"Content-Disposition": "attachment; filename=users.json"},
        )

    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["email", "first_name", "last_name", "role", "is_active", "is_verified", "created_at", "last_login_at"])
    for u in rows:
        w.writerow(
            [
                u.get("email"),
                u.get("first_name"),
                u.get("last_name"),
                u.get("role"),
                u.get("is_active"),
                u.get("is_verified"),
                u.get("created_at"),
                u.get("last_login_at"),
            ]
        )
    data = buf.getvalue().encode("utf-8")
    log_audit(str(admin.get("admin_id")), "USER_EXPORT", "users", {"format": "csv", "count": len(rows)})
    return Response(content=data, media_type="text/csv; charset=utf-8", headers={"Content-Disposition": "attachment; filename=users.csv"})


@router.get("/export-consents/{user_id}")
def admin_export_legal_consents_csv(
    user_id: str,
    admin: Dict[str, Any] = Depends(require_admin),
):
    """Kullanıcıya ait yasal onay kayıtlarını CSV olarak dışa aktarır (KVKK / denetim)."""
    from fastapi.responses import Response
    import csv
    import io

    from db import get_db_cursor

    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["user_id", "agreement_type", "agreed_at", "ip_address", "document_version_hash"])
    try:
        with get_db_cursor() as cur:
            cur.execute(
                """
                SELECT user_id::text, agreement_type, agreed_at, COALESCE(ip_address, ''), document_version_hash
                FROM legal_consents
                WHERE user_id = %s::uuid
                ORDER BY agreed_at ASC
                """,
                (user_id,),
            )
            rows = cur.fetchall()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Veritabanı hatası: {e}")

    for row in rows:
        agreed = row.get("agreed_at")
        agreed_s = agreed.isoformat() if hasattr(agreed, "isoformat") else str(agreed or "")
        w.writerow(
            [
                row.get("user_id"),
                row.get("agreement_type"),
                agreed_s,
                row.get("ip_address") or "",
                row.get("document_version_hash") or "",
            ]
        )

    data = buf.getvalue().encode("utf-8")
    log_audit(
        str(admin.get("admin_id")),
        "LEGAL_CONSENTS_EXPORT",
        "legal",
        {"user_id": user_id, "rows": len(rows)},
    )
    return Response(
        content=data,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename=legal_consents_{user_id}.csv"},
    )


@router.post("/users/import")
def admin_import_users(body: ImportUsersIn, admin: Dict[str, Any] = Depends(require_admin)):
    mode = (body.mode or "skip").strip().lower()
    created = 0
    updated = 0
    skipped = 0
    errors = 0
    details: List[Dict[str, Any]] = []

    for raw in body.users:
        try:
            email = str((raw or {}).get("email") or "").strip().lower()
            if not email:
                skipped += 1
                continue
            role = str((raw or {}).get("role") or "user").strip().lower()
            if role not in {"user", "admin", "demo"}:
                role = "user"
            is_active = bool((raw or {}).get("is_active", True))
            fn = str((raw or {}).get("firstName") or (raw or {}).get("first_name") or "").strip()
            ln = str((raw or {}).get("lastName") or (raw or {}).get("last_name") or "").strip()
            un = str((raw or {}).get("username") or "").strip()
            if un and (not fn and not ln):
                parts = un.split()
                fn = parts[0]
                ln = " ".join(parts[1:]) if len(parts) > 1 else ""

            pw = (raw or {}).get("password")
            existing = find_user_by_email(email)
            if existing:
                if mode == "skip":
                    skipped += 1
                    continue
                if update_user_profile(email, first_name=fn, last_name=ln, role=role, is_active=is_active):
                    updated += 1
                if pw:
                    update_user_password(email, hash_password(str(pw)))
                details.append({"email": email, "status": "updated"})
                continue

            if not pw:
                skipped += 1
                details.append({"email": email, "status": "skipped", "reason": "missing_password"})
                continue
            uid = create_user(
                {
                    "email": email,
                    "firstName": fn,
                    "lastName": ln,
                    "hashed_password": hash_password(str(pw)),
                    "role": role,
                    "is_active": is_active,
                }
            )
            created += 1
            details.append({"email": email, "status": "created", "id": uid})
        except Exception as e:
            errors += 1
            details.append({"email": str((raw or {}).get("email") or ""), "status": "error", "reason": str(e)})

    log_audit(str(admin.get("admin_id")), "USER_IMPORT", "users", {"mode": mode, "created": created, "updated": updated, "skipped": skipped, "errors": errors})
    return {"ok": True, "created": created, "updated": updated, "skipped": skipped, "errors": errors, "details": details[:200]}


@router.get("/sessions")
def admin_list_sessions(limit: int = 200, admin_id: Optional[str] = None, admin: Dict[str, Any] = Depends(require_admin)):
    sessions = get_admin_sessions(admin_id=admin_id, limit=int(limit))
    log_audit(str(admin.get("admin_id")), "ADMIN_SESSIONS_LIST", "auth", {"count": len(sessions)})
    return {"sessions": sessions}


@router.post("/sessions/{jti}/revoke")
def admin_revoke_session(jti: str, admin: Dict[str, Any] = Depends(require_admin)):
    ok = revoke_admin_session(jti)
    if not ok:
        raise HTTPException(status_code=404, detail="Oturum bulunamadı.")
    log_audit(str(admin.get("admin_id")), "ADMIN_SESSION_REVOKE", "auth", {"jti": jti})
    return {"ok": True}


@router.post("/logout")
def admin_logout(request: Request, admin: Dict[str, Any] = Depends(require_admin)):
    jti = str(admin.get("jti") or "").strip()
    if jti:
        revoke_admin_session(jti)
    log_audit(str(admin.get("admin_id")), "ADMIN_LOGOUT", "auth", {"jti": jti})
    resp = JSONResponse({"ok": True})
    secure = request.url.scheme == "https"
    resp.delete_cookie(key=ADMIN_TOKEN_COOKIE, path="/", samesite="none" if secure else "lax", secure=secure)
    return resp

@router.get("/audit-logs", dependencies=[Depends(require_admin)])
def get_audit_logs_endpoint(user_id: Optional[str] = None, limit: int = 100):
    logs = get_audit_logs(user_id, limit)
    for l in logs:
        if l.get("created_at"):
            try:
                l["created_at"] = _iso(l["created_at"])
            except Exception:
                pass
    return logs


# ------------------------
# System Logs & Master Control
# ------------------------
@router.get("/logs/system", dependencies=[Depends(require_admin)])
def get_system_logs(lines: int = 200):
    log_file = Path("backend_access.log")
    if not log_file.exists():
        return {"logs": ["Log dosyası bulunamadı."]}
    
    try:
        with log_file.open("r", encoding="utf-8") as f:
            all_lines = f.readlines()
            return {"logs": all_lines[-lines:]}
    except Exception as e:
        return {"logs": [f"Log okuma hatası: {e}"]}

@router.get("/config", dependencies=[Depends(require_admin)])
def get_system_config():
    return _load_json(
        SYSTEM_CONFIG_FILE,
        {"maintenance_mode": False, "allow_registration": True, "max_tokens_per_user": 1000},
    )

@router.post("/config")
def update_system_config(cfg: SystemConfigIn, admin: Dict[str, Any] = Depends(require_admin)):
    _atomic_write_json(SYSTEM_CONFIG_FILE, cfg.dict())

    log_audit(str(admin.get("admin_id")), "SYSTEM_CONFIG_UPDATE", "config", cfg.dict())
    return {"ok": True, "config": cfg.dict()}

@router.post("/emergency-switch")
def emergency_switch(enable: bool = Body(..., embed=True), admin: Dict[str, Any] = Depends(require_admin)):
    # Toggle maintenance mode immediately
    cfg = _load_json(SYSTEM_CONFIG_FILE, {"maintenance_mode": False, "allow_registration": True})
    cfg["maintenance_mode"] = enable
    _atomic_write_json(SYSTEM_CONFIG_FILE, cfg)
    
    log_audit(str(admin.get("admin_id")), "EMERGENCY_SWITCH", "system", {"enabled": enable})
    return {"ok": True, "maintenance_mode": enable}

@router.get("/stats", dependencies=[Depends(require_admin)])
def get_admin_stats():
    users = list_users(limit=10000) # Get all roughly
    active_users = sum(1 for u in users if u.get("is_active", True))
    demo_users = sum(1 for u in users if u.get("role") == "demo")
    try:
        pending_requests = len([r for r in store_list_demo_requests(status="pending")])
    except Exception:
        pending_requests = 0
    
    return {
        "total_users": len(users),
        "active_users": active_users,
        "demo_users": demo_users,
        "pending_requests": pending_requests,
        "system_status": "Operational",
        "last_restart": _iso(_now())
    }


# --- Legal CMS (admin JWT) ---
class LegalPublishIn(BaseModel):
    doc_type: str = Field(..., min_length=3, max_length=32)
    title: str = Field(..., min_length=1, max_length=500)
    content: str = Field(..., min_length=1)
    requires_acceptance: bool = True


class LegalActivateIn(BaseModel):
    document_id: str = Field(..., min_length=10, max_length=64)


@router.get("/legal/summary", dependencies=[Depends(require_admin)])
def admin_legal_summary():
    from legal_cms_config import LEGAL_DOC_TYPES
    from services.legal_cms_service import get_active_document, list_all_versions_for_type

    rows = []
    for t in sorted(LEGAL_DOC_TYPES):
        active = get_active_document(t)
        versions = list_all_versions_for_type(t)
        rows.append(
            {
                "type": t,
                "active": active,
                "version_count": len(versions),
            }
        )
    return {"types": rows}


@router.get("/legal/documents/{doc_type}/versions", dependencies=[Depends(require_admin)])
def admin_legal_versions(doc_type: str):
    from legal_cms_config import LEGAL_DOC_TYPES
    from services.legal_cms_service import list_all_versions_for_type

    if doc_type not in LEGAL_DOC_TYPES:
        raise HTTPException(status_code=400, detail="Geçersiz belge türü.")
    return {"versions": list_all_versions_for_type(doc_type)}


@router.post("/legal/publish")
def admin_legal_publish(
    body: LegalPublishIn,
    background_tasks: BackgroundTasks,
    admin: Dict[str, Any] = Depends(require_admin),
):
    from legal_cms_config import LEGAL_DOC_TYPES
    from services.legal_cms_service import publish_new_version
    from services.legal_notify import fanout_legal_document_update

    if body.doc_type not in LEGAL_DOC_TYPES:
        raise HTTPException(status_code=400, detail="Geçersiz belge türü.")
    admin_uid = str(admin.get("admin_id") or "").strip() or None
    try:
        row = publish_new_version(
            body.doc_type,
            body.title.strip(),
            body.content,
            body.requires_acceptance,
            admin_uid if admin_uid else None,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if body.requires_acceptance:
        background_tasks.add_task(
            fanout_legal_document_update,
            body.doc_type,
            str(row.get("title") or body.title),
            str(row.get("version") or ""),
        )
    try:
        log_audit(str(admin.get("admin_id")), "LEGAL_PUBLISH", body.doc_type, {"version": row.get("version")})
    except Exception:
        pass
    return {"ok": True, "document": row}


@router.post("/legal/activate")
def admin_legal_activate(body: LegalActivateIn, admin: Dict[str, Any] = Depends(require_admin)):
    from services.legal_cms_service import activate_document_version

    try:
        row = activate_document_version(body.document_id.strip())
    except ValueError:
        raise HTTPException(status_code=404, detail="Belge bulunamadı.")
    try:
        log_audit(str(admin.get("admin_id")), "LEGAL_ACTIVATE", "legal", {"id": body.document_id})
    except Exception:
        pass
    return {"ok": True, "document": row}


@router.get("/legal/audit", dependencies=[Depends(require_admin)])
def admin_legal_audit(
    user_id: Optional[str] = None,
    document_type: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
):
    from services.legal_cms_service import audit_acceptances

    rows, total = audit_acceptances(
        user_id=user_id,
        document_type=document_type,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
        offset=offset,
    )
    return {"rows": rows, "total": total, "limit": limit, "offset": offset}


# Backward-compat
api_router = router
