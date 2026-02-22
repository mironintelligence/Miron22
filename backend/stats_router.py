# backend/stats_router.py
from fastapi import APIRouter
from datetime import datetime

stats_router = APIRouter(prefix="/stats", tags=["Raporlama"])

@stats_router.get("/")
def get_stats():
    last_updated = datetime.now().strftime("%d.%m.%Y %H:%M")
    return {
        "total_files": 0,
        "total_sessions": 0,
        "avg_success": 0,
        "kvkk_mask_rate": 0,
        "top_dilekce": "Veri yok",
        "system_status": "Aktif",
        "last_updated": last_updated
    }
