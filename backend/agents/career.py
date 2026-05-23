from __future__ import annotations
import uuid
from datetime import date
from graph import queries as q
from llm.client import llm_respond
from llm.prompts import CAREER_SYSTEM

_SKILL_KW       = {"навичка", "скіл", "skill", "вміння", "додати навичку", "вивчив", "освоїв"}
_ACHIEVEMENT_KW = {"досягнення", "achievement", "виконав", "зробив", "реалізував", "запустив", "закінчив"}
_LIST_KW        = {"мої навички", "my skills", "список навичок", "мої досягнення", "my achievements"}


async def process(message: str, user_id: str, context: dict) -> tuple[str, list]:
    low = message.lower()
    updates: list[dict] = []

    if any(k in low for k in _LIST_KW):
        if "навич" in low or "skill" in low:
            skills = q.get_career_skills(user_id)
            if skills:
                top = sorted(skills, key=lambda s: s.get("level", 0), reverse=True)[:5]
                names = ", ".join(f"{s['name']} ({s['level']}/10)" for s in top)
                return f"Топ навичок: {names}.", updates
            return "Навичок ще немає — додай перші!", updates
        else:
            achievements = q.get_achievements(user_id)
            if achievements:
                recent = achievements[:3]
                names = "; ".join(a["title"] for a in recent)
                return f"Останні досягнення: {names}.", updates
            return "Досягнень ще немає — є час це виправити!", updates

    if any(k in low for k in _SKILL_KW):
        # Extract skill name — everything after the keyword
        name = message
        for kw in _SKILL_KW:
            name = name.lower().replace(kw, "").strip()
        name = name.strip().title() or "Нова навичка"
        sid = q.add_career_skill(user_id, name, 5, "general")
        updates.append({"type": "career_skill_added", "name": name, "id": sid})
        return f"Навичку «{name}» додано на рівні 5/10!", updates

    if any(k in low for k in _ACHIEVEMENT_KW):
        title = message[:80].strip()
        aid = q.add_achievement(user_id, title, "", "medium", "")
        updates.append({"type": "achievement_added", "id": aid})
        return "Досягнення зафіксовано — молодець!", updates

    # General career context
    skills = q.get_career_skills(user_id)
    achievements = q.get_achievements(user_id)
    ctx = f"Навичок: {len(skills)}, досягнень: {len(achievements)}"
    prompt = f"Контекст: {ctx}\nПовідомлення: {message}"
    resp = await llm_respond(CAREER_SYSTEM, prompt) or "Кар'єрний ріст — це марафон, не спринт."
    return resp, updates
