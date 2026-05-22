import re
from graph.queries import add_checkin, add_food_entry, get_recent_checkins
from llm.client import llm_respond
from llm.prompts import HEALTH_SYSTEM

_CHECKIN_KW = ["спав", "спала", "настрій", "самопочуття", "слept", "mood", "check-in", "чекін"]
_FOOD_KW = ["з'їв", "з'їла", "поїв", "поїла", "ate", "food", "їжа:", "з'їм"]
_SUMMARY_KW = ["здоров", "самопочуття", "настрій", "health", "how am i", "check-in", "статус"]


def _parse_sleep(text: str) -> float:
    m = re.search(r"(\d+(?:[.,]\d+)?)\s*(годин|год\b|h\b|г\b)", text)
    if m:
        return float(m.group(1).replace(",", "."))
    return 0.0


def _parse_score(text: str, keywords: list[str]) -> int:
    for kw in keywords:
        if kw in text:
            m = re.search(rf"{kw}[\s:]+(\d+)", text)
            if m:
                return min(10, max(1, int(m.group(1))))
    m = re.search(r"(\d+)\s*/\s*10", text)
    if m:
        return min(10, max(1, int(m.group(1))))
    return 5


def _parse_food_name(text: str) -> str:
    for kw in ["з'їв", "з'їла", "поїв", "поїла", "ate", "їжа:"]:
        if kw in text:
            idx = text.index(kw) + len(kw)
            return text[idx:].strip().rstrip(",.!?")
    return text.strip()


async def process(user_message: str, user_id: str) -> tuple[str, list]:
    text = user_message.lower()

    # Food entry
    if any(w in text for w in _FOOD_KW):
        food_name = _parse_food_name(text)
        if food_name:
            add_food_entry(user_id, food_name)
            fallback = f"Записав їжу: {food_name}. Харчування оновлено!"
            ctx = f"User logged food entry: «{food_name}». Saved to nutrition log."
            response = await llm_respond(HEALTH_SYSTEM, f"{ctx}\n\nUser message: {user_message}")
            return response or fallback, []
        fallback = "Що їв? Наприклад: «З'їв гречку з куркою»"
        response = await llm_respond(HEALTH_SYSTEM, f"User wants to log food but didn't specify what.\n\nUser message: {user_message}")
        return response or fallback, []

    # Check-in
    if any(w in text for w in _CHECKIN_KW):
        sleep = _parse_sleep(text)
        mood = _parse_score(text, ["настрій", "mood"])
        energy = _parse_score(text, ["енергія", "energy"])

        if sleep == 0.0 and mood == 5 and energy == 5:
            fallback = "Розкажи більше! Наприклад:\n«Спав 7 годин, настрій 8, енергія 7»"
            response = await llm_respond(HEALTH_SYSTEM, f"User mentioned health/sleep but provided no specific metrics.\n\nUser message: {user_message}")
            return response or fallback, []

        add_checkin(user_id, sleep, mood, energy, text)

        parts = []
        if sleep:
            advice = " (замало!)" if sleep < 6 else ""
            parts.append(f"sleep: {sleep}h{advice}")
        parts.append(f"mood: {mood}/10")
        parts.append(f"energy: {energy}/10")
        metrics_str = ", ".join(parts)

        sleep_note = "insufficient sleep (<6h)" if sleep and sleep < 6 else ("good sleep" if sleep >= 7 else "")
        fallback = f"Check-in записано! {'❤️' if mood >= 7 else '😐' if mood >= 5 else '💙'}\n" + " | ".join(
            [f"Сон: {sleep}г" + (" (замало!)" if sleep < 6 else "") if sleep else "",
             f"Настрій: {mood}/10", f"Енергія: {energy}/10"]
        ).strip(" |")

        ctx = (
            f"User logged health check-in: {metrics_str}. "
            f"{'Note: ' + sleep_note if sleep_note else ''} Saved to health log."
        )
        response = await llm_respond(HEALTH_SYSTEM, f"{ctx}\n\nUser message: {user_message}")
        return response or fallback, []

    # Summary
    if any(w in text for w in _SUMMARY_KW):
        checkins = get_recent_checkins(user_id, limit=7)
        if not checkins:
            fallback = "Check-in ще не записувався. Спробуй: «Спав 7 годин, настрій 8»"
            response = await llm_respond(HEALTH_SYSTEM, f"User asked for health summary but no check-ins recorded yet.\n\nUser message: {user_message}")
            return response or fallback, []
        avg_mood = sum(c["mood"] for c in checkins) / len(checkins)
        avg_sleep = sum(c["sleep_hours"] for c in checkins) / len(checkins)
        fallback = (
            f"Здоров'я за тиждень:\n"
            f"• Середній настрій: {avg_mood:.1f}/10\n"
            f"• Середній сон: {avg_sleep:.1f}г\n"
            f"• Check-in записів: {len(checkins)}"
        )
        ctx = (
            f"User asked for health summary.\n"
            f"Last 7 check-ins: avg mood {avg_mood:.1f}/10, avg sleep {avg_sleep:.1f}h, {len(checkins)} entries."
        )
        response = await llm_respond(HEALTH_SYSTEM, f"{ctx}\n\nUser message: {user_message}")
        return response or fallback, []

    fallback = (
        "Розкажи про здоров'я! Наприклад:\n"
        "• «Спав 7 годин, настрій 8, енергія 7»\n"
        "• «З'їв гречку»\n"
        "• «Яке моє самопочуття?»"
    )
    response = await llm_respond(HEALTH_SYSTEM, f"User message: {user_message}")
    return response or fallback, []
