# backend/routes/billing_routes.py
from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel
import os
from typing import Dict, Any
from db_async import db
from user_auth import get_current_user

router = APIRouter(prefix="/api/billing", tags=["Billing"])

BILLING_MODE = os.getenv("BILLING_MODE", "live")  # demo | live

class UpgradeRequest(BaseModel):
    plan_id: str  # 'starter' | 'pro'
    payment_method_id: str # Placeholder for Stripe/Iyzico token

@router.post("/upgrade")
async def upgrade_account(
    req: UpgradeRequest, 
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Kullanıcı hesabını Demo/Ücretsiz plandan ücretli plana yükseltir.
    Gerçek sistemde Stripe/Iyzico gibi ödeme doğrulaması yapılır.
    Burada başarılı ödeme simüle edilir.
    """
    user_id = user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # 1. Simulate Payment Processing
    if BILLING_MODE == "demo":
        print(f"💰 [DEMO] Processing payment for User {user_id}, Plan: {req.plan_id}")
    else:
        # TODO: Integrate real payment gateway
        pass

    # 2. Update User Subscription in DB
    try:
        plan = (req.plan_id or "").strip().lower()
        if plan not in ["starter", "pro"]:
            raise HTTPException(status_code=400, detail="Geçersiz plan.")

        await db.execute(
            """
            UPDATE users
            SET subscription_plan = $1,
                subscription_status = 'active',
                demo_expires_at = NULL,
                role = CASE WHEN role = 'demo' THEN 'user' ELSE role END,
                token_version = token_version + 1
            WHERE id = $2
            """,
            plan,
            user_id,
        )
        
        return {
            "status": "success",
            "message": "Aboneliğiniz başarıyla güncellendi.",
            "plan": plan,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Yükseltme başarısız.")

@router.get("/plans")
def get_plans():
    return {
        "plans": [
            {
                "id": "starter",
                "name": "Başlangıç Paketi",
                "price": 0,
                "currency": "TRY",
                "features": ["Temel Dava Analizi", "Sınırlı Mevzuat Arama"],
            },
            {
                "id": "pro",
                "name": "Profesyonel Paket",
                "price": 1500,
                "currency": "TRY",
                "features": ["Detaylı Risk Analizi", "Sınırsız Dava Simülasyonu", "Öncelikli Destek"],
            },
        ]
    }
