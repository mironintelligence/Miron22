import uuid
from datetime import datetime, timezone, timedelta
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
    case_number: Optional[str] = None
    court: Optional[str] = None
    remind_offsets_minutes: Optional[List[int]] = None
    channels: Optional[List[str]] = None


@router.get("")
@router.get("/")
def list_reminders(user: Dict[str, Any] = Depends(get_current_user)) -> List[Dict[str, Any]]:
    uid = user.get("id")
    with get_db_cursor() as cur:
        cur.execute(
            """
            SELECT id, title, details, due_at, notified_at, created_at, case_number, court, remind_offsets_minutes, archived_at
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
    offsets = payload.remind_offsets_minutes or [10080, 1440, 60]
    offsets = [int(x) for x in offsets if x is not None]
    offsets = sorted(list({x for x in offsets if x >= 0}))
    channels = payload.channels or ["in_app"]
    channels = [str(c).strip().lower() for c in channels if c]
    channels = sorted(list({c for c in channels if c in {"in_app", "email", "sms", "push"}})) or ["in_app"]
    with get_db_cursor() as cur:
        cur.execute(
            """
            INSERT INTO case_reminders (id, user_id, title, details, due_at, created_at, case_number, court, remind_offsets_minutes)
            VALUES (%s, %s, %s, %s, %s, NOW(), %s, %s, %s)
            RETURNING id
            """,
            (
                rid,
                user.get("id"),
                title,
                (payload.details or "").strip() or None,
                due,
                (payload.case_number or "").strip() or None,
                (payload.court or "").strip() or None,
                offsets if offsets else None,
            ),
        )
        row = cur.fetchone()
        try:
            for off in offsets:
                trigger_at = due - timedelta(minutes=int(off))
                for ch in channels:
                    tid = str(uuid.uuid4())
                    cur.execute(
                        """
                        INSERT INTO case_reminder_triggers (id, reminder_id, user_id, channel, trigger_at, created_at)
                        VALUES (%s, %s, %s, %s, %s, NOW())
                        """,
                        (tid, rid, user.get("id"), ch, trigger_at),
                    )
        except Exception:
            pass
        return {"ok": True, "id": str(row["id"]) if row else rid}


@router.post("/{reminder_id}/archive")
def archive_reminder(reminder_id: str, user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    rid = str(reminder_id)
    with get_db_cursor() as cur:
        cur.execute(
            """
            UPDATE case_reminders
            SET archived_at = NOW()
            WHERE id::text = %s AND user_id = %s
            RETURNING id
            """,
            (rid, user.get("id")),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Hatırlatıcı bulunamadı.")
        try:
            cur.execute(
                "UPDATE case_reminder_triggers SET sent_at = NOW() WHERE reminder_id::text = %s AND user_id = %s AND sent_at IS NULL",
                (rid, user.get("id")),
            )
        except Exception:
            pass
        return {"ok": True}


@router.post("/{reminder_id}/unarchive")
def unarchive_reminder(reminder_id: str, user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    rid = str(reminder_id)
    with get_db_cursor() as cur:
        cur.execute(
            """
            UPDATE case_reminders
            SET archived_at = NULL
            WHERE id::text = %s AND user_id = %s
            RETURNING id, due_at, remind_offsets_minutes
            """,
            (rid, user.get("id")),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Hatırlatıcı bulunamadı.")
        try:
            due_at = row.get("due_at")
            offsets = row.get("remind_offsets_minutes") or []
            for off in offsets:
                tid = str(uuid.uuid4())
                trigger_at = due_at - timedelta(minutes=int(off))
                cur.execute(
                    """
                    INSERT INTO case_reminder_triggers (id, reminder_id, user_id, channel, trigger_at, created_at)
                    VALUES (%s, %s, %s, %s, %s, NOW())
                    """,
                    (tid, rid, user.get("id"), "in_app", trigger_at),
                )
        except Exception:
            pass
        return {"ok": True}


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
