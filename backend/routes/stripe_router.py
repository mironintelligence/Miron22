from __future__ import annotations

import os
from typing import Any, Dict

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from db_async import db
from user_auth import get_current_user

try:
    from admin_auth import require_admin
except ImportError:
    from admin_auth import require_admin

router = APIRouter(prefix="/api/stripe", tags=["Stripe"])

_DEFAULT_MONTHLY = 6999.0
_DEFAULT_YEARLY = 85000.0

_WEBHOOK_EVENTS = [
    "checkout.session.completed",
    "customer.subscription.deleted",
    "customer.subscription.paused",
    "invoice.payment_failed",
    "invoice.payment_succeeded",
]


def _stripe() -> stripe:
    key = os.getenv("STRIPE_SECRET_KEY", "")
    if not key:
        raise HTTPException(status_code=503, detail="Ödeme sistemi henüz yapılandırılmamış.")
    stripe.api_key = key
    return stripe


def _is_live_key() -> bool:
    key = os.getenv("STRIPE_SECRET_KEY", "")
    return key.startswith("sk_live_") or key.startswith("rk_live_")


def _load_stripe_prices() -> Dict[str, Any]:
    """Admin panelindeki pricing config'ten aylık ve yıllık fiyatları okur."""
    try:
        from pricing_router import _load_config
        cfg = _load_config()
        monthly = float(cfg.get("base_price") or _DEFAULT_MONTHLY)
        yearly = float(cfg.get("yearly_price") or _DEFAULT_YEARLY)
    except Exception:
        monthly = _DEFAULT_MONTHLY
        yearly = _DEFAULT_YEARLY

    return {
        "monthly": {
            "unit_amount": int(round(monthly * 100)),
            "currency": "try",
            "name": "Miron AI - Aylık Plan",
            "interval": "month",
            "amount_try": monthly,
        },
        "yearly": {
            "unit_amount": int(round(yearly * 100)),
            "currency": "try",
            "name": "Miron AI - Yıllık Plan",
            "interval": "year",
            "amount_try": yearly,
        },
    }


class CheckoutRequest(BaseModel):
    plan: str  # "monthly" | "yearly"


@router.post("/create-checkout-session")
async def create_checkout_session(
    req: CheckoutRequest,
    user: dict = Depends(get_current_user),
):
    s = _stripe()
    plan = (req.plan or "").strip().lower()
    plans = _load_stripe_prices()

    if plan not in plans:
        raise HTTPException(status_code=400, detail="Geçersiz plan. 'monthly' veya 'yearly' olmalı.")

    cfg = plans[plan]
    frontend_url = (os.getenv("FRONTEND_URL") or "https://mironintelligence.vercel.app").rstrip("/")

    try:
        session = s.checkout.Session.create(
            mode="subscription",
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": cfg["currency"],
                        "unit_amount": cfg["unit_amount"],
                        "product_data": {"name": cfg["name"]},
                        "recurring": {"interval": cfg["interval"]},
                    },
                    "quantity": 1,
                }
            ],
            customer_email=user.get("email"),
            metadata={
                "user_id": str(user.get("id", "")),
                "plan": plan,
            },
            success_url=f"{frontend_url}/payment-gate?session_id={{CHECKOUT_SESSION_ID}}&plan={plan}",
            cancel_url=f"{frontend_url}/pricing",
        )
        return {"url": session.url, "session_id": session.id}
    except stripe.StripeError as e:
        msg = getattr(e, "user_message", None) or str(e)
        raise HTTPException(status_code=400, detail=msg)


@router.post("/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET", "")

    if not webhook_secret:
        raise HTTPException(
            status_code=503,
            detail="Webhook secret eksik. Admin: POST /api/stripe/admin/setup-webhook çalıştır.",
        )

    s = _stripe()

    try:
        event = s.Webhook.construct_event(payload, sig_header, webhook_secret)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    etype = event["type"]

    if etype == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = (session.get("metadata") or {}).get("user_id")
        plan = (session.get("metadata") or {}).get("plan", "monthly")
        subscription_id = session.get("subscription")

        if user_id:
            await db.execute(
                """
                UPDATE users
                SET subscription_plan = $1,
                    subscription_status = 'active',
                    stripe_subscription_id = $2,
                    demo_expires_at = NULL,
                    role = CASE WHEN role = 'demo' THEN 'user' ELSE role END,
                    token_version = token_version + 1
                WHERE id = $3::uuid
                """,
                plan,
                subscription_id,
                user_id,
            )

    elif etype in ("customer.subscription.deleted", "customer.subscription.paused"):
        subscription = event["data"]["object"]
        subscription_id = subscription.get("id")

        if subscription_id:
            new_status = "cancelled" if etype == "customer.subscription.deleted" else "paused"
            await db.execute(
                """
                UPDATE users
                SET subscription_status = $1,
                    stripe_subscription_id = NULL,
                    token_version = token_version + 1
                WHERE stripe_subscription_id = $2
                """,
                new_status,
                subscription_id,
            )

    elif etype == "invoice.payment_failed":
        subscription_id = (event["data"]["object"].get("subscription") or "")
        if subscription_id:
            await db.execute(
                "UPDATE users SET subscription_status = 'past_due' WHERE stripe_subscription_id = $1",
                subscription_id,
            )

    return {"received": True}


