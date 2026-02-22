from __future__ import annotations

import os, json, tempfile, secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel, EmailStr, Field

from admin_auth import require_admin, issue_admin_token
from security import hash_password, verify_password, sanitize_user_for_response
from stores.users_store import read_users, write_users
from stores.demo_users_store import read_demo_users, write_demo_users, purge_expired_demo_users

# ------------------------
# Storage (JSON files)
# ------------------------
DATA_DIR = Path(os.getenv("DATA_DIR") or "data")
DATA_DIR.mkdir(parents=True, exist_ok=True)

DEMO_REQUESTS_FILE = DATA_DIR / "demo_requests.json"
DEMO_USERS_FILE    = DATA_DIR / "demo_users.json"
USERS_FILE         = DATA_DIR / "users.json"
ACTIVITY_FILE      = DATA_DIR / "activity.json"
ADMINS_FILE        = DATA_DIR / "admins.json"
SYSTEM_CONFIG_FILE = DATA_DIR / "system_config.json" # New for feature flags

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

def _log_activity(event_type: str, message: str, meta: Optional[dict] = None):
    arr = _load_json(ACTIVITY_FILE, [])
    arr.append({
        "id": secrets.token_hex(8),
        "ts": _iso(_now()),
        "type": event_type,
        "message": message,
        "meta": meta or {}
    })
    # son 1000 kayıt
    arr = arr[-1000:]
    _atomic_write_json(ACTIVITY_FILE, arr)


# ------------------------
# Models
# ------------------------
class SetPasswordIn(BaseModel):
    password: str = Field(min_length=4, max_length=128)

class AdminLoginIn(BaseModel):
    firstName: str = Field(min_length=1, max_length=64)
    lastName: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=4, max_length=128)

class AdminCreateIn(BaseModel):
    firstName: str = Field(min_length=1, max_length=64)
    lastName: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=4, max_length=128)

class CreateUserIn(BaseModel):
    firstName: str = Field(default="", max_length=64)
    lastName: str = Field(default="", max_length=64)
    email: EmailStr
    password: str = Field(min_length=4, max_length=128)
    role: str = "user"

class UpdateRoleIn(BaseModel):
    role: str = Field(..., pattern="^(user|admin|editor|viewer)$")

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
def _read_admins() -> List[Dict[str, Any]]:
    arr = _load_json(ADMINS_FILE, [])
    return arr if isinstance(arr, list) else []

def _write_admins(arr: List[Dict[str, Any]]) -> None:
    _atomic_write_json(ADMINS_FILE, arr)

def _find_admin(firstName: str, lastName: str) -> Optional[Dict[str, Any]]:
    fn = (firstName or "").strip().lower()
    ln = (lastName or "").strip().lower()
    for a in _read_admins():
        if (a.get("firstName","").strip().lower() == fn and a.get("lastName","").strip().lower() == ln):
            return a
    return None

def _bootstrap_default_admin() -> None:
    arr = _read_admins()
    if arr:
        return
    # Seed default admin securely (hashed only)
    default_first = os.getenv("DEFAULT_ADMIN_FIRST") or "Kerim"
    default_last = os.getenv("DEFAULT_ADMIN_LAST") or "Aydemir"
    default_pw = os.getenv("DEFAULT_ADMIN_PASSWORD")
    if not default_pw:
        # If env not set, do not create default admin to avoid security hole
        return 
        
    admin_id = secrets.token_hex(8)
    arr.append({
        "id": admin_id,
        "firstName": default_first,
        "lastName": default_last,
        "hashed_password": hash_password(default_pw),
        "created_at": _iso(_now())
    })
    _write_admins(arr)
    _log_activity("admin_bootstrap", "Varsayılan admin oluşturuldu", {"id": admin_id})

def _norm(s: str) -> str:
    return " ".join((s or "").strip().lower().split())

