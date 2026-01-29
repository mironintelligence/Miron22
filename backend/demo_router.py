# backend/demo_router.py
from __future__ import annotations

import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List

from fastapi import APIRouter, Body, HTTPException, Query

router = APIRouter(prefix="/api", tags=["demo"])

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data" / "admin"
DATA_DIR.mkdir(parents=True, exist_ok=True)

DEMO_REQUESTS_FILE = DATA_DIR / "demo_requests.json"
DEMO_USERS_FILE = DATA_DIR / "demo_users.json"

ADMIN_TOKEN = (os.getenv("ADMIN_TOKEN") or "admintoken123").strip()


def now_utc() -> datetime:
    return datetime.now(timezone.utc)

def now_utc_iso() -> str:
    return now_utc().isoformat()

def verify_admin(token: str) -> None:
    if (token or "").strip() != ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="Admin token geçersiz.")

def _read_json(path: Path, default):
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default

def _write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


@router.get("/demo-requests")
def list_demo_requests(token: str = Query(...)):
    verify_admin(token)
    return _read_json(DEMO_REQUESTS_FILE, [])


@router.post("/approve-demo")
def approve_demo(token: str = Query(...), payload: Dict[str, Any] = Body(...)):
    verify_admin(token)

    rid = str(payload.get("request_id") or "").strip()
    if not rid:
        raise HTTPException(status_code=400, detail="request_id gerekli.")

    requests: List[Dict[str, Any]] = _read_json(DEMO_REQUESTS_FILE, [])
    idx = next((i for i, r in enumerate(requests) if str(r.get("id")) == rid), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Demo isteği bulunamadı.")

    req = requests[idx]

    # demo user oluştur
    demo_users: List[Dict[str, Any]] = _read_json(DEMO_USERS_FILE, [])

    email = (req.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Request içinde email yok.")

    # aynı email varsa overwrite et (admin tekrar onayladıysa)
    demo_users = [u for u in demo_users if (u.get("email") or "").strip().lower() != email]

    created_at = now_utc()
    expires_at = created_at + timedelta(days=15)

    demo_users.append({
        "firstName": (req.get("firstName") or "").strip(),
        "lastName": (req.get("lastName") or "").strip(),
        "email": email,
        "password": (req.get("password") or "").strip(),
        "role": "demo",
        "created_at": created_at.isoformat(),
        "expires_at": expires_at.isoformat(),
        "request_id": rid,
    })
    _write_json(DEMO_USERS_FILE, demo_users)

    # request'i "approved" yap (istersen listeden de silebilirsin)
    req["status"] = "approved"
    req["approved_at"] = now_utc_iso()
    requests[idx] = req
    _write_json(DEMO_REQUESTS_FILE, requests)

    return {"status": "ok", "demo_user_email": email, "expires_at": expires_at.isoformat()}


@router.post("/reject-demo")
def reject_demo(token: str = Query(...), payload: Dict[str, Any] = Body(...)):
    verify_admin(token)

    rid = str(payload.get("request_id") or "").strip()
    if not rid:
        raise HTTPException(status_code=400, detail="request_id gerekli.")

    requests: List[Dict[str, Any]] = _read_json(DEMO_REQUESTS_FILE, [])
    found = False
    for r in requests:
        if str(r.get("id")) == rid:
            r["status"] = "rejected"
            r["rejected_at"] = now_utc_iso()
            found = True
            break

    if not found:
        raise HTTPException(status_code=404, detail="Demo isteği bulunamadı.")

    _write_json(DEMO_REQUESTS_FILE, requests)
    return {"status": "ok"}