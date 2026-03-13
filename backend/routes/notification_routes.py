from fastapi import APIRouter, HTTPException, Depends, Body, status
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel
from db import get_db_cursor
from admin_auth import require_admin
from user_auth import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

class NotificationCreate(BaseModel):
    user_id: Optional[str] = None # If None, system-wide or specific target logic needed
    type: str # 'system', 'admin', 'case_reminder'
    title: str
    message: str

# --- Kullanıcı Endpointleri ---

@router.get("/")
def get_my_notifications(user: Dict[str, Any] = Depends(get_current_user)):
    """Kullanıcının kendi bildirimlerini listele"""
    user_id = user.get("id")
    sql = """
        SELECT * FROM notifications 
        WHERE user_id = %s 
        ORDER BY created_at DESC 
        LIMIT 50
    """
    with get_db_cursor() as cur:
        cur.execute(sql, (user_id,))
        return cur.fetchall()

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
