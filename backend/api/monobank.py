"""Monobank integration endpoints."""
import logging
from datetime import date, timedelta

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from auth.db import save_integration, get_integration, delete_integration
from graph.queries import user_exists, add_transaction, get_recent_transactions
from integrations.monobank import MonobankIntegration
from ml.classifier import classify_sync

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/monobank", tags=["monobank"])

_PROVIDER = "monobank"


class SetupRequest(BaseModel):
    token: str


@router.get("/status/{user_id}")
async def monobank_status(user_id: str):
    if not user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    integration = get_integration(user_id, _PROVIDER)
    return {
        "connected": integration is not None,
        "updated_at": integration["updated_at"] if integration else None,
    }


@router.post("/setup/{user_id}")
async def monobank_setup(user_id: str, body: SetupRequest):
    """Save Monobank token after verifying it works."""
    if not user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    if not body.token.strip():
        raise HTTPException(status_code=400, detail="Токен не може бути порожнім")

    mono = MonobankIntegration(body.token.strip())
    info = await mono.get_client_info()
    if info is None:
        raise HTTPException(status_code=401, detail="Невірний Monobank токен або API недоступний")

    client_name = info.get("name", "")
    save_integration(user_id, _PROVIDER, body.token.strip(), f'{{"name": "{client_name}"}}')
    return {"ok": True, "name": client_name}


@router.post("/sync/{user_id}")
async def monobank_sync(user_id: str, days: int = 30):
    """Sync transactions from Monobank for the last N days (max 30)."""
    if not user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")

    integration = get_integration(user_id, _PROVIDER)
    if not integration:
        raise HTTPException(status_code=400, detail="Monobank не підключено. Спочатку додай токен.")

    days = min(max(days, 1), 30)
    to_dt = date.today()
    from_dt = to_dt - timedelta(days=days)

    mono = MonobankIntegration(integration["token"])
    try:
        transactions = await mono.fetch_transactions(from_dt, to_dt)
    except RuntimeError as e:
        raise HTTPException(status_code=429, detail=str(e))

    # De-duplicate against existing transactions (by date + amount + description)
    existing = get_recent_transactions(user_id, limit=200)
    existing_keys = {
        (round(t["amount"], 2), t["description"][:30] if t["description"] else "")
        for t in existing
    }

    imported = 0
    skipped = 0
    for tx in transactions:
        key = (round(tx["amount"], 2), (tx["description"] or "")[:30])
        if key in existing_keys:
            skipped += 1
            continue

        # If MCC gave "інше", try text classifier on description
        category = tx["category"]
        if category == "інше" and tx["description"]:
            category = classify_sync(tx["description"])

        add_transaction(
            user_id=user_id,
            amount=tx["amount"],
            currency=tx["currency"],
            category=category,
            description=tx["description"],
        )
        existing_keys.add(key)
        imported += 1

    logger.info("Monobank sync for %s: %d imported, %d skipped", user_id, imported, skipped)
    return {
        "imported": imported,
        "skipped": skipped,
        "total_fetched": len(transactions),
        "period_days": days,
    }


@router.delete("/disconnect/{user_id}")
async def monobank_disconnect(user_id: str):
    if not user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    delete_integration(user_id, _PROVIDER)
    return {"ok": True}
