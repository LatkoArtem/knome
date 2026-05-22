"""ML inference endpoints — Burnout Predictor + Spending Forecaster."""
from datetime import date, timedelta
from fastapi import APIRouter, HTTPException

from graph.queries import (
    get_recent_checkins,
    get_learning_sessions,
    get_recent_transactions,
    user_exists,
)
from ml.burnout import predict as burnout_predict
from ml.forecasting import predict as forecast_predict

router = APIRouter(tags=["ml"])


def _sessions_in_window(sessions: list[dict], days_back: int, offset: int = 0) -> int:
    today = date.today()
    start = (today - timedelta(days=offset + days_back)).isoformat()
    end   = (today - timedelta(days=offset)).isoformat()
    return sum(1 for s in sessions if start <= s["date"][:10] <= end)


@router.get("/ml/burnout/{user_id}")
async def get_burnout(user_id: str):
    if not user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")

    checkins  = get_recent_checkins(user_id, limit=14)
    sessions  = get_learning_sessions(user_id, limit=30)

    sessions_7d      = _sessions_in_window(sessions, days_back=7)
    sessions_prev7d  = _sessions_in_window(sessions, days_back=7, offset=7)

    result = burnout_predict(checkins, sessions_7d, sessions_prev7d)
    return {
        "score":           result.score,
        "level":           result.level,
        "factors":         result.factors,
        "recommendations": result.recommendations,
        "model":           result.model,
    }


@router.get("/ml/forecast/{user_id}")
async def get_forecast(user_id: str):
    if not user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")

    transactions = get_recent_transactions(user_id, limit=200)
    result = forecast_predict(transactions)
    return {
        "model":              result.model,
        "currency":           result.currency,
        "window_days":        result.window_days,
        "total_projected_30d": result.total_projected_30d,
        "warning":            result.warning,
        "categories": [
            {
                "category":       c.category,
                "avg_daily":      c.avg_daily,
                "projected_30d":  c.projected_30d,
                "currency":       c.currency,
            }
            for c in result.categories
        ],
    }
