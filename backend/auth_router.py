from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

from stores.users_store import hash_password, verify_password

router = APIRouter()

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()

USERS_FILE = DATA_DIR / "users.json"
DEMO_USERS_FILE = DATA_DIR / "demo_users.json"

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
    tmp = path.with_suffix(".tmp")
    try:
        with tmp.open("w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)
    finally:
        if tmp.exists():
            try:
                tmp.unlink()
            except Exception:
                pass

def _read_users() -> list[dict]:
    arr = _load_json(USERS_FILE, [])
    return arr if isinstance(arr, list) else []

def _write_users(arr: list[dict]) -> None:
    _atomic_write_json(USERS_FILE, arr)

def _read_demo_users() -> list[dict]:
    arr = _load_json(DEMO_USERS_FILE, [])
    return arr if isinstance(arr, list) else []

def _purge_expired_demo(demo_users: list[dict]) -> list[dict]:
    now = _now_utc()
    kept: list[dict] = []
    for u in demo_users:
        try:
            exp = datetime.fromisoformat(str(u.get("expires_at"))).astimezone(timezone.utc)
            if exp > now:
                kept.append(u)
        except Exception:
            pass
    _atomic_write_json(DEMO_USERS_FILE, kept)
    return kept

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    firstName: str = Field(min_length=1, max_length=64)
    lastName: str = Field(min_length=1, max_length=64)
    mode: Optional[str] = Field(default="single", max_length=16)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)




@router.post("/register")
def register(payload: RegisterRequest) -> Dict[str, Any]:
    email_norm = str(payload.email).strip().lower()
    users = _read_users()
    if any(str(u.get("email","")).strip().lower() == email_norm for u in users):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email zaten kayıtlı.")
    users.append({
        "email": email_norm,
        "firstName": payload.firstName.strip(),
        "lastName": payload.lastName.strip(),
        "hashed_password": hash_password(payload.password),
        "is_demo": False,
        "created_at": _iso(_now_utc()),
    })
    _write_users(users)
    return {"status": "ok", "requires_verification": False}


@router.post("/login")
def login(payload: LoginRequest) -> Dict[str, Any]:
    email_norm = str(payload.email).strip().lower()
    users = _read_users()
    user = next((u for u in users if str(u.get("email","")).strip().lower() == email_norm), None)
    if user and verify_password(payload.password, user.get("hashed_password","")):
        return {
            "status": "ok",
            "message": "Giriş başarılı",
            "token": os.urandom(16).hex(),
            "user": {
                "email": email_norm,
                "first_name": user.get("firstName",""),
                "last_name": user.get("lastName",""),
            },
        }
    demo_users = _purge_expired_demo(_read_demo_users())
    du = next((d for d in demo_users if str(d.get("email","")).strip().lower() == email_norm), None)
    if du and verify_password(payload.password, du.get("hashed_password","")):
        return {
            "status": "ok",
            "message": "Giriş başarılı",
            "token": os.urandom(16).hex(),
            "user": {
                "email": email_norm,
                "first_name": du.get("firstName",""),
                "last_name": du.get("lastName",""),
                "is_demo": True,
                "expires_at": du.get("expires_at"),
            },
        }
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Kullanıcı bulunamadı veya şifre hatalı.")
