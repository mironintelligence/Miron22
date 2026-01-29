# backend/case_router.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
import json
from datetime import datetime
from pathlib import Path

# Veri dosyaları için klasör (backend/data)
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
CASES_FILE = DATA_DIR / "cases.json"
EVENTS_FILE = DATA_DIR / "case_events.json"

router = APIRouter(prefix="/cases", tags=["cases"])

# ----------------- MODELLER -----------------


class CaseCreate(BaseModel):
    title: str  # Dosya kısa adı
    # Pydantic v2: regex yerine pattern
    type: str = Field(..., pattern="^(icra|dava|danismanlik)$")
    court: Optional[str] = None
    city: Optional[str] = None
    file_number: Optional[str] = None
    client_name: Optional[str] = None  # Müvekkil
    opponent_name: Optional[str] = None  # Karşı taraf
    principal_amount: Optional[float] = 0.0
    status: str = "acik"  # acik | kapandi | beklemede


class CaseUpdate(BaseModel):
    title: Optional[str] = None
    type: Optional[str] = Field(
        None, pattern="^(icra|dava|danismanlik)$"
    )
    court: Optional[str] = None
    city: Optional[str] = None
    file_number: Optional[str] = None
    client_name: Optional[str] = None
    opponent_name: Optional[str] = None
    principal_amount: Optional[float] = None
    status: Optional[str] = None


class Case(BaseModel):
    id: str
    title: str
    type: str
    court: Optional[str]
    city: Optional[str]
    file_number: Optional[str]
    client_name: Optional[str]
    opponent_name: Optional[str]
    principal_amount: float
    status: str
    created_at: str
    updated_at: str


class CaseEventCreate(BaseModel):
    # duruşma YOK: tebligat, tahsilat, haciz, satis, dilekce, not, sure
    event_type: str = Field(
        ...,
        pattern="^(tebligat|tahsilat|haciz|satis|dilekce|not|sure)$",
    )
    date: Optional[str] = None  # ISO, doldurmazsa now
    description: str
    amount: Optional[float] = None  # tahsilat/haciz/satis için


class CaseEvent(BaseModel):
    id: str
    case_id: str
    event_type: str
    date: str
    description: str
    amount: Optional[float]


class FinanceSummary(BaseModel):
    principal_amount: float
    total_collected: float
    remaining: float


# ----------------- HELPER FONKSIYONLAR -----------------


def _ensure_files():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not CASES_FILE.exists():
        CASES_FILE.write_text("[]", encoding="utf-8")
    if not EVENTS_FILE.exists():
        EVENTS_FILE.write_text("[]", encoding="utf-8")


def _read_json(path: Path):
    _ensure_files()
    try:
        return json.loads(path.read_text(encoding="utf-8") or "[]")
    except json.JSONDecodeError:
        return []


def _write_json(path: Path, data):
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def _now_iso():
    return datetime.utcnow().isoformat()


# ----------------- CASE ENDPOINTLERI -----------------


@router.get("/", response_model=List[Case])
def list_cases():
    cases = _read_json(CASES_FILE)
    return cases


@router.post("/", response_model=Case)
def create_case(payload: CaseCreate):
    cases = _read_json(CASES_FILE)
    case_id = str(uuid.uuid4())
    now = _now_iso()
    new_case = {
        "id": case_id,
        "title": payload.title,
        "type": payload.type,
        "court": payload.court,
        "city": payload.city,
        "file_number": payload.file_number,
        "client_name": payload.client_name,
        "opponent_name": payload.opponent_name,
        "principal_amount": float(payload.principal_amount or 0),
        "status": payload.status,
        "created_at": now,
        "updated_at": now,
    }
    cases.append(new_case)
    _write_json(CASES_FILE, cases)
    return new_case


@router.get("/{case_id}", response_model=Case)
def get_case(case_id: str):
    cases = _read_json(CASES_FILE)
    for c in cases:
        if c["id"] == case_id:
            return c
    raise HTTPException(status_code=404, detail="Case not found")


@router.put("/{case_id}", response_model=Case)
def update_case(case_id: str, payload: CaseUpdate):
    cases = _read_json(CASES_FILE)
    for c in cases:
        if c["id"] == case_id:
            for field, value in payload.dict(exclude_unset=True).items():
                c[field] = value
            c["updated_at"] = _now_iso()
            _write_json(CASES_FILE, cases)
            return c
    raise HTTPException(status_code=404, detail="Case not found")


@router.delete("/{case_id}")
def delete_case(case_id: str):
    cases = _read_json(CASES_FILE)
    new_cases = [c for c in cases if c["id"] != case_id]
    if len(new_cases) == len(cases):
        raise HTTPException(status_code=404, detail="Case not found")
    _write_json(CASES_FILE, new_cases)

    # İlgili eventleri de temizle
    events = _read_json(EVENTS_FILE)
    events = [e for e in events if e["case_id"] != case_id]
    _write_json(EVENTS_FILE, events)
    return {"ok": True}


# ----------------- EVENT ENDPOINTLERI -----------------


@router.get("/{case_id}/events", response_model=List[CaseEvent])
def list_events(case_id: str):
    # Case var mı kontrol et
    _ = get_case(case_id)
    events = _read_json(EVENTS_FILE)
    case_events = [e for e in events if e["case_id"] == case_id]
    # Tarihe göre sırala
    case_events.sort(key=lambda e: e["date"])
    return case_events


@router.post("/{case_id}/events", response_model=CaseEvent)
def create_event(case_id: str, payload: CaseEventCreate):
    # Case var mı kontrol et
    _ = get_case(case_id)

    events = _read_json(EVENTS_FILE)
    event_id = str(uuid.uuid4())
    date = payload.date or _now_iso()
    new_event = {
        "id": event_id,
        "case_id": case_id,
        "event_type": payload.event_type,
        "date": date,
        "description": payload.description,
        "amount": float(payload.amount) if payload.amount is not None else None,
    }
    events.append(new_event)
    _write_json(EVENTS_FILE, events)
    return new_event


# ----------------- FINANS OZETI -----------------


@router.get("/{case_id}/finance-summary", response_model=FinanceSummary)
def finance_summary(case_id: str):
    case = get_case(case_id)
    events = _read_json(EVENTS_FILE)
    case_events = [e for e in events if e["case_id"] == case_id]

    total_collected = 0.0
    for e in case_events:
        if e["event_type"] in ("tahsilat", "haciz", "satis") and e.get("amount"):
            total_collected += float(e["amount"])

    principal = float(case.get("principal_amount") or 0)
    remaining = max(principal - total_collected, 0.0)
    return FinanceSummary(
        principal_amount=principal,
        total_collected=total_collected,
        remaining=remaining,
    )
