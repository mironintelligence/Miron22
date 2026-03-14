import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import HTTPException

from db import get_db_cursor

def _now_utc() -> datetime:
    return datetime.now(timezone.utc)

def _normalize_code(code: str) -> str:
    return (code or "").strip().upper()

_TEST_DISCOUNTS: Dict[str, Dict[str, Any]] = {}
_SCHEMA_READY = False


def _ensure_schema_ready() -> None:
    global _SCHEMA_READY
    if _SCHEMA_READY or _use_test_memory():
        return
    from schema import ensure_schema
    ensure_schema()
    _SCHEMA_READY = True

def _use_test_memory() -> bool:
    return os.getenv("ENVIRONMENT") == "test" and not os.getenv("DATABASE_URL")

def list_discounts() -> List[Dict[str, Any]]:
    if _use_test_memory():
        return [dict(v) for v in _TEST_DISCOUNTS.values()]
    _ensure_schema_ready()
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
    if _use_test_memory():
        d = _TEST_DISCOUNTS.get(c)
        if not d:
            return None
        if not d.get("active", True):
            return None
        exp = d.get("expires_at")
        if exp:
            try:
                exp_dt = datetime.fromisoformat(exp) if isinstance(exp, str) else exp
                if exp_dt.tzinfo is None:
                    exp_dt = exp_dt.replace(tzinfo=timezone.utc)
                if exp_dt <= _now_utc():
                    return None
            except Exception:
                return None
        max_usage = d.get("max_usage")
        used_count = d.get("used_count") or 0
        if max_usage is not None and used_count >= int(max_usage):
            return None
        return dict(d)
    _ensure_schema_ready()
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
    if _use_test_memory():
        d = _TEST_DISCOUNTS.get(c)
        if d:
            d["used_count"] = int(d.get("used_count") or 0) + 1
        return
    _ensure_schema_ready()
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
        if _use_test_memory():
            if norm_code in _TEST_DISCOUNTS:
                raise HTTPException(status_code=409, detail="discount_code_exists")
            d = {
                "code": norm_code,
                "type": type,
                "value": float(value),
                "max_usage": max_usage,
                "used_count": 0,
                "expires_at": exp.isoformat() if exp else None,
                "active": True,
                "description": description or "",
            }
            _TEST_DISCOUNTS[norm_code] = d
            return dict(d)
        _ensure_schema_ready()
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
    if _use_test_memory():
        d = _TEST_DISCOUNTS.get(c)
        if not d:
            raise HTTPException(status_code=404, detail="discount_code_not_found")
        d["active"] = bool(active)
        return {"ok": True, "code": d.get("code"), "active": bool(d.get("active"))}
    _ensure_schema_ready()
    with get_db_cursor() as cur:
        cur.execute(
            "UPDATE discount_codes SET is_active = %s WHERE code = %s RETURNING code, is_active",
            (bool(active), c),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="discount_code_not_found")
        return {"ok": True, "code": row.get("code"), "active": bool(row.get("is_active"))}

def _save_discounts(discounts: List[Dict[str, Any]]) -> None:
    if _use_test_memory():
        _TEST_DISCOUNTS.clear()
        for d in discounts or []:
            c = _normalize_code(d.get("code") or "")
            if not c:
                continue
            _TEST_DISCOUNTS[c] = {
                "code": c,
                "type": d.get("type") or "percent",
                "value": float(d.get("value") or 0),
                "max_usage": d.get("max_usage"),
                "used_count": int(d.get("used_count") or 0),
                "expires_at": d.get("expires_at"),
                "active": bool(d.get("active", True)),
                "description": d.get("description") or "",
            }
        return
    _ensure_schema_ready()
    with get_db_cursor() as cur:
        cur.execute("DELETE FROM discount_codes")
        for d in discounts or []:
            code = _normalize_code(d.get("code") or "")
            if not code:
                continue
            exp = d.get("expires_at")
            exp_dt = None
            if exp:
                exp_dt = datetime.fromisoformat(exp) if isinstance(exp, str) else exp
                if exp_dt.tzinfo is None:
                    exp_dt = exp_dt.replace(tzinfo=timezone.utc)
            cur.execute(
                """
                INSERT INTO discount_codes (code, type, value, max_usage, used_count, expires_at, is_active, description)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    code,
                    d.get("type") or "percent",
                    float(d.get("value") or 0),
                    d.get("max_usage"),
                    int(d.get("used_count") or 0),
                    exp_dt,
                    bool(d.get("active", True)),
                    d.get("description") or "",
                ),
            )
