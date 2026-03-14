from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Body, Query, Depends
from admin_auth import require_admin # Use centralized admin auth
from db import get_db_cursor
import json
from psycopg2.extras import Json

router = APIRouter(prefix="/api/feedback", tags=["Geri Bildirim"])

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

# ---- PUBLIC: site -> feedback gönder
@router.post("")
def create_feedback(payload: Dict[str, Any] = Body(...)):
    name = str(payload.get("name", "")).strip()
    email = str(payload.get("email", "")).strip()
    subject = str(payload.get("subject", "")).strip()
    message = str(payload.get("message", "")).strip()
    meta = payload.get("meta")
    meta_param = None
    if meta is not None:
        try:
            meta_param = Json(meta, dumps=lambda obj: json.dumps(obj, ensure_ascii=False, default=str))
        except TypeError:
            raise HTTPException(status_code=400, detail="Meta alanı geçerli bir JSON olmalıdır.")

    if not name or not email or not subject or not message:
        raise HTTPException(status_code=400, detail="Ad, E-posta, Konu ve Mesaj alanları zorunludur.")

    fid = str(uuid.uuid4())
    with get_db_cursor() as cur:
        cur.execute(
            """
            INSERT INTO feedback_messages (id, name, email, subject, message, meta_data, status, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, 'new', NOW())
            RETURNING id
            """,
            (fid, name, email, subject, message, meta_param),
        )
        row = cur.fetchone()
        return {"status": "ok", "id": str(row["id"]), "message": "Geri bildiriminiz başarıyla alındı."}


# ---- ADMIN: feedback listele
@router.get("/list", dependencies=[Depends(require_admin)])
def admin_list_feedback():
    with get_db_cursor() as cur:
        cur.execute("SELECT * FROM feedback_messages ORDER BY created_at DESC LIMIT 500")
        return cur.fetchall()


# ---- ADMIN: status değiştir
@router.post("/{fb_id}/status", dependencies=[Depends(require_admin)])
def admin_set_feedback_status(
    fb_id: str,
    status: str = Body(..., embed=True),
):
    status = (status or "").strip().lower()
    if status not in ("new", "resolved"):
        raise HTTPException(status_code=400, detail="Status sadece 'new' veya 'resolved' olabilir.")
    with get_db_cursor() as cur:
        cur.execute(
            "UPDATE feedback_messages SET status = %s, updated_at = NOW() WHERE id = %s RETURNING id",
            (status, fb_id),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Geri bildirim bulunamadı.")
        return {"status": "ok"}


# ---- ADMIN: sil
@router.delete("/{fb_id}", dependencies=[Depends(require_admin)])
def admin_delete_feedback(fb_id: str):
    with get_db_cursor() as cur:
        cur.execute("DELETE FROM feedback_messages WHERE id = %s RETURNING id", (fb_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Geri bildirim bulunamadı.")
        return {"status": "ok"}
