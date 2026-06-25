import logging

from fastapi import APIRouter, HTTPException, Depends, Body, BackgroundTasks
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel
from db import get_db_cursor
from admin_auth import require_admin
from user_auth import get_current_user
from services.notification_delivery import send_email, build_reminder_email

router = APIRouter(prefix="/api/notifications", tags=["Bildirimler"])
logger = logging.getLogger("miron_notifications")


def _fmt_due(dt) -> str:
    try:
        return dt.astimezone().strftime("%d %B %Y, %H:%M")
    except Exception:
        return str(dt)


def _offset_label(minutes: int) -> str:
    if minutes >= 7 * 24 * 60: return "7 gün"
    if minutes >= 24 * 60:     return f"{minutes // (24 * 60)} gün"
    if minutes >= 60:          return f"{minutes // 60} saat"
    return f"{minutes} dakika"


def _lawyer_display(first: Optional[str], last: Optional[str]) -> str:
    name = " ".join(p for p in [first, last] if p and p.strip()).strip()
    return f"Av. {name}" if name else "Değerli Avukat"


def _send_email_safely(email: str, subject: str, html: str) -> None:
    try:
        send_email(email, subject, html)
    except Exception:
        pass


def _fanout_due_reminders(user_id: str, pending_emails: list[tuple[str, str, str]]) -> None:
    """Create in-app rows for due reminders; append (email, subject, html) jobs to pending_emails."""
    with get_db_cursor() as cur:
        try:
            cur.execute(
                """
                SELECT t.id AS trigger_id, t.channel, r.id AS reminder_id,
                       r.title, r.details, r.due_at, r.case_number, r.court, t.trigger_at,
                       u.email AS user_email, u.first_name, u.last_name
                FROM case_reminder_triggers t
                JOIN case_reminders r ON r.id = t.reminder_id
                JOIN users u ON u.id = t.user_id
                WHERE t.user_id = %s
                  AND t.sent_at IS NULL
                  AND r.archived_at IS NULL
                  AND t.trigger_at <= NOW()
                ORDER BY t.trigger_at ASC
                LIMIT 50
                """,
                (user_id,),
            )
            due = cur.fetchall() or []
            for r in due:
                title = str(r.get("title") or "Dava Hatırlatıcı")
                due_at = r.get("due_at")
                channel = str(r.get("channel") or "in_app").strip().lower()
                due_fmt = _fmt_due(due_at) if due_at else ""

                # in_app bildirimi (her kanalda oluştur)
                parts = [f"Tarih: {due_fmt}"]
                if r.get("court"):       parts.append(f"Mahkeme: {r['court']}")
                if r.get("case_number"): parts.append(f"Dosya No: {r['case_number']}")
                cur.execute(
                    "INSERT INTO notifications (user_id, type, title, message, is_read) VALUES (%s, %s, %s, %s, FALSE)",
                    (user_id, "case_reminder", title, "\n".join(parts)),
                )

                # email kanalı → branded HTML şablon
                if channel == "email":
                    email_addr = str(r.get("user_email") or "").strip()
                    if email_addr:
                        trigger_at = r.get("trigger_at")
                        diff_min = int((due_at - trigger_at).total_seconds() / 60) if (trigger_at and due_at) else 0
                        lawyer = _lawyer_display(r.get("first_name"), r.get("last_name"))
                        subj, html = build_reminder_email(
                            lawyer_name  = lawyer,
                            title        = title,
                            due_at_fmt   = due_fmt,
                            court        = r.get("court"),
                            case_number  = r.get("case_number"),
                            details      = r.get("details"),
                            offset_label = _offset_label(diff_min),
                        )
                        pending_emails.append((email_addr, subj, html))

                cur.execute(
                    "UPDATE case_reminder_triggers SET sent_at = NOW() WHERE id = %s",
                    (r.get("trigger_id"),),
                )
        except Exception:
            cur.execute(
                """
                SELECT id, title, details, due_at
                FROM case_reminders
                WHERE user_id = %s
                  AND notified_at IS NULL
                  AND due_at <= NOW()
                ORDER BY due_at ASC
                LIMIT 50
                """,
                (user_id,),
            )
            due = cur.fetchall() or []
            for r in due:
                title = str(r.get("title") or "Dava Hatırlatıcı")
                due_at = r.get("due_at")
                msg = f"Tarih: {_fmt_due(due_at)}" if due_at else title
                cur.execute(
                    "INSERT INTO notifications (user_id, type, title, message, is_read) VALUES (%s, %s, %s, %s, FALSE)",
                    (user_id, "case_reminder", title, msg),
                )
                cur.execute(
                    "UPDATE case_reminders SET notified_at = NOW() WHERE id = %s",
                    (r.get("id"),),
                )


