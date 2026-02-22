from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional, List

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, field_validator

try:
    from backend.admin_auth import require_admin
except ImportError:
    from admin_auth import require_admin

from backend.services.pricing_service import (
    _load_discounts, _save_discounts, find_valid_discount, increment_usage, 
    create_discount, toggle_discount, _normalize_code
)

router = APIRouter()

DATA_DIR = Path(os.getenv("DATA_DIR") or "data")
DATA_DIR.mkdir(parents=True, exist_ok=True)
PRICING_CONFIG_FILE = DATA_DIR / "pricing_config.json"

DEFAULT_CONFIG = {
    "base_price": 8000.0,
    "discount_rate": 20.0,
    "bulk_threshold": 3,
}


class PricingConfig(BaseModel):
    base_price: float = Field(..., gt=0)
    discount_rate: float = Field(..., ge=0, le=100)
    bulk_threshold: int = Field(..., gt=1)


class CalculateRequest(BaseModel):
    count: int = Field(..., gt=0)
    discount_code: Optional[str] = Field(default=None, max_length=64)


class CalculateResponse(BaseModel):
    count: int
    base_price_unit: float
    raw_total: float
    discount_amount: float
    final_total: float
    applied_discount_rate: float
    is_discounted: bool
    discount_code: Optional[str] = None
    discount_code_amount: float = 0.0
    discount_code_type: Optional[str] = None


class DiscountCodeCreate(BaseModel):
    code: str = Field(..., min_length=3, max_length=64)
    type: str = Field(..., description="percent or fixed")
    value: float = Field(..., gt=0)
    max_usage: Optional[int] = Field(default=None, gt=0)
    expires_at: Optional[str] = None
    description: Optional[str] = None

    @field_validator("type")
    def _validate_type(cls, v: str) -> str:
        vv = (v or "").strip().lower()
        if vv not in {"percent", "fixed"}:
            raise ValueError("type must be percent or fixed")
        return vv

    @field_validator("expires_at")
    def _validate_expires(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return v
        try:
            datetime.fromisoformat(v)
        except Exception:
            raise ValueError("expires_at must be ISO8601 string")
        return v


def _load_config() -> Dict[str, Any]:
    if not PRICING_CONFIG_FILE.exists():
        return dict(DEFAULT_CONFIG)
    try:
        with PRICING_CONFIG_FILE.open("r", encoding="utf-8") as f:
            data = json.load(f)
            config = dict(DEFAULT_CONFIG)
            config.update(data)
            return config
    except Exception:
        return dict(DEFAULT_CONFIG)


def _save_config(config: Dict[str, Any]) -> None:
    PRICING_CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp = PRICING_CONFIG_FILE.with_suffix(".tmp")
    try:
        with tmp.open("w", encoding="utf-8") as f:
            json.dump(config, f, indent=2)
        os.replace(tmp, PRICING_CONFIG_FILE)
    except Exception as e:
        if tmp.exists():
            try:
                tmp.unlink()
            except Exception:
                pass
        raise HTTPException(status_code=500, detail=f"Failed to save config: {str(e)}")


@router.get("/config", response_model=PricingConfig)
def get_pricing_config():
    return _load_config()


@router.post("/config", dependencies=[Depends(require_admin)])
def update_pricing_config(config: PricingConfig):
    _save_config(config.model_dump())
    return {"status": "ok", "config": config}


@router.post("/calculate", response_model=CalculateResponse)
def calculate_price(req: CalculateRequest):
    cfg = _load_config()
    base_price = float(cfg.get("base_price", 8000.0))
    discount_rate = float(cfg.get("discount_rate", 20.0))
    threshold = int(cfg.get("bulk_threshold", 3))
    count = req.count
    raw_total = count * base_price
    is_discounted = False
    applied_rate = 0.0
    bulk_discount = 0.0
    
    if count >= threshold:
        is_discounted = True
        applied_rate = discount_rate
        bulk_discount = raw_total * (discount_rate / 100.0)
        
    code_discount = 0.0
    code_type = None
    applied_code = None
    
    if req.discount_code:
        dc = find_valid_discount(req.discount_code)
        if not dc:
            # We raise error here so frontend knows code is invalid
            raise HTTPException(status_code=400, detail="invalid_discount_code")
            
        base_for_code = raw_total - bulk_discount
        t = str(dc.get("type", "")).lower()
        val = float(dc.get("value", 0) or 0)
        
        if t == "percent":
            code_discount = base_for_code * (val / 100.0)
            code_type = "percent"
        else:
            code_discount = min(val, base_for_code)
            code_type = "fixed"
            
        applied_code = _normalize_code(dc.get("code", ""))
        # DO NOT increment usage here. Only on purchase/register.

    total_discount = bulk_discount + code_discount
    final_total = raw_total - total_discount
    if final_total < 0:
        final_total = 0.0
        
    return {
        "count": count,
        "base_price_unit": base_price,
        "raw_total": raw_total,
        "discount_amount": total_discount,
        "final_total": final_total,
        "applied_discount_rate": applied_rate,
        "is_discounted": is_discounted or bool(applied_code),
        "discount_code": applied_code,
        "discount_code_amount": code_discount,
        "discount_code_type": code_type,
    }


@router.get("/discount-codes", dependencies=[Depends(require_admin)])
def list_discount_codes():
    return _load_discounts()


@router.post("/discount-codes", dependencies=[Depends(require_admin)])
def create_discount_code(body: DiscountCodeCreate):
    return create_discount(
        body.code, body.type, body.value, body.max_usage, body.expires_at, body.description
    )


@router.post("/discount-codes/{code}/toggle", dependencies=[Depends(require_admin)])
def toggle_discount_code(code: str, active: bool = True):
    return toggle_discount(code, active)
