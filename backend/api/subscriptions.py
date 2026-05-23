from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import date
from graph import queries as q

router = APIRouter(prefix="/api/subscriptions", tags=["subscriptions"])


def _user_exists(user_id: str) -> bool:
    return bool(q.get_user(user_id))


class SubscriptionRequest(BaseModel):
    name: str
    amount: float
    currency: Optional[str] = "UAH"
    billing_cycle: Optional[str] = "monthly"
    category: Optional[str] = "other"
    next_billing: Optional[str] = ""


@router.post("/{user_id}")
def add_subscription(user_id: str, req: SubscriptionRequest):
    if not _user_exists(user_id):
        raise HTTPException(404, "User not found")
    next_billing = req.next_billing or date.today().isoformat()
    sub_id = q.add_subscription(
        user_id, req.name, req.amount, req.currency,
        req.billing_cycle, req.category, next_billing
    )
    return {"id": sub_id, "status": "created"}


@router.get("/{user_id}")
def get_subscriptions(user_id: str):
    if not _user_exists(user_id):
        raise HTTPException(404, "User not found")
    subs = q.get_subscriptions(user_id)
    # Compute monthly total
    monthly_total = 0.0
    for s in subs:
        if not s.get("is_active", True):
            continue
        cycle = s.get("billing_cycle", "monthly")
        amount = s.get("amount", 0)
        if cycle == "yearly":
            monthly_total += amount / 12
        elif cycle == "weekly":
            monthly_total += amount * 4.33
        else:
            monthly_total += amount
    return {"subscriptions": subs, "monthly_total": round(monthly_total, 2)}


@router.patch("/{sub_id}/deactivate")
def deactivate_subscription(sub_id: str):
    q.deactivate_subscription(sub_id)
    return {"status": "deactivated"}


@router.get("/summary/{user_id}")
def get_summary(user_id: str):
    if not _user_exists(user_id):
        raise HTTPException(404, "User not found")
    subs = q.get_subscriptions(user_id)
    active = [s for s in subs if s.get("is_active", True)]
    monthly_total = 0.0
    by_category: dict[str, float] = {}
    for s in active:
        cycle = s.get("billing_cycle", "monthly")
        amount = s.get("amount", 0)
        monthly = amount / 12 if cycle == "yearly" else amount * 4.33 if cycle == "weekly" else amount
        monthly_total += monthly
        cat = s.get("category", "other")
        by_category[cat] = round(by_category.get(cat, 0) + monthly, 2)
    return {
        "active_count": len(active),
        "monthly_total": round(monthly_total, 2),
        "by_category": by_category,
        "upcoming_billing": sorted(
            [s for s in active if s.get("next_billing")],
            key=lambda x: x["next_billing"]
        )[:5],
    }
