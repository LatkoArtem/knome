from __future__ import annotations
import uuid
from datetime import date
from graph import queries as q
from llm.client import llm_respond
from llm.prompts import REFLECTION_SYSTEM

_JOURNAL_KW  = {"journal", "щоденник", "записати", "запис", "нотатка", "нотую", "думки"}
_GRATITUDE_KW = {"вдячний", "вдячна", "gratitude", "подяка", "дякую", "вдячність", "3 речі"}
_REVIEW_KW   = {"тижневий", "weekly", "огляд тижня", "підсумок тижня", "review"}
_GOOD_DAY_KW = {"вдалий день", "все склалось", "чудовий день", "прекрасний день",
                "хороший день", "добрий день сьогодні"}


async def process(message: str, user_id: str, context: dict) -> tuple[str, list]:
    low = message.lower()
    updates: list[dict] = []

    # Good day → offer gratitude / journal
    if any(k in low for k in _GOOD_DAY_KW):
        eid = q.add_journal_entry(user_id, message)
        updates.append({"type": "journal", "id": eid})
        return (
            "Записав до щоденника — це важливо фіксувати! 📝\n"
            "Якщо хочеш практику вдячності, напиши: «вдячний за 1. ... 2. ... 3. ...»\n"
            "Позитивні дні заряджають на майбутнє 🌟"
        ), updates

    if any(k in low for k in _JOURNAL_KW):
        eid = q.add_journal_entry(user_id, message)
        updates.append({"type": "journal", "id": eid})
        recent = q.get_journal_entries(user_id, limit=3)
        ctx = f"Нові записи щоденника: {len(recent)} шт."
        prompt = f"Контекст: {ctx}\nПовідомлення: {message}"
        resp = await llm_respond(REFLECTION_SYSTEM, prompt) or "Продовжуй рефлексувати."
        return f"Записано до щоденника! ✍️\n\n{resp}", updates

    if any(k in low for k in _GRATITUDE_KW):
        # Extract up to 3 items separated by commas/newlines
        items = [s.strip() for s in message.replace('\n', ',').split(',') if s.strip()]
        # Filter out the trigger words
        items = [i for i in items if not any(k in i.lower() for k in _GRATITUDE_KW)][:3]
        while len(items) < 3:
            items.append("")
        gid = q.add_gratitude_entry(user_id, items[0], items[1], items[2])
        updates.append({"type": "gratitude", "id": gid})
        return "Подяку записано — гарна практика!", updates

    if any(k in low for k in _REVIEW_KW):
        reviews = q.get_weekly_reviews(user_id, limit=1)
        ctx = f"Останній огляд: {reviews[0]['week'] if reviews else 'немає'}"
        prompt = f"Контекст: {ctx}\nПовідомлення: {message}"
        resp = await llm_respond(REFLECTION_SYSTEM, prompt) or "Давай підіб'ємо підсумки тижня."
        return resp, updates

    # General reflection
    entries = q.get_journal_entries(user_id, limit=5)
    ctx_parts = []
    if entries:
        ctx_parts.append(f"Останніх записів: {len(entries)}")
    ctx = "; ".join(ctx_parts) if ctx_parts else "немає даних"
    prompt = f"Контекст: {ctx}\nПовідомлення: {message}"
    resp = await llm_respond(REFLECTION_SYSTEM, prompt) or "Рефлексія — важлива частина росту."
    return resp, updates
