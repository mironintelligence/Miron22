# backend/stats_router.py
from fastapi import APIRouter, Depends
from datetime import datetime
from typing import Any, Dict
from user_auth import get_current_user

stats_router = APIRouter(prefix="/stats", tags=["Raporlama"])


@stats_router.get("/")
def get_stats(_user: Dict[str, Any] = Depends(get_current_user)):
    last_updated = datetime.now().strftime("%d.%m.%Y %H:%M")
    return {
        "total_files": 0,
        "total_sessions": 0,
        "avg_success": 0,
        "kvkk_mask_rate": 0,
        "top_dilekce": "Veri yok",
        "system_status": "Aktif",
        "last_updated": last_updated,
    }
