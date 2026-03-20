from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Body, HTTPException
from pydantic import BaseModel, EmailStr, Field

from stores.demo_requests_store import create_or_update_demo_request, get_demo_request_status

router = APIRouter(prefix="/api", tags=["Demo"])


class DemoRequestIn(BaseModel):
    email: EmailStr
    firstName: str = Field(min_length=1, max_length=64)
    lastName: str = Field(min_length=1, max_length=64)
    phone: Optional[str] = Field(default=None, max_length=32)
    note: Optional[str] = Field(default=None, max_length=1000)


@router.post("/demo-request")
def create_demo_request(payload: DemoRequestIn) -> Dict[str, Any]:
    email = str(payload.email).strip().lower()
    row = create_or_update_demo_request(
        email=email,
        first_name=payload.firstName.strip(),
        last_name=payload.lastName.strip(),
        phone=payload.phone,
        note=payload.note,
    )
    return {"status": "ok", "id": str(row.get("id")), "demo_status": row.get("status"), "message": "Demo talebiniz alındı."}


@router.get("/demo-request/status")
def demo_request_status(email: str) -> Dict[str, Any]:
    email_norm = (email or "").strip().lower()
    if not email_norm:
        raise HTTPException(status_code=400, detail="Email gerekli.")
    row = get_demo_request_status(email_norm)
    if not row:
        return {"status": "ok", "demo_status": "none"}
    return {
        "status": "ok",
        "demo_status": row.get("status"),
        "approved_until": row.get("approved_until"),
        "updated_at": row.get("updated_at"),
    }
