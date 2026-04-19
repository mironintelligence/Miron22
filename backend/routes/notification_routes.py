import logging

from fastapi import APIRouter, HTTPException, Depends, Body
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel
from db import get_db_cursor
from admin_auth import require_admin
from user_auth import get_current_user
from services.notification_delivery import send_email

router = APIRouter(prefix="/api/notifications", tags=["Bildirimler"])
logger = logging.getLogger("miron_notifications")

class NotificationCreate(BaseModel):
    user_id: Optional[str] = None # If None, system-wide or specific target logic needed
    type: str # 'system', 'admin', 'case_reminder'
    title: str
    message: str

# --- Kullanıcı Endpointleri ---

@router.get("", include_in_schema=False)
@router.get("/")
def get_my_notifications(user: Dict[str, Any] = Depends(get_current_user)):
    """Kullanıcının kendi bildirimlerini listele"""
    user_id = user.get("id")
    try:
        with get_db_cursor() as cur:
            try:
                cur.execute(
                    """
                    SELECT t.id AS trigger_id, t.channel, r.id AS reminder_id, r.title, r.details, r.due_at, r.case_number, r.court, t.trigger_at
                    FROM case_reminder_triggers t
                    JOIN case_reminders r ON r.id = t.reminder_id
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
                    details = str(r.get("details") or "").strip()
                    due_at = r.get("due_at")
                    court = str(r.get("court") or "").strip()
                    case_no = str(r.get("case_number") or "").strip()
                    channel = str(r.get("channel") or "in_app").strip().lower()
                    parts = []
                    if details:
                        parts.append(details)
                    if court:
                        parts.append(f"Mahkeme: {court}")
                    if case_no:
                        parts.append(f"Dosya No: {case_no}")
                    parts.append(f"Tarih/Saat: {due_at}")
                    msg = "\n".join(parts).strip()
                    cur.execute(
                        "INSERT INTO notifications (user_id, type, title, message) VALUES (%s, %s, %s, %s)",
                        (user_id, "case_reminder", title, msg),
                    )
                    if channel == "email":
                        cur.execute("SELECT email FROM users WHERE id = %s", (user_id,))
                        u = cur.fetchone() or {}
                        email = str(u.get("email") or "").strip()
                        if email:
                            try:
                                send_email(email, title, msg)
                            except Exception:
                                logger.exception(
                                    "send_email failed for case_reminder user_id=%s", user_id
                                )
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
                    details = str(r.get("details") or "").strip()
                    due_at = r.get("due_at")
                    msg = f"{details}\n\nTarih/Saat: {due_at}" if details else f"Tarih/Saat: {due_at}"
                    cur.execute(
                        "INSERT INTO notifications (user_id, type, title, message) VALUES (%s, %s, %s, %s)",
                        (user_id, "case_reminder", title, msg),
                    )
                    cur.execute(
                        "UPDATE case_reminders SET notified_at = NOW() WHERE id = %s",
                        (r.get("id"),),
                    )
    except Exception:
        logger.exception(
            "reminder fan-out failed (continuing to list notifications) user_id=%s",
            user_id,
        )

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
