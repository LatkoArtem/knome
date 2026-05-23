from fastapi import APIRouter
from pydantic import BaseModel
from graph import queries as q

router = APIRouter(prefix="/api/networth", tags=["networth"])


class AssetIn(BaseModel):
    name: str
    category: str = "other"
    value: float = 0.0
    currency: str = "UAH"
    notes: str = ""


class AssetValueIn(BaseModel):
    value: float


class DebtIn(BaseModel):
    name: str
    category: str = "loan"
    amount: float = 0.0
    currency: str = "UAH"
    interest_rate: float = 0.0
    due_date: str = ""


@router.post("/asset/{user_id}")
async def add_asset(user_id: str, body: AssetIn):
    aid = q.add_asset(user_id, body.name, body.category, body.value, body.currency, body.notes)
    return {"id": aid}


@router.get("/assets/{user_id}")
async def get_assets(user_id: str):
    return q.get_assets(user_id)


@router.patch("/asset/{asset_id}")
async def update_asset(asset_id: str, body: AssetValueIn):
    q.update_asset_value(asset_id, body.value)
    return {"ok": True}


@router.delete("/asset/{asset_id}")
async def delete_asset(asset_id: str):
    q.delete_asset(asset_id)
    return {"ok": True}


@router.post("/debt/{user_id}")
async def add_debt(user_id: str, body: DebtIn):
    did = q.add_debt(user_id, body.name, body.category, body.amount,
                     body.currency, body.interest_rate, body.due_date)
    return {"id": did}


@router.get("/debts/{user_id}")
async def get_debts(user_id: str):
    return q.get_debts(user_id, active_only=False)


@router.patch("/debt/{debt_id}/paid")
async def mark_paid(debt_id: str):
    q.mark_debt_paid(debt_id)
    return {"ok": True}


@router.delete("/debt/{debt_id}")
async def delete_debt(debt_id: str):
    q.delete_debt(debt_id)
    return {"ok": True}


@router.get("/summary/{user_id}")
async def summary(user_id: str):
    assets = q.get_assets(user_id)
    debts = q.get_debts(user_id, active_only=True)

    total_assets = sum(a["value"] for a in assets)
    total_debts = sum(d["amount"] for d in debts)
    net_worth = total_assets - total_debts

    by_category: dict[str, float] = {}
    for a in assets:
        by_category[a["category"]] = by_category.get(a["category"], 0) + a["value"]

    return {
        "total_assets": round(total_assets, 2),
        "total_debts": round(total_debts, 2),
        "net_worth": round(net_worth, 2),
        "asset_count": len(assets),
        "debt_count": len(debts),
        "assets_by_category": by_category,
        "currency": assets[0]["currency"] if assets else "UAH",
    }