class NotificationCreate(BaseModel):
    user_id: Optional[str] = None # If None, system-wide or specific target logic needed
    type: str # 'system', 'admin', 'case_reminder'
    title: str
    message: str

# --- Kullanıcı Endpointleri ---

# Hem /api/notifications hem /api/notifications/ (307 yönlendirmesiz).
@router.get("", include_in_schema=False)
@router.get("/")
def get_my_notifications(
    background_tasks: BackgroundTasks,
    user: Dict[str, Any] = Depends(get_current_user),
):
    """List the caller's notifications.

    This endpoint is polled every minute by every authed browser tab, so it is
    the single hottest read in the system. Two rules:
      1. Keep the query plan narrow: one composite index hit for the SELECT.
      2. Never do a blocking network call (SMTP) while holding a DB cursor.
         Email delivery is scheduled via BackgroundTasks.
    """
    user_id = user.get("id")
    pending_emails: list[tuple[str, str, str]] = []

    try:
        _fanout_due_reminders(str(user_id), pending_emails)
    except Exception:
        logger.exception(
            "reminder fan-out failed (continuing to list notifications) user_id=%s",
            user_id,
        )

    for email_addr, subject, html in pending_emails:
        background_tasks.add_task(_send_email_safely, email_addr, subject, html)

    sql = """
        SELECT * FROM notifications
        WHERE user_id = %s
        ORDER BY created_at DESC
        LIMIT 50
    """
    try:
        with get_db_cursor() as cur:
            cur.execute(sql, (user_id,))
            return cur.fetchall()
    except Exception:
        logger.exception("notification list fetch failed user_id=%s", user_id)
        return []


@router.get("/unread-count")
def get_unread_count(user: Dict[str, Any] = Depends(get_current_user)):
    user_id = user.get("id")
    with get_db_cursor() as cur:
        cur.execute(
            """
            SELECT COUNT(*) AS c
            FROM notifications
            WHERE user_id = %s AND is_read = FALSE
            """,
            (user_id,),
        )
        row = cur.fetchone() or {}
    return {"count": int(row.get("c") or 0)}

@router.post("/{notif_id}/read")
def mark_as_read(notif_id: int, user: Dict[str, Any] = Depends(get_current_user)):
    """Bildirimi okundu olarak işaretle"""
    user_id = user.get("id")
    sql = """
        UPDATE notifications 
        SET is_read = TRUE 
        WHERE id = %s AND user_id = %s
    """
    with get_db_cursor() as cur:
        cur.execute(sql, (notif_id, user_id))
    return {"status": "ok"}

# --- Admin Endpointleri ---

@router.post("/send", dependencies=[Depends(require_admin)])
def send_notification(payload: NotificationCreate):
    """Admin: Belirli bir kullanıcıya veya herkese (loop ile) bildirim gönder"""
    
    # Eğer user_id varsa tekil gönderim
    if payload.user_id:
        sql = """
            INSERT INTO notifications (user_id, type, title, message)
            VALUES (%s, %s, %s, %s)
        """
        with get_db_cursor() as cur:
            cur.execute(sql, (payload.user_id, payload.type, payload.title, payload.message))
        return {"status": "ok", "message": "Bildirim gönderildi."}
    
    # Eğer user_id yoksa, bu bir "Broadcast" denemesi olabilir (Tüm kullanıcılara)
    # Şimdilik basit tutalım, broadcast için ayrı endpoint veya logic eklenebilir.
    # Burada sadece hata dönelim veya 'all' flag'i bekleyelim.
    return {"status": "error", "message": "user_id gerekli (Broadcast özelliği eklenecek)."}

@router.post("/broadcast", dependencies=[Depends(require_admin)])
def broadcast_notification(title: str = Body(...), message: str = Body(...)):
    """Admin: Tüm kullanıcılara duyuru gönder"""
    # Bu işlem ağır olabilir, background task olarak yapılmalı.
    # Şimdilik basit döngü ile (Limitli)
    
    sql_users = "SELECT id FROM users WHERE is_active = TRUE"
    
    with get_db_cursor() as cur:
        cur.execute(sql_users)
        users = cur.fetchall()
        
        # Batch insert
        if not users:
            return {"status": "ok", "count": 0}
            
        args_list = [(u['id'], 'admin', title, message) for u in users]
        sql_insert = "INSERT INTO notifications (user_id, type, title, message) VALUES (%s, %s, %s, %s)"
        
        cur.executemany(sql_insert, args_list)
        
    return {"status": "ok", "count": len(users), "message": "Duyuru tüm kullanıcılara gönderildi."}
