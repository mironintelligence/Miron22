import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from db import get_db_cursor


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _use_test_memory() -> bool:
    return (os.getenv("ENVIRONMENT") or "").lower() == "test" and (os.getenv("TEST_USE_REMOTE_DB", "false") or "").lower() != "true"


_MEM_BY_ID: Dict[str, Dict[str, Any]] = {}
_MEM_BY_EMAIL: Dict[str, str] = {}


def create_or_update_demo_request(email: str, first_name: str, last_name: str, phone: Optional[str], note: Optional[str]) -> Dict[str, Any]:
    em = (email or "").strip().lower()
    if _use_test_memory():
        rid = _MEM_BY_EMAIL.get(em) or str(uuid.uuid4())
        row = {
            "id": rid,
            "email": em,
            "first_name": (first_name or "").strip(),
            "last_name": (last_name or "").strip(),
            "phone": phone,
            "note": note,
            "status": "pending",
            "approved_until": None,
            "updated_at": _now_utc(),
        }
        _MEM_BY_ID[rid] = row
        _MEM_BY_EMAIL[em] = rid
        return dict(row)

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
            RETURNING id, email, first_name, last_name, phone, note, status, approved_until, updated_at
            """,
            (rid, em, (first_name or "").strip(), (last_name or "").strip(), phone, note),
        )
        return dict(cur.fetchone() or {})


def get_demo_request_status(email: str) -> Optional[Dict[str, Any]]:
    em = (email or "").strip().lower()
    if not em:
        return None
    if _use_test_memory():
        rid = _MEM_BY_EMAIL.get(em)
        return dict(_MEM_BY_ID.get(rid) or {}) if rid else None

    with get_db_cursor() as cur:
        cur.execute("SELECT status, approved_until, updated_at FROM demo_requests WHERE email = %s LIMIT 1", (em,))
        row = cur.fetchone()
        return dict(row) if row else None


def list_demo_requests(status: Optional[str] = None) -> List[Dict[str, Any]]:
    if _use_test_memory():
        rows = list(_MEM_BY_ID.values())
        if status:
            rows = [r for r in rows if r.get("status") == status]
        rows.sort(key=lambda x: x.get("updated_at") or _now_utc(), reverse=True)
        return [dict(r) for r in rows]

    sql = "SELECT * FROM demo_requests"
    params: list = []
    if status:
        sql += " WHERE status = %s"
        params.append(status)
    sql += " ORDER BY updated_at DESC"
    with get_db_cursor() as cur:
        cur.execute(sql, tuple(params))
        return [dict(r) for r in (cur.fetchall() or [])]


def approve_demo_request(id_or_email: str, days: int = 7) -> Optional[Dict[str, Any]]:
    rid = str(id_or_email or "").strip()
    if not rid:
        return None
    until = _now_utc() + timedelta(days=int(days))

    if _use_test_memory():
        row = _MEM_BY_ID.get(rid)
        if not row and "@" in rid:
            row = _MEM_BY_ID.get(_MEM_BY_EMAIL.get(rid.lower()) or "")
        if not row:
            return None
        row["status"] = "approved"
        row["approved_until"] = until
        row["updated_at"] = _now_utc()
        return dict(row)

    with get_db_cursor() as cur:
        cur.execute(
            "UPDATE demo_requests SET status = 'approved', approved_until = NOW() + INTERVAL '7 days', updated_at = NOW() WHERE id = %s RETURNING *",
            (rid,),
        )
        row = cur.fetchone()
        return dict(row) if row else None


def reject_demo_request(id_or_email: str) -> Optional[Dict[str, Any]]:
    rid = str(id_or_email or "").strip()
    if not rid:
        return None

    if _use_test_memory():
        row = _MEM_BY_ID.get(rid)
        if not row and "@" in rid:
            row = _MEM_BY_ID.get(_MEM_BY_EMAIL.get(rid.lower()) or "")
        if not row:
            return None
        row["status"] = "rejected"
        row["updated_at"] = _now_utc()
        return dict(row)

    with get_db_cursor() as cur:
        cur.execute(
            "UPDATE demo_requests SET status = 'rejected', updated_at = NOW() WHERE id = %s RETURNING *",
            (rid,),
        )
        row = cur.fetchone()
        return dict(row) if row else None
