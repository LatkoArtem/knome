from __future__ import annotations
import uuid
from datetime import date, timedelta
from graph import queries as q
from llm.client import llm_respond
from llm.prompts import RELATIONSHIPS_SYSTEM

_ADD_KW      = {"додати контакт", "новий контакт", "add contact", "познайомився", "познайомилась"}
_LIST_KW     = {"контакти", "contacts", "список людей", "мої контакти"}
_BIRTHDAY_KW = {"день народження", "birthday", "іменини", "хто народжується"}


def _upcoming_birthdays(contacts: list[dict], days: int = 14) -> list[dict]:
    today = date.today()
    result = []
    for c in contacts:
        bd = c.get("birthday", "")
        if not bd:
            continue
        try:
            parts = bd.split("-")
            bday = date(today.year, int(parts[1]), int(parts[2]))
            if bday < today:
                bday = date(today.year + 1, int(parts[1]), int(parts[2]))
            if 0 <= (bday - today).days <= days:
                result.append({**c, "days_until": (bday - today).days})
        except Exception:
            pass
    return sorted(result, key=lambda x: x["days_until"])


async def process(message: str, user_id: str, context: dict) -> tuple[str, list]:
    low = message.lower()
    updates: list[dict] = []
    contacts = q.get_contacts(user_id)

    if any(k in low for k in _BIRTHDAY_KW):
        upcoming = _upcoming_birthdays(contacts)
        if upcoming:
            names = ", ".join(f"{c['name']} ({c['days_until']} дн.)" for c in upcoming)
            return f"Найближчі дні народження: {names}.", updates
        return "Найближчих днів народження немає.", updates

    if any(k in low for k in _LIST_KW):
        if contacts:
            names = ", ".join(c["name"] for c in contacts[:10])
            return f"Твої контакти ({len(contacts)}): {names}.", updates
        return "Контактів ще немає — додай першого!", updates

    if any(k in low for k in _ADD_KW):
        # Minimal add — name extracted from message after keyword
        name_part = message
        for kw in _ADD_KW:
            name_part = name_part.lower().replace(kw, "").strip()
        name = name_part.strip().title() or "Невідомий"
        contact_id = q.add_contact(user_id, name, "friend")
        updates.append({"type": "contact_added", "name": name})
        return f"Контакт {name} додано!", updates

    # General — show upcoming birthdays and count
    upcoming = _upcoming_birthdays(contacts, days=30)
    ctx = f"Контактів: {len(contacts)}"
    if upcoming:
        ctx += f"; найближче ДН: {upcoming[0]['name']} через {upcoming[0]['days_until']} дн."
    prompt = f"Контекст: {ctx}\nПовідомлення: {message}"
    resp = await llm_respond(RELATIONSHIPS_SYSTEM, prompt) or "Підтримуй зв'язки з людьми!"
    return resp, updates
