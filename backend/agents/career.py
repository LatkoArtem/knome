from __future__ import annotations
import re
import uuid
from datetime import date
from graph import queries as q
from llm.client import llm_respond
from llm.prompts import CAREER_SYSTEM

_SKILL_KW       = {"навичка", "скіл", "skill", "вміння", "додати навичку", "вивчив", "освоїв"}
_ACHIEVEMENT_KW = {"досягнення", "achievement", "виконав", "зробив", "реалізував", "запустив", "закінчив"}
_JOB_KW         = {"вакансі", "вакансію", "заявку", "подав заявку", "job application", "applied for"}
_LIST_KW        = {"мої навички", "my skills", "список навичок", "мої досягнення", "my achievements",
                   "мої заявки", "my applications", "список заявок"}


def _parse_job_application(text: str) -> tuple[str, str, str]:
    """Extract company, position, salary from job application message."""
    # Try to find company name (after "в компанії", "в", "at", "до")
    company = ""
    for pattern in [r"в компанії\s+([A-Za-zА-Яа-яІіЄєЇїҐґ\w\s]+?)(?:,|$|\.|зарплата|salary)",
                    r"\bat\s+([A-Za-z\w\s]+?)(?:,|$|\.|salary)",
                    r"до\s+([A-Za-zА-Яа-яІіЄєЇїҐґ\w]+)"]:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            company = m.group(1).strip()
            break

    # Try to find position (after "на вакансію", "на посаду", "position")
    position = ""
    for pattern in [r"(?:на вакансію|на посаду|position[:\s]+)\s*([A-Za-zА-Яа-яІіЄєЇїҐґ\s]+?)(?:\s+в|\s+до|,|$)",
                    r"(?:заявку на|applied for)\s+([A-Za-z\s]+?)(?:\s+at|\s+в|,|$)"]:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            position = m.group(1).strip()
            break

    # Try salary
    salary = ""
    m = re.search(r"(?:зарплата|salary|зп)[:\s]*(\d[\d\s$€₴]*(?:usd|грн|uah|€|\$)?)", text, re.IGNORECASE)
    if m:
        salary = m.group(1).strip()

    return company or "Невідома компанія", position or "Невідома позиція", salary


async def process(message: str, user_id: str, context: dict) -> tuple[str, list]:
    low = message.lower()
    updates: list[dict] = []

    if any(k in low for k in _LIST_KW):
        if "заявк" in low or "application" in low:
            jobs = q.get_job_applications(user_id)
            if jobs:
                lines = [f"• {j['position']} @ {j['company']} [{j['status']}]" for j in jobs[:5]]
                return "Твої заявки на вакансії:\n" + "\n".join(lines), updates
            return "Заявок ще немає.", updates
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

    if any(k in low for k in _JOB_KW):
        company, position, salary = _parse_job_application(message)
        jid = q.add_job_application(user_id, company, position, salary, message)
        updates.append({"type": "job_application_added", "id": jid})
        salary_str = f" (зарплата: {salary})" if salary else ""
        return f"Заявку на вакансію записано! 💪\n{position} @ {company}{salary_str}\nТримаємо кулаки!", updates

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
