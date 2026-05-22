import re
from graph.queries import (
    add_goal,
    add_learning_session,
    get_learning_goals,
    get_learning_sessions,
    upsert_topic_review,
)
from ml.sm2 import infer_quality
from llm.client import llm_respond
from llm.prompts import LEARNING_SYSTEM
from llm.context import format_context

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


def _llm_prompt(action: str, user_message: str, context: dict | None) -> str:
    ctx_str = format_context(context) if context else ""
    parts = [f"Action: {action}", f"User message: {user_message}"]
    if ctx_str:
        parts.insert(0, f"Context:\n{ctx_str}")
    return "\n\n".join(parts)


async def process(user_message: str, user_id: str, context: dict | None = None) -> tuple[str, list]:
    text = user_message.lower()

    # Log session
    minutes = _extract_minutes(text)
    if minutes and any(w in text for w in _SESSION_KW):
        topic = _extract_topic(text)
        add_learning_session(user_id, minutes, topic)

        # SM-2: update review schedule if topic is known
        review_info = ""
        if topic:
            quality = infer_quality(user_message, minutes)
            review = upsert_topic_review(user_id, topic, quality)
            days = review["interval_days"]
            review_info = f" Next review of «{topic}» in {days} day(s)."

        fallback = f"Записав: {minutes} хв навчання. Так тримати!"
        topic_str = f" on «{topic}»" if topic else ""
        action = f"Logged learning session: {minutes} minutes{topic_str}. Saved.{review_info}"
        response = await llm_respond(LEARNING_SYSTEM, _llm_prompt(action, user_message, context))
        return response or fallback, []

    # Add goal
    if any(text.startswith(kw) or kw in text for kw in _GOAL_KW):
        for kw in _GOAL_KW:
            if kw in text:
                desc = text[text.index(kw) + len(kw):].strip().capitalize()
                break
        else:
            desc = text.capitalize()
        desc = desc or "Нова ціль"
        add_goal(user_id, "learning", desc)
        fallback = f"Ціль додано: «{desc}». Вперед!"
        action = f"Added new learning goal: «{desc}»."
        response = await llm_respond(LEARNING_SYSTEM, _llm_prompt(action, user_message, context))
        return response or fallback, []

    # Show progress
    if any(w in text for w in _PROGRESS_KW):
        goals = get_learning_goals(user_id)
        sessions = get_learning_sessions(user_id, limit=7)
        total_min = sum(s["duration"] for s in sessions)
        hours, mins = divmod(total_min, 60)
        goals_str = (
            "\n".join(f"• {g['description']} ({g['status']})" for g in goals)
            if goals else "No goals yet"
        )
        time_str = f"{hours}h {mins}min" if hours else f"{mins}min"
        fallback = (
            f"Навчання:\n\nЦілі:\n{goals_str}\n\n"
            f"За останній тиждень: {time_str} ({len(sessions)} сесій)"
        )
        action = (
            f"User requested learning summary. "
            f"Goals: {goals_str}. "
            f"Last 7 days: {time_str} across {len(sessions)} sessions."
        )
        response = await llm_respond(LEARNING_SYSTEM, _llm_prompt(action, user_message, context))
        return response or fallback, []

    fallback = (
        "Розкажи про навчання! Наприклад:\n"
        "• «Позаймався Python 45 хвилин»\n"
        "• «Хочу вивчити React»\n"
        "• «Яке моє навчання?»"
    )
    response = await llm_respond(LEARNING_SYSTEM, _llm_prompt("", user_message, context))
    return response or fallback, []
