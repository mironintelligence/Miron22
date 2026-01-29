from fastapi import APIRouter
from pydantic import BaseModel
import os

router = APIRouter(prefix="/billing", tags=["billing"])

BILLING_MODE = os.getenv("BILLING_MODE", "demo")  # demo | live

class CheckoutReq(BaseModel):
    plan: str
    amount: float

@router.post("/checkout")
def checkout(req: CheckoutReq):
    # ŞİMDİLİK: webhook/ödeme yok. Sadece placeholder.
    if BILLING_MODE != "demo":
        # ileride burada shopier/iyzico/stripe checkout session oluşturacağız
        pass

    return {
        "mode": BILLING_MODE,
        "checkout_url": None,   # live'a geçince gerçek ödeme linki dönecek
        "message": "Demo mod: ödeme altyapısı daha bağlanmadı."
    }

@router.post("/cancel")
def cancel_subscription():
    # ŞİMDİLİK: gerçek abonelik iptali yok, sadece placeholder.
    return {
        "mode": BILLING_MODE,
        "ok": True,
        "message": "Demo mod: iptal işlemi UI üzerinden simüle ediliyor."
    }

@router.post("/webhook")
def webhook_placeholder():
    # BURASI SONRA: provider webhook'u buraya gelecek (Shopier/iyzico/Stripe)
    return {"ok": True, "message": "Webhook placeholder (şimdilik boş)."}
