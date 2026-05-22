from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from graph.queries import get_recent_transactions, add_transaction, user_exists, set_budget, get_budgets, delete_budget
from ml.classifier import classify, classify_rule, ALL_CATEGORIES

router = APIRouter()


class AddTransactionRequest(BaseModel):
    amount: float
    currency: str = "UAH"
    category: Optional[str] = None   # None / "авто" → auto-classify from description
    description: str = ""


class ClassifyRequest(BaseModel):
    description: str
    amount: float = 0.0


@router.get("/finance/summary/{user_id}")
async def finance_summary(user_id: str):
    if not user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    txs = get_recent_transactions(user_id, limit=30)
    by_cat: dict[str, float] = {}
    for tx in txs:
        by_cat[tx["category"]] = by_cat.get(tx["category"], 0) + tx["amount"]
    total = sum(by_cat.values())
    return {
        "recent_transactions": txs[:10],
        "total_spent": round(total, 2),
        "by_category": by_cat,
        "currency": txs[0]["currency"] if txs else "UAH",
    }


@router.post("/finance/transaction/{user_id}")
async def log_transaction(user_id: str, body: AddTransactionRequest):
    if not user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")

    auto_classified = False
    category = body.category

    if not category or category.strip() in ("", "авто", "auto"):
        category, confidence, source = await classify(body.description, body.amount)
        auto_classified = True
    else:
        _, confidence, source = classify_rule(category), 1.0, "manual"
        confidence = 1.0

    tid = add_transaction(user_id, body.amount, body.currency, category, body.description)
    return {
        "transaction_id": tid,
        "amount": body.amount,
        "currency": body.currency,
        "category": category,
        "auto_classified": auto_classified,
        "confidence": confidence,
    }


class BudgetRequest(BaseModel):
    category: str
    limit_amount: float
    period: str = "monthly"


@router.get("/finance/budgets/{user_id}")
async def get_user_budgets(user_id: str):
    if not user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    budgets = get_budgets(user_id)
    # Attach current spending per category
    txs = get_recent_transactions(user_id, limit=200)
    from datetime import date, timedelta
    month_start = date.today().replace(day=1).isoformat()
    spending: dict[str, float] = {}
    for tx in txs:
        if tx["date"][:10] >= month_start:
            spending[tx["category"]] = spending.get(tx["category"], 0) + tx["amount"]
    return [
        {**b, "spent": round(spending.get(b["category"], 0), 2),
         "pct": round(spending.get(b["category"], 0) / b["limit_amount"] * 100, 1) if b["limit_amount"] else 0}
        for b in budgets
    ]


@router.post("/finance/budget/{user_id}")
async def upsert_budget(user_id: str, body: BudgetRequest):
    if not user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    bid = set_budget(user_id, body.category, body.limit_amount, body.period)
    return {"budget_id": bid, "category": body.category, "limit_amount": body.limit_amount}


@router.delete("/finance/budget/{user_id}/{category}")
async def remove_budget(user_id: str, category: str):
    if not user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    delete_budget(user_id, category)
    return {"ok": True}


@router.post("/finance/classify")
async def classify_transaction(body: ClassifyRequest):
    """Preview endpoint — returns predicted category without saving."""
    category, confidence, source = await classify(body.description, body.amount)
    return {
        "category": category,
        "confidence": confidence,
        "source": source,
        "all_categories": ALL_CATEGORIES,
    }
