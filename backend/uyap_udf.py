# backend/uyap_udf.py
from __future__ import annotations

import re
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Body, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

router = APIRouter(prefix="/uyap", tags=["uyap-udf"])


class UdfRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)
    created_at: Optional[str] = None  # "YYYY-MM-DD HH:MM:SS" gibi; boşsa now()


def _safe_filename(name: str) -> str:
    name = (name or "").strip()

    # Türkçe karakterleri de koruyup tehlikeli karakterleri ayıkla
    # Windows için de güvenli olsun:
    name = re.sub(r'[\\/:*?"<>|]+', "", name)
    name = re.sub(r"[^\w\s\-.]", "", name, flags=re.UNICODE)
    name = re.sub(r"\s+", "", name).strip(".-")

    if not name:
        name = "dilekce"
    return name[:80]


def _normalize_ts(created_at: Optional[str]) -> str:
    if created_at:
        v = created_at.strip()
        if v:
            return v
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def _build_udf(title: str, content: str, created_at: Optional[str]) -> str:
    ts = _normalize_ts(created_at)

    # UDF içinde sorun çıkarabilecek kontrol karakterlerini temizle
    content = (content or "").replace("\x00", "").replace("\r\n", "\n").strip()
    title = (title or "").replace("\x00", "").strip()

    # Minimal text-container format (sonradan UYAP standardına göre genişletilebilir)
    return (
        f"TITLE:{title}\n"
        f"CREATED_AT:{ts}\n"
        "-----CONTENT_START-----\n"
        f"{content}\n"
        "-----CONTENT_END-----\n"
    )


@router.get("/ping")
def ping():
    return {"ok": True, "service": "uyap-udf"}


@router.post("/udf")
def create_udf(payload: UdfRequest = Body(...)):
    try:
        udf_text = _build_udf(payload.title, payload.content, payload.created_at)
        filename = _safe_filename(payload.title) + ".udf"

        return Response(
            content=udf_text.encode("utf-8"),
            media_type="application/octet-stream",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"UDF oluşturma hatası: {e}")