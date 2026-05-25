from __future__ import annotations
import re
import uuid
from datetime import date, timedelta
from graph import queries as q
from llm.client import llm_respond
from llm.prompts import RELATIONSHIPS_SYSTEM

_ADD_KW         = {"додати контакт", "новий контакт", "add contact", "познайомився", "познайомилась"}
_LIST_KW        = {"контакти", "contacts", "список людей", "мої контакти"}
_BIRTHDAY_KW    = {"день народження", "birthday", "іменини", "хто народжується"}
_INTERACTION_KW = [
    "розмовляв з", "розмовляла з", "зустрівся з", "зустрілася з",
    "зателефонував", "зателефонувала", "написав", "написала",
    "побачився з", "побачилася з", "спілкувався з", "спілкувалася з",
    "talked to", "met with", "called",
]

def _nominative(name: str) -> str:
    """Best-effort Ukrainian genitive → nominative conversion for names."""
    # Female names: "Марини" → "Марина", "Тетяни" → "Тетяна"
    if len(name) > 4 and name.endswith("ини"):
        return name[:-3] + "ина"
    if len(name) > 4 and name.endswith("іни"):
        return name[:-3] + "іна"
    # Male names ending in genitive -а: "Максима" → "Максим", "Андрія" → "Андрій"
    if len(name) > 4 and name[-1] == "а":
        return name[:-1]
    if len(name) > 4 and name[-1] == "я":
        return name[:-1] + "й"
    return name


def _extract_birthday_person(text: str) -> str | None:
    """Extract person name from 'день народження X' or 'у X день народження'."""
    patterns = [
        r"день народження\s+(?:мого|моєї|нашого|нашої)?\s*(?:друга|подруги|брата|сестри|колеги)?\s*([А-ЯІЇЄa-яіїє][а-яіїє'A-Za-z]+)",
        r"(?:у|в)\s+([А-ЯІЇЄa-яіїє][а-яіїє']+)\s+(?:завтра|сьогодні|скоро)?\s*день народження",
        r"(?:у|в)\s+([А-ЯІЇЄa-яіїє][а-яіїє']+)\s+ДН\b",
        r"birthday\s+of\s+([A-Za-z]+)",
    ]
    for pattern in patterns:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            raw = m.group(1).strip()
            return _nominative(raw).title()
    return None


def _extract_interaction_person(text: str, contacts: list[dict]) -> str | None:
    patterns = [
        r"(?:розмовляв|розмовляла|зустрівся|зустрілася|спілкувався|спілкувалася|побачився|побачилася)\s+з\s+([А-ЯІЇЄa-яіїє][а-яіїє']+)",
        r"(?:зателефонував|зателефонувала|написав|написала)\s+([А-ЯІЇЄa-яіїє][а-яіїє']+)",
        r"(?:talked to|met with|called)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)",
    ]
    for pattern in patterns:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            raw = m.group(1).strip()
            return _nominative(raw).title()
    for c in contacts:
        if c["name"].lower() in text.lower():
            return c["name"]
    return None


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
        # Check if user mentions a specific person's birthday
        person = _extract_birthday_person(message)
        if person:
            # Check if already in contacts
            existing = next((c for c in contacts if person.lower() in c["name"].lower()), None)
            if existing:
                bd_note = f" День народження: {existing.get('birthday')}." if existing.get("birthday") else ""
                return (
                    f"Знаю {existing['name']}!{bd_note}\n"
                    f"Хочеш встановити нагадування про день народження або записати нотатку?"
                ), updates
            else:
                cid = q.add_contact(user_id, person, "friend")
                updates.append({"type": "contact_added", "name": person})
                return (
                    f"Додав {person} до контактів і запишу нагадування про день народження! 🎂\n"
                    f"Вкажи дату ДН щоб не пропустити: «{person}: ДН 15 квітня»"
                ), updates

        # Show upcoming birthdays
        upcoming = _upcoming_birthdays(contacts)
        if upcoming:
            names = ", ".join(f"{c['name']} ({c['days_until']} дн.)" for c in upcoming)
            return f"Найближчі дні народження: {names}.", updates
        return "Найближчих днів народження немає. Але в тебе є день народження друга? Назви ім'я — додам контакт!", updates

    if any(k in low for k in _INTERACTION_KW):
        person = _extract_interaction_person(message, contacts)
        if person:
            existing = next((c for c in contacts if person.lower() in c["name"].lower()), None)
            if existing:
                itype = "call" if any(k in low for k in ["зателефонував", "зателефонувала", "called"]) \
                    else "meeting" if any(k in low for k in ["зустрівся", "зустрілася", "met with"]) \
                    else "message" if any(k in low for k in ["написав", "написала"]) \
                    else "general"
                q.add_interaction(user_id, existing["id"], message, itype)
                updates.append({"type": "interaction_logged", "name": existing["name"], "itype": itype})
                return f"Записав взаємодію з {existing['name']}! 📝", updates

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
