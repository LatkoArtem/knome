import re
from graph.queries import add_checkin, add_food_entry, get_recent_checkins

_CHECKIN_KW = ["спав", "спала", "настрій", "самопочуття", "слept", "mood", "check-in", "чекін"]
_FOOD_KW = ["з'їв", "з'їла", "поїв", "поїла", "ate", "food", "їжа:", "з'їм"]
_SUMMARY_KW = ["здоров", "самопочуття", "настрій", "health", "how am i", "check-in", "статус"]


def _parse_sleep(text: str) -> float:
    m = re.search(r"(\d+(?:[.,]\d+)?)\s*(годин|год\b|h\b|г\b)", text)
    if m:
        val = float(m.group(1).replace(",", "."))
        return val
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


def process(user_message: str, user_id: str) -> tuple[str, list]:
    text = user_message.lower()

    # Food entry
    if any(w in text for w in _FOOD_KW):
        food_name = _parse_food_name(text)
        if food_name:
            add_food_entry(user_id, food_name)
            return f"Записав їжу: {food_name}. Харчування оновлено!", []
        return "Що їв? Наприклад: «З'їв гречку з куркою»", []

    # Check-in
    if any(w in text for w in _CHECKIN_KW):
        sleep = _parse_sleep(text)
        mood = _parse_score(text, ["настрій", "mood"])
        energy = _parse_score(text, ["енергія", "energy"])

        if sleep == 0.0 and mood == 5 and energy == 5:
            return (
                "Розкажи більше! Наприклад:\n"
                "«Спав 7 годин, настрій 8, енергія 7»"
            ), []

        add_checkin(user_id, sleep, mood, energy, text)

        parts = []
        if sleep:
            advice = " (замало!)" if sleep < 6 else ""
            parts.append(f"Сон: {sleep}г{advice}")
        parts.append(f"Настрій: {mood}/10")
        parts.append(f"Енергія: {energy}/10")

        emoji = "❤️" if mood >= 7 else "😐" if mood >= 5 else "💙"
        return f"Check-in записано! {emoji}\n" + " | ".join(parts), []

    # Summary
    if any(w in text for w in _SUMMARY_KW):
        checkins = get_recent_checkins(user_id, limit=7)
        if not checkins:
            return "Check-in ще не записувався. Спробуй: «Спав 7 годин, настрій 8»", []
        avg_mood = sum(c["mood"] for c in checkins) / len(checkins)
        avg_sleep = sum(c["sleep_hours"] for c in checkins) / len(checkins)
        return (
            f"Здоров'я за тиждень:\n"
            f"• Середній настрій: {avg_mood:.1f}/10\n"
            f"• Середній сон: {avg_sleep:.1f}г\n"
            f"• Check-in записів: {len(checkins)}"
        ), []

    return (
        "Розкажи про здоров'я! Наприклад:\n"
        "• «Спав 7 годин, настрій 8, енергія 7»\n"
        "• «З'їв гречку»\n"
        "• «Яке моє самопочуття?»"
    ), []
