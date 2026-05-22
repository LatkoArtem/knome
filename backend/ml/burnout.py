"""
Burnout Predictor.

Day 1–30: rule-based scoring (0–100) from mood, sleep, energy, learning trends.
Day 31+:  Random Forest activates when >= 30 labeled samples exist.

Risk levels:  low < 30,  medium 30–59,  high >= 60.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class BurnoutResult:
    score: int                      # 0–100
    level: str                      # "low" | "medium" | "high"
    factors: list[str] = field(default_factory=list)
    recommendations: list[str] = field(default_factory=list)
    model: str = "rule_based"


def _slope(values: list[float]) -> float:
    """Simple linear regression slope over evenly-spaced points."""
    n = len(values)
    if n < 2:
        return 0.0
    x_mean = (n - 1) / 2
    y_mean = sum(values) / n
    num = sum((i - x_mean) * (v - y_mean) for i, v in enumerate(values))
    den = sum((i - x_mean) ** 2 for i in range(n))
    return num / den if den else 0.0


def predict(
    checkins: list[dict],        # from get_recent_checkins(user_id, limit=14)
    sessions_7d: int,            # learning sessions in last 7 days
    sessions_prev7d: int,        # learning sessions in previous 7-day window
) -> BurnoutResult:
    """
    Rule-based burnout scoring.
    checkins: list of {mood, sleep_hours, energy, date}, newest first.
    """
    if not checkins:
        return BurnoutResult(
            score=0, level="low",
            factors=["insufficient_data"],
            recommendations=["Почни записувати чек-іни щодня для точного аналізу"],
        )

    score = 0
    factors: list[str] = []
    recs: list[str] = []

    recent = checkins[:7]   # last 7 days

    moods   = [c["mood"]        for c in recent if c.get("mood")        is not None]
    sleeps  = [c["sleep_hours"] for c in recent if c.get("sleep_hours") is not None]
    energies= [c["energy"]      for c in recent if c.get("energy")      is not None]

    # ── Mood ──────────────────────────────────────────────────────────────────
    if moods:
        avg_mood = sum(moods) / len(moods)
        if avg_mood < 4:
            score += 25; factors.append(f"avg_mood_very_low:{avg_mood:.1f}/10")
            recs.append("Поговори з кимось близьким або зверни увагу на відпочинок")
        elif avg_mood < 6:
            score += 15; factors.append(f"avg_mood_low:{avg_mood:.1f}/10")

        mood_trend = _slope(list(reversed(moods)))  # oldest → newest
        if mood_trend < -0.5:
            score += 10; factors.append("mood_declining")
            recs.append("Настрій знижується — спробуй зменшити навантаження")

    # ── Sleep ─────────────────────────────────────────────────────────────────
    if sleeps:
        avg_sleep = sum(sleeps) / len(sleeps)
        if avg_sleep < 5.5:
            score += 25; factors.append(f"chronic_sleep_deficit:{avg_sleep:.1f}h")
            recs.append("Хронічний недосип — пріоритет #1: лягай до 23:00")
        elif avg_sleep < 7:
            score += 12; factors.append(f"low_sleep:{avg_sleep:.1f}h")
            recs.append("Спробуй спати 7–8 год")

        sleep_trend = _slope(list(reversed(sleeps)))
        if sleep_trend < -0.3 and avg_sleep < 7:
            score += 8; factors.append("sleep_worsening")

    # ── Energy ────────────────────────────────────────────────────────────────
    if energies:
        avg_energy = sum(energies) / len(energies)
        if avg_energy < 4:
            score += 15; factors.append(f"low_energy:{avg_energy:.1f}/10")
            recs.append("Перевір харчування та рівень активності")
        elif avg_energy < 6:
            score += 8; factors.append(f"below_avg_energy:{avg_energy:.1f}/10")

    # ── Learning drop ─────────────────────────────────────────────────────────
    if sessions_prev7d > 0:
        drop_pct = (sessions_prev7d - sessions_7d) / sessions_prev7d
        if drop_pct > 0.7:
            score += 15; factors.append(f"learning_drop:{int(drop_pct*100)}%")
            recs.append("Різкий спад навчальної активності — можлива перевтома")
        elif drop_pct > 0.4:
            score += 7; factors.append(f"learning_reduced:{int(drop_pct*100)}%")
    elif sessions_prev7d == 0 and sessions_7d == 0:
        score += 5; factors.append("no_recent_learning")

    # ── Cap & classify ────────────────────────────────────────────────────────
    score = min(score, 100)

    if score >= 60:
        level = "high"
        if not recs:
            recs.append("Зверни увагу на режим — ознаки вигорання помітні")
    elif score >= 30:
        level = "medium"
    else:
        level = "low"
        if not factors:
            factors.append("all_indicators_normal")

    return BurnoutResult(score=score, level=level, factors=factors, recommendations=recs)