@router.post("/login")
def admin_login(body: AdminLoginIn):
    # 1) ROOT ADMIN (Environment Variable) - PREFERRED IN PRODUCTION
    root_pw = os.getenv("DEFAULT_ADMIN_PASSWORD")
    if root_pw and verify_password(body.password, hash_password(root_pw)):
        # Check username match if desired, or just allow if password matches root
        # Here we check first/last match default envs
        def_first = os.getenv("DEFAULT_ADMIN_FIRST") or "Kerim"
        def_last = os.getenv("DEFAULT_ADMIN_LAST") or "Aydemir"
        
        if _norm(body.firstName) == _norm(def_first) and _norm(body.lastName) == _norm(def_last):
             token = issue_admin_token(admin_id="root_admin")
             return {
                "ok": True,
                "token": token,
                "admin": {"id": "root_admin", "firstName": def_first, "lastName": def_last},
            }

    # 2) FILE BASED ADMINS (Fallback / Secondary)
    _bootstrap_default_admin()
    admin = _find_admin(body.firstName, body.lastName)
    if not admin or not verify_password(body.password, admin.get("hashed_password","")):
        raise HTTPException(status_code=401, detail="Geçersiz admin bilgileri.")
    token = issue_admin_token(admin_id=admin["id"])
    return {
        "ok": True,
        "token": token,
        "admin": {"id": admin["id"], "firstName": admin["firstName"], "lastName": admin["lastName"]},
    }

@router.get("/admins", dependencies=[Depends(require_admin)])
def list_admins():
    _bootstrap_default_admin()
    arr = _read_admins()
    safe = [{"id": a.get("id"), "firstName": a.get("firstName"), "lastName": a.get("lastName"), "created_at": a.get("created_at")} for a in arr]
    return safe

@router.post("/admins", dependencies=[Depends(require_admin)])
def create_admin(body: AdminCreateIn):
    arr = _read_admins()
    if _find_admin(body.firstName, body.lastName):
        raise HTTPException(status_code=409, detail="Admin zaten mevcut.")
    admin_id = secrets.token_hex(8)
    arr.append({
        "id": admin_id,
        "firstName": body.firstName.strip(),
        "lastName": body.lastName.strip(),
        "hashed_password": hash_password(body.password),
        "created_at": _iso(_now())
    })
    _write_admins(arr)
    _log_activity("admin_create", f"Admin oluşturuldu: {body.firstName} {body.lastName}", {"id": admin_id})
    return {"ok": True, "id": admin_id}

@router.delete("/admins/{admin_id}", dependencies=[Depends(require_admin)])
def delete_admin(admin_id: str):
    arr = _read_admins()
    before = len(arr)
    arr = [a for a in arr if str(a.get("id")) != str(admin_id)]
    if len(arr) == before:
        raise HTTPException(status_code=404, detail="Admin bulunamadı.")
    _write_admins(arr)
    _log_activity("admin_delete", f"Admin silindi: {admin_id}", {"id": admin_id})
    return {"ok": True}

@router.get("/health", dependencies=[Depends(require_admin)])
def admin_health():
    return {"ok": True, "ts": _iso(_now())}

# ------------------------
# Demo Requests
# ------------------------
@router.get("/demo-requests", dependencies=[Depends(require_admin)])
def list_demo_requests():
    arr = _load_json(DEMO_REQUESTS_FILE, [])
    if not isinstance(arr, list):
        arr = []
    return arr

