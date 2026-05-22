from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from graph.queries import get_recent_transactions, add_transaction, user_exists

router = APIRouter()


class AddTransactionRequest(BaseModel):
    amount: float
    currency: str = "UAH"
    category: str = "інше"
    description: str = ""


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
    tid = add_transaction(user_id, body.amount, body.currency, body.category, body.description)
    return {"transaction_id": tid, "amount": body.amount, "currency": body.currency}
