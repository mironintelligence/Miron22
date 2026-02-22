import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import HTTPException

DATA_DIR = Path(os.getenv("DATA_DIR") or "data")
DATA_DIR.mkdir(parents=True, exist_ok=True)
DISCOUNT_CODES_FILE = DATA_DIR / "discount_codes.json"

def _now_utc() -> datetime:
    return datetime.now(timezone.utc)

def _normalize_code(code: str) -> str:
    return (code or "").strip().upper()

def _load_discounts() -> List[Dict[str, Any]]:
    if not DISCOUNT_CODES_FILE.exists():
        return []
    try:
        with DISCOUNT_CODES_FILE.open("r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                return data
            return []
    except Exception:
        return []

def _save_discounts(items: List[Dict[str, Any]]) -> None:
    DISCOUNT_CODES_FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp = DISCOUNT_CODES_FILE.with_suffix(".tmp")
    try:
        with tmp.open("w", encoding="utf-8") as f:
            json.dump(items, f, indent=2)
        os.replace(tmp, DISCOUNT_CODES_FILE)
    except Exception as e:
        if tmp.exists():
            try:
                tmp.unlink()
            except Exception:
                pass
        raise HTTPException(status_code=500, detail=f"Failed to save discount codes: {str(e)}")

def find_valid_discount(code: str) -> Optional[Dict[str, Any]]:
    c = _normalize_code(code)
    if not c:
        return None
    all_codes = _load_discounts()
    now = _now_utc()
    for item in all_codes:
        stored = _normalize_code(str(item.get("code", "")))
        if stored != c:
            continue
        if not item.get("active", True):
            return None
        max_usage = item.get("max_usage")
        used_count = int(item.get("used_count") or 0)
        if isinstance(max_usage, int) and max_usage > 0 and used_count >= max_usage:
            return None
        exp = item.get("expires_at")
        if exp:
            try:
                exp_dt = datetime.fromisoformat(str(exp))
                if exp_dt.tzinfo is None:
                    exp_dt = exp_dt.replace(tzinfo=timezone.utc)
            except Exception:
                return None
            if exp_dt <= now:
                return None
        return item
    return None

def increment_usage(code: str) -> None:
    c = _normalize_code(code)
    if not c:
        return
    items = _load_discounts()
    changed = False
    now = _now_utc().isoformat()
    for item in items:
        if _normalize_code(str(item.get("code", ""))) == c:
            item["used_count"] = int(item.get("used_count") or 0) + 1
            item["last_used_at"] = now
            changed = True
            break
    if changed:
        _save_discounts(items)

def create_discount(code: str, type: str, value: float, max_usage: Optional[int], expires_at: Optional[str], description: Optional[str]) -> Dict[str, Any]:
    items = _load_discounts()
    norm_code = _normalize_code(code)
    for it in items:
        if _normalize_code(str(it.get("code", ""))) == norm_code:
            raise HTTPException(status_code=409, detail="discount_code_exists")
    now = _now_utc().isoformat()
    item = {
        "code": norm_code,
        "type": type,
        "value": value,
        "active": True,
        "max_usage": max_usage,
        "used_count": 0,
        "created_at": now,
        "expires_at": expires_at,
        "description": description or "",
    }
    items.append(item)
    _save_discounts(items)
    return item

def toggle_discount(code: str, active: bool) -> Dict[str, Any]:
    items = _load_discounts()
    c = _normalize_code(code)
    found = False
    for it in items:
        if _normalize_code(str(it.get("code", ""))) == c:
            it["active"] = bool(active)
            found = True
            break
    if not found:
        raise HTTPException(status_code=404, detail="discount_code_not_found")
    _save_discounts(items)
    return {"ok": True, "code": c, "active": bool(active)}