@router.post("/demo-requests/{request_id}/approve", dependencies=[Depends(require_admin)])
def approve_demo_request(request_id: str):
    reqs = _load_json(DEMO_REQUESTS_FILE, [])
    if not isinstance(reqs, list):
        reqs = []

    # request_id: id veya email ile çalışsın
    req = next((r for r in reqs if str(r.get("id")) == request_id or str(r.get("email")) == request_id), None)
    if not req:
        raise HTTPException(status_code=404, detail="Demo request bulunamadı.")

    email = (req.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Request email boş.")

    demo_users = read_demo_users()

    # aynı email varsa güncelle
    expires_at = _now() + timedelta(days=15)
    password = (req.get("password") or "").strip()
    if not password:
        password = secrets.token_urlsafe(10)  # request şifre vermediyse random

    record = {
        "email": email,
        "firstName": req.get("firstName") or req.get("first_name") or "",
        "lastName": req.get("lastName") or req.get("last_name") or "",
        "hashed_password": hash_password(password),
        "is_demo": True,
        "created_at": _iso(_now()),
        "expires_at": _iso(expires_at),
    }

    demo_users = [u for u in demo_users if str(u.get("email","")).strip().lower() != email]
    demo_users.append(record)
    write_demo_users(demo_users)

    # request’i sil
    reqs = [r for r in reqs if not (str(r.get("id")) == request_id or str(r.get("email")) == request_id)]
    _atomic_write_json(DEMO_REQUESTS_FILE, reqs)

    _log_activity("demo_approve", f"Demo onaylandı: {email}", {"email": email})
    # güvenlik: şifreyi asla dönmüyoruz
    return {"ok": True, "email": email, "expires_at": record["expires_at"]}

@router.post("/demo-requests/{request_id}/reject", dependencies=[Depends(require_admin)])
def reject_demo_request(request_id: str):
    reqs = _load_json(DEMO_REQUESTS_FILE, [])
    if not isinstance(reqs, list):
        reqs = []
    before = len(reqs)
    reqs = [r for r in reqs if not (str(r.get("id")) == request_id or str(r.get("email")) == request_id)]
    after = len(reqs)
    if before == after:
        raise HTTPException(status_code=404, detail="Demo request bulunamadı.")
    _atomic_write_json(DEMO_REQUESTS_FILE, reqs)
    _log_activity("demo_reject", f"Demo reddedildi: {request_id}", {"request_id": request_id})
    return {"ok": True}

# ------------------------
# Demo Users
# ------------------------
@router.get("/demo-users", dependencies=[Depends(require_admin)])
def list_demo_users():
    purge_expired_demo_users()
    arr = read_demo_users()

    now = _now()
    out = []
    for u in arr:
        exp = datetime.fromisoformat(str(u.get("expires_at"))).astimezone(timezone.utc)
        delta = exp - now
        remaining_days = max(0, delta.days)
        remaining_hours = max(0, int(delta.total_seconds() // 3600))
        safe = sanitize_user_for_response(u)
        safe["remaining_days"] = remaining_days
        safe["remaining_hours"] = remaining_hours
        out.append(safe)
    return out

@router.delete("/demo-users/{email}", dependencies=[Depends(require_admin)])
def delete_demo_user(email: str):
    email = email.strip().lower()
    arr = read_demo_users()
    before = len(arr)
    arr = [u for u in arr if str(u.get("email","")).strip().lower() != email]
    if len(arr) == before:
        raise HTTPException(status_code=404, detail="Demo user bulunamadı.")
    write_demo_users(arr)
    _log_activity("demo_delete", f"Demo user silindi: {email}", {"email": email})
    return {"ok": True}

@router.post("/demo-users/{email}/set-password", dependencies=[Depends(require_admin)])
def set_demo_password(email: str, body: SetPasswordIn):
    email = email.strip().lower()
    arr = read_demo_users()
    found = False
    for u in arr:
        if str(u.get("email","")).strip().lower() == email:
            u["hashed_password"] = hash_password(body.password)
            found = True
            break
    if not found:
        raise HTTPException(status_code=404, detail="Demo user bulunamadı.")
    write_demo_users(arr)
    _log_activity("demo_set_password", f"Demo şifre değişti: {email}", {"email": email})
    return {"ok": True}

# ------------------------
# Normal Users (Extended)
# ------------------------
@router.get("/users", dependencies=[Depends(require_admin)])
def list_users():
    arr = read_users()
    return [sanitize_user_for_response(u) for u in arr]

@router.post("/users", dependencies=[Depends(require_admin)])
def create_user(body: CreateUserIn):
    arr = read_users()

    email = str(body.email).strip().lower()
    if any(str(u.get("email","")).strip().lower() == email for u in arr):
        raise HTTPException(status_code=409, detail="Bu email zaten var.")

    u = {
        "email": email,
        "firstName": body.firstName.strip(),
        "lastName": body.lastName.strip(),
        "hashed_password": hash_password(body.password),
        "is_demo": False,
        "role": body.role,
        "is_active": True,
        "created_at": _iso(_now())
    }
    arr.append(u)
    write_users(arr)
    _log_activity("user_create", f"Kullanıcı oluşturuldu: {email}", {"email": email})
    return {"ok": True}

@router.delete("/users/{email}", dependencies=[Depends(require_admin)])
def delete_user(email: str):
    email = email.strip().lower()
    arr = read_users()
    before = len(arr)
    arr = [u for u in arr if str(u.get("email","")).strip().lower() != email]
    if len(arr) == before:
        raise HTTPException(status_code=404, detail="User bulunamadı.")
    write_users(arr)
    _log_activity("user_delete", f"Kullanıcı silindi: {email}", {"email": email})
    return {"ok": True}

@router.post("/users/{email}/set-password", dependencies=[Depends(require_admin)])
def set_user_password(email: str, body: SetPasswordIn):
    email = email.strip().lower()
    arr = read_users()
    found = False
    for u in arr:
        if str(u.get("email","")).strip().lower() == email:
            u["hashed_password"] = hash_password(body.password)
            found = True
            break
    if not found:
        raise HTTPException(status_code=404, detail="User bulunamadı.")
    write_users(arr)
    _log_activity("user_set_password", f"User şifre değişti: {email}", {"email": email})
    return {"ok": True}

@router.put("/users/{email}/role", dependencies=[Depends(require_admin)])
def update_user_role(email: str, body: UpdateRoleIn):
    email = email.strip().lower()
    arr = read_users()
    found = False
    for u in arr:
        if str(u.get("email","")).strip().lower() == email:
            u["role"] = body.role
            found = True
            break
    if not found:
        raise HTTPException(status_code=404, detail="User bulunamadı.")
    write_users(arr)
    _log_activity("user_role_update", f"User rolü güncellendi: {email} -> {body.role}", {"email": email})
    return {"ok": True, "role": body.role}

@router.put("/users/{email}/suspend", dependencies=[Depends(require_admin)])
def toggle_user_suspend(email: str, active: bool = Body(..., embed=True)):
    email = email.strip().lower()
    arr = read_users()
    found = False
    for u in arr:
        if str(u.get("email","")).strip().lower() == email:
            u["is_active"] = active
            found = True
            break
    if not found:
        raise HTTPException(status_code=404, detail="User bulunamadı.")
    write_users(arr)
    status_str = "aktif" if active else "askıya alındı"
    _log_activity("user_suspend_toggle", f"User {status_str}: {email}", {"email": email})
    return {"ok": True, "is_active": active}

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
def update_system_config(cfg: SystemConfigIn):
    _atomic_write_json(SYSTEM_CONFIG_FILE, cfg.dict())
    _log_activity("system_config_update", "Sistem ayarları güncellendi", cfg.dict())
    return {"ok": True, "config": cfg.dict()}

@router.post("/emergency-switch", dependencies=[Depends(require_admin)])
def emergency_switch(enable: bool = Body(..., embed=True)):
    # Toggle maintenance mode immediately
    cfg = _load_json(SYSTEM_CONFIG_FILE, {"maintenance_mode": False, "allow_registration": True})
    cfg["maintenance_mode"] = enable
    _atomic_write_json(SYSTEM_CONFIG_FILE, cfg)
    _log_activity("emergency_switch", f"Acil durum modu: {enable}", {"enabled": enable})
    return {"ok": True, "maintenance_mode": enable}

@router.get("/stats", dependencies=[Depends(require_admin)])
def get_admin_stats():
    users = read_users()
    demos = read_demo_users()
    reqs = _load_json(DEMO_REQUESTS_FILE, [])
    
    active_users = sum(1 for u in users if u.get("is_active", True))
    
    return {
        "total_users": len(users),
        "active_users": active_users,
        "demo_users": len(demos),
        "pending_requests": len(reqs),
        "system_status": "Operational",
        "last_restart": _iso(_now()) # Mockup for process start time
    }

# ------------------------
# Activity
# ------------------------
@router.get("/activity", dependencies=[Depends(require_admin)])
def list_activity():
    arr = _load_json(ACTIVITY_FILE, [])
    if not isinstance(arr, list):
        arr = []
    return arr[-300:][::-1]  # son 300, yeni->eski


# Backward-compat: main.py eski isim api_router arıyorsa kırılmasın
api_router = router
