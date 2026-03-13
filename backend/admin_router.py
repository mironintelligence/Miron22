from __future__ import annotations

import os, json, secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Body, Request
from pydantic import BaseModel, EmailStr, Field

from admin_auth import require_admin, issue_admin_token
from security import hash_password, verify_password, sanitize_user_for_response
from stores.pg_users_store import (
    create_user, find_user_by_email, find_user_by_id, list_users,
    delete_user, update_user_role, update_user_password, update_user_active,
    lock_user, unlock_user, get_audit_logs,
    log_audit
)
from stores.demo_users_store import read_demo_users, write_demo_users, purge_expired_demo_users # Keep for demo requests mostly

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

class CreateUserIn(BaseModel):
    firstName: str = Field(default="", max_length=64)
    lastName: str = Field(default="", max_length=64)
    email: EmailStr
    password: str = Field(min_length=4, max_length=128)
    role: str = "user"

class UpdateRoleIn(BaseModel):
    role: str = Field(..., pattern="^(user|admin|demo)$")

class SystemConfigIn(BaseModel):
    maintenance_mode: bool = False
    allow_registration: bool = True
    max_tokens_per_user: int = 1000

# ------------------------
# Router
# ------------------------
router = APIRouter(tags=["admin"])

# ------------------------
# Admin Accounts & Login
# ------------------------

def _bootstrap_default_admin() -> None:
    if (os.getenv("BOOTSTRAP_MODE", "false") or "").lower() != "true":
        return
    # Seed default admin securely if not exists
    default_email = os.getenv("DEFAULT_ADMIN_EMAIL") or "admin@miron.ai"
    default_pw = os.getenv("DEFAULT_ADMIN_PASSWORD")
    
    if not default_pw:
        return 
        
    admin = find_user_by_email(default_email)
    if not admin:
        create_user({
            "email": default_email,
            "firstName": "System",
            "lastName": "Admin",
            "hashed_password": hash_password(default_pw),
            "role": "admin",
            "is_active": True
        })
        log_audit(None, "ADMIN_BOOTSTRAP", "system", {"email": default_email})

@router.post("/login")
def admin_login(body: AdminLoginIn, request: Request):
    _bootstrap_default_admin()
    
    email = str(body.email).strip().lower()
    user = find_user_by_email(email)
    
    ip = request.client.host if request.client else "127.0.0.1"
    if ip == "testclient": ip = "127.0.0.1"
    ua = request.headers.get("user-agent", "unknown")

    if (os.getenv("BOOTSTRAP_MODE", "false") or "").lower() == "true":
        default_email = os.getenv("DEFAULT_ADMIN_EMAIL") or "admin@miron.ai"
        if email == default_email and body.password == os.getenv("DEFAULT_ADMIN_PASSWORD"):
            if not user:
                raise HTTPException(status_code=401, detail="Admin kullanıcı bulunamadı. Önce bootstrap tamamlanmalı.")

    if not user or not verify_password(body.password, user.get("password_hash") or user.get("hashed_password")):
        log_audit(None, "ADMIN_LOGIN_FAILED", email, {"reason": "invalid_credentials"}, ip, ua)
        raise HTTPException(status_code=401, detail="Geçersiz admin bilgileri.")
        
    if user.get("role") != "admin":
        log_audit(str(user["id"]), "ADMIN_LOGIN_DENIED", email, {"reason": "not_admin"}, ip, ua)
        raise HTTPException(status_code=403, detail="Yetkisiz erişim.")

    token = issue_admin_token(admin_id=str(user["id"]))
    log_audit(str(user["id"]), "ADMIN_LOGIN_SUCCESS", "auth", None, ip, ua)
    
    return {
        "ok": True,
        "token": token,
        "admin": sanitize_user_for_response(user),
    }

@router.get("/admins", dependencies=[Depends(require_admin)])
def list_admins():
    users = list_users(role="admin")
    return [sanitize_user_for_response(u) for u in users]

@router.post("/admins", dependencies=[Depends(require_admin)])
def create_admin(body: CreateUserIn, req: Request):
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
    
    admin_info = req.state.admin if hasattr(req.state, "admin") else {}
    log_audit(admin_info.get("admin_id"), "ADMIN_CREATE_ADMIN", str(body.email), {"new_admin_id": uid})
    
    return {"ok": True, "id": uid}

@router.get("/health", dependencies=[Depends(require_admin)])
def admin_health():
    return {"ok": True, "ts": _iso(_now())}

