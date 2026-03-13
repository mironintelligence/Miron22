from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import HTTPException

from db import get_db_cursor

def _now_utc() -> datetime:
    return datetime.now(timezone.utc)

def _normalize_code(code: str) -> str:
    return (code or "").strip().upper()

def list_discounts() -> List[Dict[str, Any]]:
    with get_db_cursor() as cur:
        cur.execute("SELECT * FROM discount_codes ORDER BY created_at DESC")
        rows = cur.fetchall() or []
        out = []
        for r in rows:
            d = dict(r)
            if "is_active" in d and "active" not in d:
                d["active"] = bool(d.get("is_active"))
            out.append(d)
        return out

def find_valid_discount(code: str) -> Optional[Dict[str, Any]]:
    c = _normalize_code(code)
    if not c:
        return None
    with get_db_cursor() as cur:
        cur.execute(
            """
            SELECT code, type, value, max_usage, used_count, expires_at, is_active, description
            FROM discount_codes
            WHERE code = %s
              AND is_active = TRUE
              AND (expires_at IS NULL OR expires_at > NOW())
              AND (max_usage IS NULL OR used_count < max_usage)
            LIMIT 1
            """,
            (c,),
        )
        row = cur.fetchone()
        if not row:
            return None
        d = dict(row)
        d["active"] = bool(d.get("is_active"))
        return d

def increment_usage(code: str) -> None:
    c = _normalize_code(code)
    if not c:
        return
    with get_db_cursor() as cur:
        cur.execute("UPDATE discount_codes SET used_count = used_count + 1 WHERE code = %s", (c,))

def create_discount(code: str, type: str, value: float, max_usage: Optional[int], expires_at: Optional[str], description: Optional[str]) -> Dict[str, Any]:
    norm_code = _normalize_code(code)
    try:
        exp = None
        if expires_at:
            exp = datetime.fromisoformat(expires_at)
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
        with get_db_cursor() as cur:
            cur.execute(
                """
                INSERT INTO discount_codes (code, type, value, max_usage, expires_at, is_active, description)
                VALUES (%s, %s, %s, %s, %s, TRUE, %s)
                RETURNING code, type, value, max_usage, used_count, expires_at, is_active, description
                """,
                (norm_code, type, float(value), max_usage, exp, description or ""),
            )
            row = cur.fetchone()
            d = dict(row)
            d["active"] = bool(d.get("is_active"))
            return d
    except Exception as e:
        msg = str(e)
        if "duplicate" in msg.lower() or "already exists" in msg.lower():
            raise HTTPException(status_code=409, detail="discount_code_exists")
        raise HTTPException(status_code=500, detail="discount_code_create_failed")

def toggle_discount(code: str, active: bool) -> Dict[str, Any]:
    c = _normalize_code(code)
    with get_db_cursor() as cur:
        cur.execute(
            "UPDATE discount_codes SET is_active = %s WHERE code = %s RETURNING code, is_active",
            (bool(active), c),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="discount_code_not_found")
        return {"ok": True, "code": row.get("code"), "active": bool(row.get("is_active"))}
