import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from db import get_db_cursor
from user_auth import get_current_user


router = APIRouter(prefix="/api/reminders", tags=["Dava Hatırlatıcı"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


class ReminderCreate(BaseModel):
    title: str
    due_at: str
    details: Optional[str] = None


@router.get("")
@router.get("/")
def list_reminders(user: Dict[str, Any] = Depends(get_current_user)) -> List[Dict[str, Any]]:
    uid = user.get("id")
    with get_db_cursor() as cur:
        cur.execute(
            """
            SELECT id, title, details, due_at, notified_at, created_at
            FROM case_reminders
            WHERE user_id = %s
            ORDER BY due_at ASC
            LIMIT 200
            """,
            (uid,),
        )
        rows = cur.fetchall() or []
        for r in rows:
            if "id" in r:
                r["id"] = str(r["id"])
        return rows


@router.post("")
@router.post("/")
def create_reminder(payload: ReminderCreate, user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    title = (payload.title or "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="Başlık gerekli.")
    try:
        due = datetime.fromisoformat(payload.due_at.replace("Z", "+00:00"))
        if due.tzinfo is None:
            due = due.replace(tzinfo=timezone.utc)
    except Exception:
        raise HTTPException(status_code=400, detail="Geçersiz tarih formatı.")

    rid = str(uuid.uuid4())
    with get_db_cursor() as cur:
        cur.execute(
            """
            INSERT INTO case_reminders (id, user_id, title, details, due_at, created_at)
            VALUES (%s, %s, %s, %s, %s, NOW())
            RETURNING id
            """,
            (rid, user.get("id"), title, (payload.details or "").strip() or None, due),
        )
        row = cur.fetchone()
        return {"ok": True, "id": str(row["id"]) if row else rid}


@router.delete("/{reminder_id}")
def delete_reminder(reminder_id: str, user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    rid = str(reminder_id)
    with get_db_cursor() as cur:
        cur.execute(
            "DELETE FROM case_reminders WHERE id::text = %s AND user_id = %s RETURNING id",
            (rid, user.get("id")),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Hatırlatıcı bulunamadı.")
        return {"ok": True}

