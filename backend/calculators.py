from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

router = APIRouter(prefix="/calc", tags=["calculators"])

def _parse_date(value: str) -> datetime:
    try:
        return datetime.strptime(value, "%Y-%m-%d")
    except Exception:
        raise HTTPException(status_code=400, detail="Tarih formatı YYYY-MM-DD olmalı.")

def _days_between(start: datetime, end: datetime) -> int:
    days = (end - start).days
    if days < 0:
        raise HTTPException(status_code=400, detail="Bitiş tarihi başlangıçtan önce olamaz.")
    return days

def _add_months(dt: datetime, months: int) -> datetime:
    y = dt.year + (dt.month - 1 + months) // 12
    m = (dt.month - 1 + months) % 12 + 1
    d = min(dt.day, [31, 29 if y % 4 == 0 and (y % 100 != 0 or y % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1])
    return dt.replace(year=y, month=m, day=d)

class KDVRequest(BaseModel):
    amount: float = Field(gt=0)
    rate: float = Field(gt=0)

class KDVResponse(BaseModel):
    base: float
    kdv: float
    total: float

@router.post("/kdv", response_model=KDVResponse)
def calc_kdv(payload: KDVRequest):
    kdv = payload.amount * payload.rate / 100
    total = payload.amount + kdv
    return KDVResponse(base=payload.amount, kdv=kdv, total=total)

class SimpleInterestRequest(BaseModel):
    principal: float = Field(gt=0)
    start_date: str
    end_date: str
    annual_rate: float = Field(gt=0)

class InterestResponse(BaseModel):
    days: int
    interest: float
    total: float
    breakdown: Dict[str, Any]

@router.post("/faiz-basit", response_model=InterestResponse)
def calc_simple_interest(payload: SimpleInterestRequest):
    start = _parse_date(payload.start_date)
    end = _parse_date(payload.end_date)
    days = _days_between(start, end)
    rate = payload.annual_rate / 100
    interest = payload.principal * rate * (days / 365)
    total = payload.principal + interest
    return InterestResponse(
        days=days,
        interest=round(interest, 2),
        total=round(total, 2),
        breakdown={"principal": payload.principal, "rate": payload.annual_rate, "days": days},
    )

class CompoundInterestRequest(BaseModel):
    principal: float = Field(gt=0)
    start_date: str
    end_date: str
    annual_rate: float = Field(gt=0)
    compounds_per_year: int = Field(gt=0)

@router.post("/faiz-bilesik", response_model=InterestResponse)
def calc_compound_interest(payload: CompoundInterestRequest):
    start = _parse_date(payload.start_date)
    end = _parse_date(payload.end_date)
    days = _days_between(start, end)
    years = days / 365
    n = payload.compounds_per_year
    r = payload.annual_rate / 100
    total = payload.principal * ((1 + r / n) ** (n * years))
    interest = total - payload.principal
    return InterestResponse(
        days=days,
        interest=round(interest, 2),
        total=round(total, 2),
        breakdown={"principal": payload.principal, "rate": payload.annual_rate, "compounds_per_year": n},
    )

class RateBasedInterestRequest(BaseModel):
    principal: float = Field(gt=0)
    start_date: str
    end_date: str
    annual_rate: float = Field(gt=0)

@router.post("/faiz-ticari", response_model=InterestResponse)
def calc_commercial_interest(payload: RateBasedInterestRequest):
    return calc_simple_interest(SimpleInterestRequest(**payload.dict()))

@router.post("/faiz-temerrut", response_model=InterestResponse)
def calc_default_interest(payload: RateBasedInterestRequest):
    return calc_simple_interest(SimpleInterestRequest(**payload.dict()))

class OvertimeRequest(BaseModel):
    monthly_salary: float = Field(gt=0)
    overtime_hours: float = Field(ge=0)
    overtime_multiplier: float = Field(gt=0)

class OvertimeResponse(BaseModel):
    hourly_rate: float
    overtime_pay: float
    breakdown: Dict[str, Any]

@router.post("/mesai", response_model=OvertimeResponse)
def calc_overtime(payload: OvertimeRequest):
    hourly_rate = payload.monthly_salary / 225
    overtime_pay = hourly_rate * payload.overtime_hours * payload.overtime_multiplier
    return OvertimeResponse(
        hourly_rate=round(hourly_rate, 2),
        overtime_pay=round(overtime_pay, 2),
        breakdown={"monthly_salary": payload.monthly_salary, "overtime_hours": payload.overtime_hours, "multiplier": payload.overtime_multiplier},
    )

class SeveranceRequest(BaseModel):
    monthly_salary: float = Field(gt=0)
    years: int = Field(ge=0)
    months: int = Field(ge=0, le=11)
    days: int = Field(ge=0, le=30)
    cap: Optional[float] = None

class SeveranceResponse(BaseModel):
    total_years: float
    gross_severance: float
    capped: bool
    breakdown: Dict[str, Any]

@router.post("/kidem", response_model=SeveranceResponse)
def calc_severance(payload: SeveranceRequest):
    total_years = payload.years + payload.months / 12 + payload.days / 365
    base = payload.monthly_salary * total_years
    capped = False
    amount = base
    if payload.cap and payload.monthly_salary > payload.cap:
        amount = payload.cap * total_years
        capped = True
    return SeveranceResponse(
        total_years=round(total_years, 4),
        gross_severance=round(amount, 2),
        capped=capped,
        breakdown={"monthly_salary": payload.monthly_salary, "years": payload.years, "months": payload.months, "days": payload.days, "cap": payload.cap},
    )

class NoticeRequest(BaseModel):
    monthly_salary: float = Field(gt=0)
    years_worked: float = Field(ge=0)

class NoticeResponse(BaseModel):
    notice_weeks: int
    notice_pay: float
    breakdown: Dict[str, Any]

@router.post("/ihbar", response_model=NoticeResponse)
def calc_notice(payload: NoticeRequest):
    y = payload.years_worked
    if y < 0.5:
        weeks = 2
    elif y < 1.5:
        weeks = 4
    elif y < 3:
        weeks = 6
    else:
        weeks = 8
    weekly_salary = payload.monthly_salary / 4.333
    notice_pay = weekly_salary * weeks
    return NoticeResponse(
        notice_weeks=weeks,
        notice_pay=round(notice_pay, 2),
        breakdown={"monthly_salary": payload.monthly_salary, "years_worked": payload.years_worked},
    )

class LaborClaimsRequest(BaseModel):
    monthly_salary: float = Field(gt=0)
    overtime_hours: float = Field(ge=0)
    overtime_multiplier: float = Field(gt=0)
    years: int = Field(ge=0)
    months: int = Field(ge=0, le=11)
    days: int = Field(ge=0, le=30)
    years_worked: float = Field(ge=0)

class LaborClaimsResponse(BaseModel):
    overtime: OvertimeResponse
    severance: SeveranceResponse
    notice: NoticeResponse
    total: float

@router.post("/iscilik", response_model=LaborClaimsResponse)
def calc_labor_claims(payload: LaborClaimsRequest):
    overtime = calc_overtime(OvertimeRequest(
        monthly_salary=payload.monthly_salary,
        overtime_hours=payload.overtime_hours,
        overtime_multiplier=payload.overtime_multiplier,
    ))
    severance = calc_severance(SeveranceRequest(
        monthly_salary=payload.monthly_salary,
        years=payload.years,
        months=payload.months,
        days=payload.days,
        cap=None,
    ))
    notice = calc_notice(NoticeRequest(
        monthly_salary=payload.monthly_salary,
        years_worked=payload.years_worked,
    ))
    total = overtime.overtime_pay + severance.gross_severance + notice.notice_pay
    return LaborClaimsResponse(
        overtime=overtime,
        severance=severance,
        notice=notice,
        total=round(total, 2),
    )

class LimitationRequest(BaseModel):
    start_date: str
    period_years: int = Field(ge=0)
    period_months: int = Field(ge=0, le=11)

class LimitationResponse(BaseModel):
    start_date: str
    expiry_date: str
    days_left: int
    is_expired: bool

@router.post("/zamanasimi", response_model=LimitationResponse)
def calc_limitation(payload: LimitationRequest):
    start = _parse_date(payload.start_date)
    expiry = _add_months(start, payload.period_months)
    expiry = expiry.replace(year=expiry.year + payload.period_years)
    today = datetime.utcnow()
    days_left = (expiry - today).days
    return LimitationResponse(
        start_date=start.strftime("%Y-%m-%d"),
        expiry_date=expiry.strftime("%Y-%m-%d"),
        days_left=days_left,
        is_expired=days_left < 0,
    )

class FeeRequest(BaseModel):
    amount_in_dispute: float = Field(gt=0)
    rate: float = Field(gt=0)

class FeeResponse(BaseModel):
    fee: float
    breakdown: Dict[str, Any]

@router.post("/harc", response_model=FeeResponse)
def calc_court_fee(payload: FeeRequest):
    fee = payload.amount_in_dispute * payload.rate / 100
    return FeeResponse(fee=round(fee, 2), breakdown={"amount": payload.amount_in_dispute, "rate": payload.rate})

@router.post("/vekalet", response_model=FeeResponse)
def calc_attorney_fee(payload: FeeRequest):
    fee = payload.amount_in_dispute * payload.rate / 100
    return FeeResponse(fee=round(fee, 2), breakdown={"amount": payload.amount_in_dispute, "rate": payload.rate})

class EnforcementCostRequest(BaseModel):
    principal: float = Field(gt=0)
    fee_rate: float = Field(gt=0)
    tax_rate: float = Field(ge=0)

class EnforcementCostResponse(BaseModel):
    fee: float
    tax: float
    total: float
    breakdown: Dict[str, Any]

@router.post("/icra-masraf", response_model=EnforcementCostResponse)
def calc_enforcement_cost(payload: EnforcementCostRequest):
    fee = payload.principal * payload.fee_rate / 100
    tax = fee * payload.tax_rate / 100
    total = payload.principal + fee + tax
    return EnforcementCostResponse(
        fee=round(fee, 2),
        tax=round(tax, 2),
        total=round(total, 2),
        breakdown={"principal": payload.principal, "fee_rate": payload.fee_rate, "tax_rate": payload.tax_rate},
    )