# ------------------------
# Demo Requests (Keeping JSON for now)
# ------------------------
@router.get("/demo-requests", dependencies=[Depends(require_admin)])
def list_demo_requests():
    arr = _load_json(DEMO_REQUESTS_FILE, [])
    if not isinstance(arr, list):
        arr = []
    return arr

@router.post("/demo-requests/{request_id}/approve", dependencies=[Depends(require_admin)])
def approve_demo_request(request_id: str, req: Request):
    reqs = _load_json(DEMO_REQUESTS_FILE, [])
    if not isinstance(reqs, list):
        reqs = []

    req_data = next((r for r in reqs if str(r.get("id")) == request_id or str(r.get("email")) == request_id), None)
    if not req_data:
        raise HTTPException(status_code=404, detail="Demo request bulunamadı.")

    email = (req_data.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Request email boş.")

    password = (req_data.get("password") or "").strip() or secrets.token_urlsafe(10)

    # Create as Demo User in PG
    # Check if exists
    existing = find_user_by_email(email)
    if existing:
        # Update to demo? Or fail? Let's fail for now to be safe
        # Or update role to demo
        update_user_role(email, "demo")
    else:
        create_user({
            "email": email,
            "firstName": req_data.get("firstName") or "",
            "lastName": req_data.get("lastName") or "",
            "hashed_password": hash_password(password),
            "role": "demo",
            "is_active": True
        })

    # request’i sil
    reqs = [r for r in reqs if not (str(r.get("id")) == request_id or str(r.get("email")) == request_id)]
    _atomic_write_json(DEMO_REQUESTS_FILE, reqs)

    admin_info = req.state.admin if hasattr(req.state, "admin") else {}
    log_audit(admin_info.get("admin_id"), "DEMO_APPROVE", email)
    
    return {"ok": True, "email": email}

@router.post("/demo-requests/{request_id}/reject", dependencies=[Depends(require_admin)])
def reject_demo_request(request_id: str, req: Request):
    reqs = _load_json(DEMO_REQUESTS_FILE, [])
    before = len(reqs)
    reqs = [r for r in reqs if not (str(r.get("id")) == request_id or str(r.get("email")) == request_id)]
    if len(reqs) == before:
        raise HTTPException(status_code=404, detail="Demo request bulunamadı.")
    _atomic_write_json(DEMO_REQUESTS_FILE, reqs)
    
    admin_info = req.state.admin if hasattr(req.state, "admin") else {}
    log_audit(admin_info.get("admin_id"), "DEMO_REJECT", request_id)
    return {"ok": True}

# ------------------------
# User Management (PG)
# ------------------------
@router.get("/users", dependencies=[Depends(require_admin)])
def list_all_users():
    arr = list_users(limit=1000)
    return [sanitize_user_for_response(u) for u in arr]

@router.post("/users", dependencies=[Depends(require_admin)])
def admin_create_user(body: CreateUserIn, req: Request):
    if find_user_by_email(body.email):
        raise HTTPException(status_code=409, detail="Bu email zaten var.")

    uid = create_user({
        "email": body.email,
        "firstName": body.firstName,
        "lastName": body.lastName,
        "hashed_password": hash_password(body.password),
        "role": body.role,
        "is_active": True
    })
    
    admin_info = req.state.admin if hasattr(req.state, "admin") else {}
    log_audit(admin_info.get("admin_id"), "USER_CREATE", str(body.email), {"new_user_id": uid})
    return {"ok": True}

@router.delete("/users/{email}", dependencies=[Depends(require_admin)])
def admin_delete_user(email: str, req: Request):
    if not delete_user(email):
        raise HTTPException(status_code=404, detail="User bulunamadı.")
        
    admin_info = req.state.admin if hasattr(req.state, "admin") else {}
    log_audit(admin_info.get("admin_id"), "USER_DELETE", email)
    return {"ok": True}

@router.post("/users/{email}/set-password", dependencies=[Depends(require_admin)])
def admin_set_password(email: str, body: SetPasswordIn, req: Request):
    if not update_user_password(email, hash_password(body.password)):
        raise HTTPException(status_code=404, detail="User bulunamadı.")
        
    admin_info = req.state.admin if hasattr(req.state, "admin") else {}
    log_audit(admin_info.get("admin_id"), "USER_SET_PASSWORD", email)
    return {"ok": True}

@router.put("/users/{email}/role", dependencies=[Depends(require_admin)])
def admin_update_role(email: str, body: UpdateRoleIn, req: Request):
    if not update_user_role(email, body.role):
        raise HTTPException(status_code=404, detail="User bulunamadı.")
        
    admin_info = req.state.admin if hasattr(req.state, "admin") else {}
    log_audit(admin_info.get("admin_id"), "USER_ROLE_UPDATE", email, {"new_role": body.role})
    return {"ok": True, "role": body.role}

@router.put("/users/{email}/suspend", dependencies=[Depends(require_admin)])
def admin_toggle_suspend(email: str, req: Request, active: bool = Body(..., embed=True)):
    if not update_user_active(email, active):
        raise HTTPException(status_code=404, detail="User bulunamadı.")
        
    admin_info = req.state.admin if hasattr(req.state, "admin") else {}
    log_audit(admin_info.get("admin_id"), "USER_SUSPEND_TOGGLE", email, {"is_active": active})
    return {"ok": True, "is_active": active}

@router.post("/users/{user_id}/lock", dependencies=[Depends(require_admin)])
def admin_lock_user(user_id: str, req: Request):
    if not lock_user(user_id):
        raise HTTPException(status_code=404, detail="User bulunamadı.")
        
    admin_info = req.state.admin if hasattr(req.state, "admin") else {}
    log_audit(admin_info.get("admin_id"), "USER_LOCKED", user_id)
    return {"ok": True}

@router.post("/users/{user_id}/unlock", dependencies=[Depends(require_admin)])
def admin_unlock_user(user_id: str, req: Request):
    if not unlock_user(user_id):
        raise HTTPException(status_code=404, detail="User bulunamadı.")
        
    admin_info = req.state.admin if hasattr(req.state, "admin") else {}
    log_audit(admin_info.get("admin_id"), "USER_UNLOCKED", user_id)
    return {"ok": True}

@router.post("/users/{user_id}/reset-password", dependencies=[Depends(require_admin)])
def admin_reset_password_by_id(user_id: str, body: SetPasswordIn, req: Request):
    # Need to find email from ID first? Or update store to use ID.
    # Update_user_password uses EMAIL.
    # Let's find user first.
    user = find_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User bulunamadı.")
        
    if not update_user_password(user["email"], hash_password(body.password)):
        raise HTTPException(status_code=500, detail="Update failed.")
        
    admin_info = req.state.admin if hasattr(req.state, "admin") else {}
    log_audit(admin_info.get("admin_id"), "USER_RESET_PASSWORD", user["email"])
    return {"ok": True}

@router.get("/audit-logs", dependencies=[Depends(require_admin)])
def get_audit_logs_endpoint(user_id: Optional[str] = None, limit: int = 100):
    logs = get_audit_logs(user_id, limit)
    # Convert timestamps to ISO
    for l in logs:
        if l.get("timestamp"):
            l["timestamp"] = _iso(l["timestamp"])
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
    return _load_json(SYSTEM_CONFIG_FILE, {"maintenance_mode": False, "allow_registration": True})

@router.post("/config", dependencies=[Depends(require_admin)])
def update_system_config(cfg: SystemConfigIn, req: Request):
    _atomic_write_json(SYSTEM_CONFIG_FILE, cfg.dict())
    
    admin_info = req.state.admin if hasattr(req.state, "admin") else {}
    log_audit(admin_info.get("admin_id"), "SYSTEM_CONFIG_UPDATE", "config", cfg.dict())
    return {"ok": True, "config": cfg.dict()}

@router.post("/emergency-switch", dependencies=[Depends(require_admin)])
def emergency_switch(req: Request, enable: bool = Body(..., embed=True)):
    # Toggle maintenance mode immediately
    cfg = _load_json(SYSTEM_CONFIG_FILE, {"maintenance_mode": False, "allow_registration": True})
    cfg["maintenance_mode"] = enable
    _atomic_write_json(SYSTEM_CONFIG_FILE, cfg)
    
    admin_info = req.state.admin if hasattr(req.state, "admin") else {}
    log_audit(admin_info.get("admin_id"), "EMERGENCY_SWITCH", "system", {"enabled": enable})
    return {"ok": True, "maintenance_mode": enable}

@router.get("/stats", dependencies=[Depends(require_admin)])
def get_admin_stats():
    users = list_users(limit=10000) # Get all roughly
    active_users = sum(1 for u in users if u.get("is_active", True))
    demo_users = sum(1 for u in users if u.get("role") == "demo")
    
    return {
        "total_users": len(users),
        "active_users": active_users,
        "demo_users": demo_users,
        "system_status": "Operational",
        "last_restart": _iso(_now())
    }

# Backward-compat
api_router = router
