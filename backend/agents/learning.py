import re
from graph.queries import (
    add_goal,
    add_learning_session,
    get_due_reviews,
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
_RECALL_KW = ["що я вчив", "що вчив", "що я читав", "що читав", "що вивчав", "що я вивчав",
              "what did i learn", "what did i study", "recall", "що було сьогодні"]
_WANT_LEARN_KW = [
    "хочу вчитися", "хочу повчитися", "є час повчитися", "що вчити",
    "що повторити", "з чого почати вчитися", "want to study",
    "що мені вчити", "порадь що вчити", "хочу навчатися", "хочу позайматися",
]


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

    # Want to study → show SM-2 due topics or active goals
    if any(kw in text for kw in _WANT_LEARN_KW):
        due = get_due_reviews(user_id)
        if due:
            overdue = [d for d in due if d["days_overdue"] > 0]
            topics = []
            for d in due[:3]:
                overdue_str = f" (прострочено {d['days_overdue']} дн.)" if d["days_overdue"] > 0 else " (сьогодні)"
                topics.append(f"«{d['topic_name']}»{overdue_str}")
            count_label = "тему" if len(due) == 1 else "теми" if len(due) < 5 else "тем"
            return (
                f"Маєш {len(due)} {count_label} для повторення:\n"
                + "\n".join(f"• {t}" for t in topics)
                + "\n\nПочни з першої — після заняття напиши: «позаймався 30 хв по [тема]»"
            ), []

        goals = get_learning_goals(user_id)
        active_goal = next((g for g in goals if g.get("status") == "active"), None)
        if active_goal:
            sessions = get_learning_sessions(user_id, limit=3)
            total = sum(s["duration"] for s in sessions)
            return (
                f"Твоя ціль: «{active_goal['description']}».\n"
                f"За тиждень вже {total} хв. Продовжуй — після заняття напиши скільки хвилин."
            ), []

        return (
            "Жодних тем для повторення і цілей ще немає.\n"
            "Почни перше заняття: «позаймався Python 30 хвилин» — і я буду відстежувати прогрес!"
        ), []

    # Recall: "Що я вчив сьогодні?"
    if any(kw in text for kw in _RECALL_KW):
        sessions = get_learning_sessions(user_id, limit=5)
        if sessions:
            topics = [s["topic"] for s in sessions if s.get("topic")]
            total_min = sum(s["duration"] for s in sessions)
            if topics:
                return f"Сьогодні вивчав: {', '.join(topics[:3])} ({total_min} хв загалом).", []
            return f"Сьогодні: {len(sessions)} навч. сесій, {total_min} хв.", []
        return "Навчальних сесій ще не записано.", []

    # Log session
    minutes = _extract_minutes(text)
    # Book reading: accept page count as duration proxy
    if not minutes:
        pages_m = re.search(r'(\d+)\s*(стор|сторінок|pages?)', text)
        if pages_m and any(w in text for w in ["прочитав", "прочитала", "read"]):
            minutes = max(30, int(pages_m.group(1)) // 3)

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
