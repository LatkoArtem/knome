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
from llm.client import llm_respond

_MORNING_SYSTEM = """You are Knome sending a proactive morning message to the user.
Keep it warm, brief (1 sentence), and in Ukrainian.
Mention their name if provided. Prompt them to log today's check-in."""

_WEEKLY_SYSTEM = """You are Knome sending a Sunday weekly recap to the user.
Keep it encouraging, 2-3 sentences, in Ukrainian.
Summarize what was good this week based on the context provided."""


async def _llm_or(system: str, prompt: str, fallback: str) -> str:
    result = await llm_respond(system, prompt)
    return result if result else fallback


# ── Individual rule functions ────────────────────────────────────────────────

async def rule_morning_checkin(user_id: str) -> Optional[str]:
    """09:00 daily — nudge if no check-in today."""
    checkins = get_recent_checkins(user_id, limit=1)
    today = date.today().isoformat()
    if checkins and checkins[0].get("date", "")[:10] == today:
        return None  # already done

    ctx = get_user_context(user_id)
    name = ctx.get("user", {}).get("name", "")
    greeting = f"Привіт{', ' + name if name else ''}! "

    return await _llm_or(
        _MORNING_SYSTEM,
        f"User name: {name}. Morning nudge for daily check-in.",
        greeting + "Як пройшла ніч? Запиши сон і настрій 😊",
    )


async def rule_learning_gap(user_id: str) -> Optional[str]:
    """Pattern: 3+ days without any learning session."""
    sessions = get_learning_sessions(user_id, limit=1)
    if not sessions:
        gap_days = 999
    else:
        last_date = sessions[0].get("date", "")[:10]
        try:
            last = date.fromisoformat(last_date)
            gap_days = (date.today() - last).days
        except ValueError:
            gap_days = 999

    if gap_days < 3:
        return None

    ctx = get_user_context(user_id)
    name = ctx.get("user", {}).get("name", "")
    fallback = f"{'Привіт' + (', ' + name) if name else 'Привіт'}! Вже {gap_days} дні без навчання. Навіть 10 хвилин сьогодні підтримають прогрес 📚"
    return await _llm_or(
        "You are Knome. The user hasn't studied in several days. Send a warm, brief (1 sentence) motivation in Ukrainian. Use their name if provided.",
        f"User: {name}. Days without learning: {gap_days}.",
        fallback,
    )


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
    fallback = f"{'Привіт' + (', ' + name) if name else 'Привіт'}, помітив що настрій останніми днями {avg}/10. Як справи? Може варто трохи відпочити? 💙"
    return await _llm_or(
        "You are Knome. The user had 4 consecutive low mood check-ins. Send a caring, brief (1-2 sentences) message in Ukrainian. Don't be dramatic.",
        f"User: {name}. Last 4 moods: {[c['mood'] for c in checkins]}. Avg: {avg}/10.",
        fallback,
    )


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
    fallback = f"{'Привіт' + (', ' + name) if name else 'Привіт'}, сьогодні витрачено {today_total:.0f} {currency} — це вдвічі більше звичайного. Все гаразд? 💰"
    return await _llm_or(
        "You are Knome. The user spent 2x their daily average today. Send a brief, non-judgmental check-in in Ukrainian.",
        f"User: {name}. Today: {today_total:.0f} {currency}. Daily avg: {daily_avg:.0f} {currency}.",
        fallback,
    )


async def rule_weekly_report(user_id: str) -> Optional[str]:
    """Sunday 10:00 — weekly summary."""
    ctx = get_user_context(user_id)
    if not ctx:
        return None

    from llm.context import format_context
    ctx_str = format_context(ctx)
    name = ctx.get("user", {}).get("name", "")
    fallback = f"Привіт{', ' + name if name else ''}! Тижневий підсумок готовий. Відкрий дашборд щоб побачити свій прогрес 📊"
    return await _llm_or(
        _WEEKLY_SYSTEM,
        f"User data for the week:\n{ctx_str}",
        fallback,
    )


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
    fallback = (
        f"{'Привіт' + (', ' + name) if name else 'Привіт'}, "
        f"помітив ознаки перевтоми (ризик {result.score}/100). "
        f"Може варто зробити паузу? 🌿"
    )
    return await _llm_or(
        "You are Knome. The user shows high burnout risk. Send a caring, brief (2 sentences) message in Ukrainian. "
        "Mention that you noticed signs of fatigue. Don't be dramatic.",
        f"User: {name}. Burnout score: {result.score}/100. Top factor: {top_factor}. "
        f"Recommendations: {', '.join(result.recommendations[:2])}.",
        fallback,
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
