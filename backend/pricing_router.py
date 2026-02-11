from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, Depends, status, Header
from pydantic import BaseModel, Field

# Admin auth helper
try:
    from backend.admin_auth import require_admin
except ImportError:
    from admin_auth import require_admin

router = APIRouter()

# --- CONSTANTS & PATHS ---
DATA_DIR = Path(os.getenv("DATA_DIR") or "data")
DATA_DIR.mkdir(parents=True, exist_ok=True)
PRICING_CONFIG_FILE = DATA_DIR / "pricing_config.json"

DEFAULT_CONFIG = {
    "base_price": 8000.0,
    "discount_rate": 20.0,      # %20
    "bulk_threshold": 3,        # 3 or more users
}

# --- MODELS ---
class PricingConfig(BaseModel):
    base_price: float = Field(..., gt=0, description="Base price per user (TL)")
    discount_rate: float = Field(..., ge=0, le=100, description="Discount percentage (0-100)")
    bulk_threshold: int = Field(..., gt=1, description="Minimum user count for discount")

class CalculateRequest(BaseModel):
    count: int = Field(..., gt=0, description="Number of users")

class CalculateResponse(BaseModel):
    count: int
    base_price_unit: float
    raw_total: float
    discount_amount: float
    final_total: float
    applied_discount_rate: float
    is_discounted: bool

# --- HELPERS ---
def _load_config() -> Dict[str, Any]:
    if not PRICING_CONFIG_FILE.exists():
        return dict(DEFAULT_CONFIG)
    try:
        with PRICING_CONFIG_FILE.open("r", encoding="utf-8") as f:
            data = json.load(f)
            # Merge with defaults to ensure all keys exist
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
            except:
                pass
        raise HTTPException(status_code=500, detail=f"Failed to save config: {str(e)}")

# --- ENDPOINTS ---

@router.get("/config", response_model=PricingConfig)
def get_pricing_config():
    """Get current pricing configuration."""
    return _load_config()

@router.post("/config", dependencies=[Depends(require_admin)])
def update_pricing_config(config: PricingConfig):
    """Update pricing configuration (Admin only)."""
    _save_config(config.dict())
    return {"status": "ok", "config": config}

@router.post("/calculate", response_model=CalculateResponse)
def calculate_price(req: CalculateRequest):
    """Calculate total price based on user count and current rules."""
    cfg = _load_config()
    
    base_price = float(cfg.get("base_price", 8000.0))
    discount_rate = float(cfg.get("discount_rate", 20.0))
    threshold = int(cfg.get("bulk_threshold", 3))
    
    count = req.count
    raw_total = count * base_price
    
    is_discounted = False
    applied_rate = 0.0
    discount_amount = 0.0
    
    if count >= threshold:
        is_discounted = True
        applied_rate = discount_rate
        discount_amount = raw_total * (discount_rate / 100.0)
        
    final_total = raw_total - discount_amount
    
    return {
        "count": count,
        "base_price_unit": base_price,
        "raw_total": raw_total,
        "discount_amount": discount_amount,
        "final_total": final_total,
        "applied_discount_rate": applied_rate,
        "is_discounted": is_discounted
    }
