# backend/calculators.py
from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/calc", tags=["calculators"])

class KDVRequest(BaseModel):
    amount: float
    rate: float  # %18 için 18 gibi

class KDVResponse(BaseModel):
    base: float
    kdv: float
    total: float

@router.post("/kdv", response_model=KDVResponse)
def calc_kdv(payload: KDVRequest):
    kdv = payload.amount * payload.rate / 100
    total = payload.amount + kdv
    return KDVResponse(base=payload.amount, kdv=kdv, total=total)

class FaizRequest(BaseModel):
    principal: float
    start_date: str  # "2024-01-01"
    end_date: str    # "2024-12-31"
    annual_rate: float  # % için 24 gibi

class FaizResponse(BaseModel):
    days: int
    interest: float
    total: float

@router.post("/faiz", response_model=FaizResponse)
def calc_faiz(payload: FaizRequest):
    fmt = "%Y-%m-%d"
    start = datetime.strptime(payload.start_date, fmt)
    end = datetime.strptime(payload.end_date, fmt)
    days = (end - start).days
    if days < 0:
        days = 0

    interest = payload.principal * (payload.annual_rate / 100) * (days / 365)
    total = payload.principal + interest
    return FaizResponse(days=days, interest=interest, total=total)

class VekaletRequest(BaseModel):
    amount_in_dispute: float

class VekaletResponse(BaseModel):
    fee: float

@router.post("/vekalet", response_model=VekaletResponse)
def calc_vekalet(payload: VekaletRequest):
    # V1: çok kaba, sonra baro tarifesine göre tablolu yaparız
    amt = payload.amount_in_dispute
    if amt <= 10000:
        fee = 3000
    elif amt <= 100000:
        fee = 5000
    else:
        fee = 8000
    return VekaletResponse(fee=fee)

class HarcRequest(BaseModel):
    amount_in_dispute: float
    type: str  # tam harç / nispi vs. ileride genişletirsin

class HarcResponse(BaseModel):
    harc: float

@router.post("/harc", response_model=HarcResponse)
def calc_harc(payload: HarcRequest):
    # V1: örnek nispi harç %6,83 gibi düşün
    rate = 6.83
    harc = payload.amount_in_dispute * rate / 100
    return HarcResponse(harc=harc)
