from __future__ import annotations

import uuid
from typing import Any, Dict, Optional

from fastapi import APIRouter, Body, HTTPException
from pydantic import BaseModel, EmailStr, Field

from db import get_db_cursor

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
    rid = str(uuid.uuid4())
    with get_db_cursor() as cur:
        cur.execute(
            """
            INSERT INTO demo_requests (id, email, first_name, last_name, phone, note, status, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, 'pending', NOW())
            ON CONFLICT (email) DO UPDATE SET
                first_name = EXCLUDED.first_name,
                last_name = EXCLUDED.last_name,
                phone = EXCLUDED.phone,
                note = EXCLUDED.note,
                updated_at = NOW()
            RETURNING id, status
            """,
            (rid, email, payload.firstName.strip(), payload.lastName.strip(), payload.phone, payload.note),
        )
        row = cur.fetchone()
        return {"status": "ok", "id": str(row["id"]), "demo_status": row["status"], "message": "Demo talebiniz alındı."}


@router.get("/demo-request/status")
def demo_request_status(email: str) -> Dict[str, Any]:
    email_norm = (email or "").strip().lower()
    if not email_norm:
        raise HTTPException(status_code=400, detail="Email gerekli.")
    with get_db_cursor() as cur:
        cur.execute("SELECT status, approved_until, updated_at FROM demo_requests WHERE email = %s LIMIT 1", (email_norm,))
        row = cur.fetchone()
        if not row:
            return {"status": "ok", "demo_status": "none"}
        return {
            "status": "ok",
            "demo_status": row.get("status"),
            "approved_until": row.get("approved_until"),
            "updated_at": row.get("updated_at"),
        }