@router.get("/subscription")
async def get_subscription(user: dict = Depends(get_current_user)):
    user_id = user.get("id")

    row = await db.fetchrow(
        "SELECT subscription_plan, subscription_status, stripe_subscription_id FROM users WHERE id = $1",
        user_id,
    )

    if not row:
        return {"plan_name": "—", "status": "unknown", "amount_try": None}

    plan = row.get("subscription_plan") or "—"
    status = row.get("subscription_status") or "unknown"
    subscription_id = row.get("stripe_subscription_id")

    plans = _load_stripe_prices()
    amount_try = (plans.get(plan) or {}).get("amount_try")
    next_billing_at = None
    started_at = None
    latest_invoice_id = None

    if subscription_id:
        try:
            s = _stripe()
            sub = s.Subscription.retrieve(
                subscription_id,
                expand=["latest_invoice"],
            )
            next_billing_at = sub.get("current_period_end")
            started_at = sub.get("start_date")
            inv = sub.get("latest_invoice")
            if inv and isinstance(inv, dict):
                latest_invoice_id = inv.get("id")
        except Exception:
            pass

    return {
        "plan_name": plan,
        "status": status,
        "amount_try": amount_try,
        "next_billing_at": next_billing_at,
        "started_at": started_at,
        "subscription_id": subscription_id,
        "latest_invoice_id": latest_invoice_id,
    }


@router.post("/cancel")
async def cancel_subscription(user: dict = Depends(get_current_user)):
    user_id = user.get("id")

    row = await db.fetchrow(
        "SELECT stripe_subscription_id FROM users WHERE id = $1",
        user_id,
    )

    if not row or not row.get("stripe_subscription_id"):
        raise HTTPException(status_code=404, detail="Aktif Stripe aboneliği bulunamadı.")

    subscription_id = row["stripe_subscription_id"]

    try:
        s = _stripe()
        s.Subscription.modify(subscription_id, cancel_at_period_end=True)
    except stripe.StripeError as e:
        msg = getattr(e, "user_message", None) or str(e)
        raise HTTPException(status_code=400, detail=msg)

    await db.execute(
        "UPDATE users SET subscription_status = 'cancel_requested' WHERE id = $1",
        user_id,
    )

    return {
        "status": "cancel_requested",
        "message": "Aboneliğiniz mevcut dönem sonunda iptal edilecek.",
    }


@router.post("/admin/setup-webhook", dependencies=[Depends(require_admin)])
async def setup_webhook():
    """
    Mevcut STRIPE_SECRET_KEY ile webhook endpoint'ini otomatik oluşturur.
    Dönen 'secret' değerini Render'da STRIPE_WEBHOOK_SECRET olarak ekle.
    """
    s = _stripe()
    backend_url = (os.getenv("BACKEND_URL") or "https://miron22.onrender.com").rstrip("/")
    webhook_url = f"{backend_url}/api/stripe/webhook"

    try:
        existing = s.WebhookEndpoint.list(limit=20)
        for wh in existing.data:
            if wh.url == webhook_url and wh.status == "enabled":
                return {
                    "status": "already_exists",
                    "webhook_id": wh.id,
                    "url": wh.url,
                    "mode": "live" if _is_live_key() else "test",
                    "note": "Webhook zaten aktif. Secret değişmedi — mevcut STRIPE_WEBHOOK_SECRET geçerli.",
                }

        wh = s.WebhookEndpoint.create(
            url=webhook_url,
            enabled_events=_WEBHOOK_EVENTS,
            description="Miron AI otomatik kurulum",
        )

        return {
            "status": "created",
            "webhook_id": wh.id,
            "url": wh.url,
            "mode": "live" if _is_live_key() else "test",
            "secret": wh.secret,
            "action": f"Render Dashboard > Environment Variables > STRIPE_WEBHOOK_SECRET = {wh.secret}",
        }
    except stripe.StripeError as e:
        msg = getattr(e, "user_message", None) or str(e)
        raise HTTPException(status_code=400, detail=msg)


@router.get("/admin/prices", dependencies=[Depends(require_admin)])
def get_stripe_prices():
    """Admin paneli için güncel Stripe fiyatlarını gösterir."""
    plans = _load_stripe_prices()
    return {
        "monthly": {
            "amount_try": plans["monthly"]["amount_try"],
            "unit_amount_kurus": plans["monthly"]["unit_amount"],
        },
        "yearly": {
            "amount_try": plans["yearly"]["amount_try"],
            "unit_amount_kurus": plans["yearly"]["unit_amount"],
        },
        "mode": "live" if _is_live_key() else "test",
        "note": "Fiyatlar pricing config'ten okunur. Admin panelinden base_price ve yearly_price güncellenerek değiştirilebilir.",
    }
