import re
from graph.queries import (
    add_goal,
    add_learning_session,
    get_learning_goals,
    get_learning_sessions,
)

_SESSION_KW = ["позаймав", "вивч", "пройш", "прочитав", "studied", "learned", "read", "practice"]
_GOAL_KW = ["хочу вивчити", "додай ціль", "ціль навч", "want to learn", "new goal"]
_PROGRESS_KW = ["прогрес", "скільки", "статус", "яка ціль", "progress", "how am i", "summary"]


def _extract_minutes(text: str) -> int | None:
    m = re.search(r"(\d+)\s*(хвилин|хв\b|год\b|h\b|min\b|годин)", text)
    if not m:
        return None
    val = int(m.group(1))
    if "год" in m.group(2) or m.group(2).startswith("h"):
        val *= 60
    return val


def _extract_topic(text: str) -> str:
    for kw in ["по", "вивчав", "studied", "practicing", "on"]:
        if kw in text:
            idx = text.index(kw) + len(kw)
            return text[idx:].strip().split(".")[0].strip()
    return ""


def process(user_message: str, user_id: str) -> tuple[str, list]:
    text = user_message.lower()

    # Log session
    minutes = _extract_minutes(text)
    if minutes and any(w in text for w in _SESSION_KW):
        topic = _extract_topic(text)
        add_learning_session(user_id, minutes, topic)
        return f"Записав: {minutes} хв навчання. Так тримати!", []

    # Add goal
    if any(text.startswith(kw) or kw in text for kw in _GOAL_KW):
        for kw in _GOAL_KW:
            if kw in text:
                desc = text[text.index(kw) + len(kw):].strip().capitalize()
                break
        else:
            desc = text.capitalize()
        add_goal(user_id, "learning", desc or "Нова ціль")
        return f"Ціль додано: «{desc}». Вперед!", []

    # Show progress
    if any(w in text for w in _PROGRESS_KW):
        goals = get_learning_goals(user_id)
        sessions = get_learning_sessions(user_id, limit=7)
        total_min = sum(s["duration"] for s in sessions)
        hours, mins = divmod(total_min, 60)
        goals_str = (
            "\n".join(f"• {g['description']} ({g['status']})" for g in goals)
            if goals
            else "Цілей немає — скажи «хочу вивчити ...»"
        )
        time_str = f"{hours}г {mins}хв" if hours else f"{mins}хв"
        return (
            f"Навчання:\n\nЦілі:\n{goals_str}\n\n"
            f"За останній тиждень: {time_str} ({len(sessions)} сесій)"
        ), []

    return (
        "Розкажи про навчання! Наприклад:\n"
        "• «Позаймався Python 45 хвилин»\n"
        "• «Хочу вивчити React»\n"
        "• «Яке моє навчання?»"
    ), []
