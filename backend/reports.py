# backend/reports.py
from fastapi import APIRouter, Query
from typing import Dict
from datetime import datetime
from pathlib import Path
import json

DATA_DIR = Path("backend/data")
CASES_FILE = DATA_DIR / "cases.json"
EVENTS_FILE = DATA_DIR / "case_events.json"

router = APIRouter(prefix="/reports", tags=["reports"])

def _read_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8") or "[]")
    except Exception:
        return []

@router.get("/overview")
def overview():
    cases = _read_json(CASES_FILE)
    events = _read_json(EVENTS_FILE)

    total_cases = len(cases)

    by_type: Dict[str, int] = {"icra": 0, "dava": 0, "danismanlik": 0}
    for c in cases:
        t = c.get("type")
        if t in by_type:
            by_type[t] += 1

    total_collected = 0.0
    for e in events:
        if e.get("event_type") in ("tahsilat", "haciz", "satis") and e.get("amount"):
            total_collected += float(e["amount"])

    return {
        "total_cases": total_cases,
        "by_type": by_type,
        "total_collected": total_collected,
    }
