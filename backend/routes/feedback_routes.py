# backend/routes/feedback_routes.py
from __future__ import annotations

import json
from pathlib import Path
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Body, Query

router = APIRouter()

# ---- paths (cwd bağımsız)
BASE_DIR = Path(__file__).resolve().parents[1]  # .../backend
DATA_DIR = BASE_DIR / "data"
FB_PATH = DATA_DIR / "feedback_messages.json"

# ---- admin token (env ile de yönetebilirsin; şimdilik sabit tutuyorum)
ADMIN_TOKEN = "admintoken123"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _read_list() -> List[Dict[str, Any]]:
    if not FB_PATH.exists():
        return []
    try:
        return json.loads(FB_PATH.read_text(encoding="utf-8"))
    except Exception:
        return []


def _write_list(items: List[Dict[str, Any]]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    tmp = FB_PATH.with_suffix(".tmp")
    tmp.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(FB_PATH)


def _verify_admin(token: str) -> None:
    if token != ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="Admin token geçersiz.")


# ---- PUBLIC: site -> feedback gönder
@router.post("/api/feedback")
def create_feedback(payload: Dict[str, Any] = Body(...)):
    name = str(payload.get("name", "")).strip()
    email = str(payload.get("email", "")).strip()
    subject = str(payload.get("subject", "")).strip()
    message = str(payload.get("message", "")).strip()
    meta = payload.get("meta")

    if not name or not email or not subject or not message:
        raise HTTPException(status_code=400, detail="name/email/subject/message zorunlu.")

    items = _read_list()
    new_id = (max([x.get("id", 0) for x in items], default=0) + 1) if items else 1

    item = {
        "id": new_id,
        "name": name,
        "email": email,
        "subject": subject,
        "message": message,
        "meta": meta,
        "status": "new",
        "created_at": _now_iso(),
    }

    items.insert(0, item)  # en üste
    _write_list(items)
    return {"status": "ok", "id": new_id}


# ---- ADMIN: feedback listele
@router.get("/admin/feedback")
def admin_list_feedback(token: str = Query(...)):
    _verify_admin(token)
    return _read_list()


# ---- ADMIN: status değiştir
@router.post("/admin/feedback/{fb_id}/status")
def admin_set_feedback_status(
    fb_id: int,
    token: str = Query(...),
    status: str = Body(..., embed=True),
):
    _verify_admin(token)
    status = (status or "").strip().lower()
    if status not in ("new", "resolved"):
        raise HTTPException(status_code=400, detail="status sadece 'new' veya 'resolved' olabilir.")

    items = _read_list()
    found = False
    for x in items:
        if int(x.get("id", -1)) == fb_id:
            x["status"] = status
            x["updated_at"] = _now_iso()
            found = True
            break

    if not found:
        raise HTTPException(status_code=404, detail="Feedback bulunamadı.")

    _write_list(items)
    return {"status": "ok"}


# ---- ADMIN: sil
@router.delete("/admin/feedback/{fb_id}")
def admin_delete_feedback(fb_id: int, token: str = Query(...)):
    _verify_admin(token)
    items = _read_list()
    new_items = [x for x in items if int(x.get("id", -1)) != fb_id]
    if len(new_items) == len(items):
        raise HTTPException(status_code=404, detail="Feedback bulunamadı.")
    _write_list(new_items)
    return {"status": "ok"}