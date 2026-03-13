# backend/routes/billing_routes.py
from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel
import os
from typing import Dict, Any
from db_async import db
from user_auth import get_current_user

router = APIRouter(prefix="/api/billing", tags=["Billing"])

BILLING_MODE = os.getenv("BILLING_MODE", "demo")  # demo | live

class UpgradeRequest(BaseModel):
    plan_id: str # 'pro', 'enterprise'
    payment_method_id: str # Placeholder for Stripe/Iyzico token

@router.post("/upgrade")
async def upgrade_account(
    req: UpgradeRequest, 
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Upgrade user account from Demo/Free to Paid.
    In a real app, this would verify payment with Stripe/Iyzico.
    Here, it simulates a successful payment.
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

    # 2. Update User Role/Status in DB
    try:
        # Set role to 'pro_user' or just keep 'user' but update subscription status
        # Let's assume 'pro' plan gives extended access
        
        # We might need a 'subscription_plan' column in users table, 
        # or we just rely on 'role' if simple. Let's stick to role for now or add metadata.
        
        # Updating role to 'pro' if plan is pro
        new_role = "pro" if req.plan_id in ["pro", "enterprise"] else "user"
        
        await db.execute(
            "UPDATE users SET role = $1, demo_expires_at = NULL WHERE id = $2",
            new_role, user_id
        )
        
        return {
            "status": "success",
            "message": "Hesabınız başarıyla yükseltildi.",
            "plan": req.plan_id,
            "new_role": new_role
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upgrade failed: {str(e)}")

@router.get("/plans")
def get_plans():
    return [
        {
            "id": "starter",
            "name": "Başlangıç Paketi",
            "price": 0,
            "currency": "TRY",
            "features": ["Temel Dava Analizi", "Sınırlı Mevzuat Arama"]
        },
        {
            "id": "pro",
            "name": "Profesyonel Paket",
            "price": 1500,
            "currency": "TRY",
            "features": ["Detaylı Risk Analizi", "Sınırsız Dava Simülasyonu", "Öncelikli Destek"]
        }
    ]
