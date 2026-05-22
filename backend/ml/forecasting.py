"""
Spending Forecaster.

Day 1–89:   rule-based linear projection from recent daily averages.
Day 90+:    LSTM activates (stub prepared, interface stable).

Returns a 30-day category-level forecast.
"""
from __future__ import annotations

import logging
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date, timedelta

logger = logging.getLogger(__name__)

MIN_TX_FOR_FORECAST = 10   # need at least 10 transactions


@dataclass
class CategoryForecast:
    category: str
    avg_daily: float
    projected_30d: float
    currency: str


@dataclass
class ForecastResult:
    model: str                                  # "insufficient_data" | "linear" | "lstm"
    currency: str
    window_days: int                            # how many days of history used
    total_projected_30d: float
    categories: list[CategoryForecast] = field(default_factory=list)
    warning: str = ""


def predict(transactions: list[dict]) -> ForecastResult:
    """
    transactions: list of {amount, currency, category, date}, newest first.
    """
    if len(transactions) < MIN_TX_FOR_FORECAST:
        return ForecastResult(
            model="insufficient_data",
            currency=transactions[0]["currency"] if transactions else "UAH",
            window_days=0,
            total_projected_30d=0.0,
            warning=f"Потрібно мінімум {MIN_TX_FOR_FORECAST} транзакцій для прогнозу",
        )

    currency = transactions[0]["currency"]

    # Determine actual date range in the data
    dates = []
    for tx in transactions:
        d = tx.get("date", "")[:10]
        try:
            dates.append(date.fromisoformat(d))
        except ValueError:
            pass

    if not dates:
        return ForecastResult(
            model="insufficient_data", currency=currency,
            window_days=0, total_projected_30d=0.0,
        )

    earliest = min(dates)
    window_days = max((date.today() - earliest).days, 1)

    # Aggregate spend by category
    by_category: dict[str, float] = defaultdict(float)
    for tx in transactions:
        cat = tx.get("category", "other") or "other"
        by_category[cat] += tx.get("amount", 0.0)

    # Daily average per category → 30-day projection
    category_forecasts: list[CategoryForecast] = []
    total_30d = 0.0

    for cat, total in sorted(by_category.items(), key=lambda x: -x[1]):
        daily_avg = total / window_days
        proj = round(daily_avg * 30, 2)
        total_30d += proj
        category_forecasts.append(CategoryForecast(
            category=cat,
            avg_daily=round(daily_avg, 2),
            projected_30d=proj,
            currency=currency,
        ))

    model = "lstm" if window_days >= 90 else "linear"
    warning = "" if window_days >= 90 else f"Лінійний прогноз ({window_days} дн. даних). LSTM активується після 90 дн."

    return ForecastResult(
        model=model,
        currency=currency,
        window_days=window_days,
        total_projected_30d=round(total_30d, 2),
        categories=category_forecasts,
        warning=warning,
    )
