"""
Trigger condition evaluators.
Each rule returns a message string if triggered, None otherwise.
"""
from datetime import date, timedelta
from typing import Optional

from graph.queries import (
    get_user_context,
    get_recent_checkins,
    get_learning_sessions,
    get_recent_transactions,
    get_all_users,
)


# ── Individual rule functions ────────────────────────────────────────────────

async def rule_morning_checkin(user_id: str) -> Optional[str]:
    """09:00 daily — nudge if no check-in today."""
    checkins = get_recent_checkins(user_id, limit=1)
    today = date.today().isoformat()
    if checkins and checkins[0].get("date", "")[:10] == today:
        return None  # already done

    ctx = get_user_context(user_id)
    name = ctx.get("user", {}).get("name", "")
    name_part = f", {name}" if name else ""
    return f"Доброго ранку{name_part}! ☀️ Як пройшла ніч? Запиши сон і настрій — це займе 10 секунд."


async def rule_learning_gap(user_id: str) -> Optional[str]:
    """Pattern: 3+ days without any learning session."""
    sessions = get_learning_sessions(user_id, limit=1)
    if not sessions:
        return None  # new user — hasn't started yet, no gap to report

    last_date = sessions[0].get("date", "")[:10]
    try:
        last = date.fromisoformat(last_date)
        gap_days = (date.today() - last).days
    except ValueError:
        return None

    if gap_days < 3:
        return None

    ctx = get_user_context(user_id)
    name = ctx.get("user", {}).get("name", "")
    name_part = f", {name}" if name else ""
    day_word = "день" if gap_days == 1 else "дні" if gap_days < 5 else "днів"
    return f"Привіт{name_part}! Вже {gap_days} {day_word} без навчання — навіть 10 хвилин сьогодні підтримають прогрес 📚"


async def rule_low_mood_streak(user_id: str) -> Optional[str]:
    """Pattern: 4 consecutive check-ins with mood < 5."""
    checkins = get_recent_checkins(user_id, limit=4)
    if len(checkins) < 4:
        return None
    if not all(c["mood"] < 5 for c in checkins):
        return None

    ctx = get_user_context(user_id)
    name = ctx.get("user", {}).get("name", "")
    avg = round(sum(c["mood"] for c in checkins) / len(checkins), 1)
    name_part = f", {name}" if name else ""
    return f"Привіт{name_part} 💙 Помітив, що настрій останніми днями {avg}/10. Як справи? Може варто трохи відпочити або розповісти що турбує?"


async def rule_spending_anomaly(user_id: str) -> Optional[str]:
    """Event: today's spending > 2x the daily average for this week."""
    txs = get_recent_transactions(user_id, limit=50)
    if len(txs) < 5:
        return None

    today = date.today().isoformat()
    today_total = sum(t["amount"] for t in txs if t["date"][:10] == today)
    if today_total == 0:
        return None

    # Average daily spending (last 7 days excluding today)
    week_ago = (date.today() - timedelta(days=7)).isoformat()
    past = [t["amount"] for t in txs if week_ago <= t["date"][:10] < today]
    if not past:
        return None
    daily_avg = sum(past) / 7

    if today_total < daily_avg * 2:
        return None

    currency = txs[0]["currency"] if txs else "UAH"
    ctx = get_user_context(user_id)
    name = ctx.get("user", {}).get("name", "")
    name_part = f", {name}" if name else ""
    return f"Привіт{name_part} 💰 Сьогодні витрачено {today_total:.0f} {currency} — це вдвічі більше за звичайний день ({daily_avg:.0f} {currency}). Все гаразд?"


async def rule_weekly_report(user_id: str) -> Optional[str]:
    """Sunday 10:00 — weekly summary."""
    ctx = get_user_context(user_id)
    if not ctx:
        return None

    from llm.context import format_context
    ctx_str = format_context(ctx)
    name = ctx.get("user", {}).get("name", "")
    name_part = f", {name}" if name else ""
    return f"Привіт{name_part}! 📊 Тижень завершено. Відкрий дашборд щоб побачити свій прогрес — і не забудь про тижневий огляд!"


async def rule_burnout_risk(user_id: str) -> Optional[str]:
    """Pattern: burnout score >= 60 (high risk)."""
    from datetime import date, timedelta
    from graph.queries import get_learning_sessions
    from ml.burnout import predict as burnout_predict

    checkins = get_recent_checkins(user_id, limit=14)
    sessions = get_learning_sessions(user_id, limit=30)

    today = date.today()
    def _count(offset: int, window: int) -> int:
        start = (today - timedelta(days=offset + window)).isoformat()
        end   = (today - timedelta(days=offset)).isoformat()
        return sum(1 for s in sessions if start <= s["date"][:10] <= end)

    result = burnout_predict(checkins, _count(0, 7), _count(7, 7))
    if result.level != "high":
        return None

    ctx = get_user_context(user_id)
    name = ctx.get("user", {}).get("name", "")
    top_factor = result.factors[0] if result.factors else ""
    name_part = f", {name}" if name else ""
    return (
        f"Привіт{name_part} 🌿 Помітив ознаки перевтоми (ризик {result.score}/100). "
        f"Може варто зробити паузу і відновитися? Навіть один вільний вечір допоможе."
    )


# ── Run all event/pattern rules for one user ────────────────────────────────

async def evaluate_all(user_id: str) -> list[tuple[str, str]]:
    """
    Run all pattern/event rules. Returns list of (trigger_type, message).
    Called by the scheduler every 15 minutes.
    """
    results = []
    checks = [
        ("learning_gap",    rule_learning_gap),
        ("low_mood_streak", rule_low_mood_streak),
        ("spending_anomaly", rule_spending_anomaly),
        ("burnout_risk",    rule_burnout_risk),
    ]
    for trigger_type, fn in checks:
        try:
            msg = await fn(user_id)
            if msg:
                results.append((trigger_type, msg))
        except Exception:
            pass
    return results
