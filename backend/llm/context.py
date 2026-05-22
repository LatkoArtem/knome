"""
Formats cross-domain graph context into a concise string for LLM prompts.
"""


def format_context(ctx: dict) -> str:
    if not ctx:
        return ""

    lines: list[str] = []

    user = ctx.get("user", {})
    if user.get("name"):
        lines.append(f"User: {user['name']}")

    goals = ctx.get("goals", [])
    if goals:
        active = [g for g in goals if g.get("status") == "active"]
        if active:
            goal_parts = [f"{g['domain']}: {g['description']}" for g in active[:3]]
            lines.append(f"Active goals: {'; '.join(goal_parts)}")

    health = ctx.get("health", {})
    if health:
        parts = []
        if health.get("avg_sleep"):
            parts.append(f"avg sleep {health['avg_sleep']}h")
        if health.get("avg_mood"):
            parts.append(f"avg mood {health['avg_mood']}/10")
        if health.get("last_sleep") and health.get("last_sleep") != health.get("avg_sleep"):
            parts.append(f"last night {health['last_sleep']}h sleep")
        if parts:
            lines.append(f"Health (7d): {', '.join(parts)}")

    learning = ctx.get("learning", {})
    if learning:
        total = learning.get("total_minutes", 0)
        count = learning.get("session_count", 0)
        h, m = divmod(total, 60)
        time_str = f"{h}h {m}min" if h else f"{m}min"
        lines.append(f"Learning (7d): {time_str} across {count} sessions")

    finance = ctx.get("finance", {})
    if finance:
        total = finance.get("total_spent", 0)
        currency = finance.get("currency", "UAH")
        cats = finance.get("top_categories", [])
        cat_str = f" (top: {', '.join(cats)})" if cats else ""
        lines.append(f"Finance (7d): {total} {currency} spent{cat_str}")

    patterns = ctx.get("patterns", [])
    if patterns:
        readable = [_pattern_to_text(p) for p in patterns]
        lines.append(f"Patterns detected: {'; '.join(readable)}")

    return "\n".join(lines)


_PATTERN_LABELS = {
    "no_learning_this_week": "no learning sessions this week",
    "low_learning_this_week": "very little learning this week (<1h)",
    "sleep_below_average": "last night sleep below personal average",
    "mood_declining": "mood declining compared to recent average",
    "sleep_learning_risk:poor_sleep_may_reduce_focus": "⚠ poor sleep may reduce focus for learning",
    "mood_spending_risk:low_mood_with_active_spending": "⚠ low mood + recent spending — possible impulse purchases",
}


def _pattern_to_text(pattern: str) -> str:
    if pattern in _PATTERN_LABELS:
        return _PATTERN_LABELS[pattern]
    if pattern.startswith("low_sleep_last_night:"):
        h = pattern.split(":")[1]
        return f"only {h} sleep last night"
    if pattern.startswith("low_mood_today:"):
        score = pattern.split(":")[1]
        return f"low mood today ({score})"
    return pattern
