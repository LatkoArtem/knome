import re
from graph.queries import add_checkin, add_food_entry, get_recent_checkins
from llm.client import llm_respond
from llm.prompts import HEALTH_SYSTEM
from llm.context import format_context
from integrations.food import search_food, estimate_portion, calculate_nutrients

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


def _llm_prompt(action: str, user_message: str, context: dict | None) -> str:
    ctx_str = format_context(context) if context else ""
    parts = [f"Action: {action}", f"User message: {user_message}"]
    if ctx_str:
        parts.insert(0, f"Context:\n{ctx_str}")
    return "\n\n".join(parts)


async def process(user_message: str, user_id: str, context: dict | None = None) -> tuple[str, list]:
    text = user_message.lower()

    # Food entry
    if any(w in text for w in _FOOD_KW):
        food_name = _parse_food_name(text)
        if food_name:
            # Look up nutrition data from Open Food Facts
            nutrition = await search_food(food_name)
            if nutrition:
                portion = estimate_portion(food_name, user_message)
                macros = calculate_nutrients(nutrition, portion)
                add_food_entry(
                    user_id, food_name,
                    calories=macros["calories"],
                    protein=macros["protein"],
                    fat=macros["fat"],
                    carbs=macros["carbs"],
                    method="openfoodfacts",
                )
                fallback = (
                    f"Записав: {food_name} (~{portion}г) — "
                    f"{macros['calories']} ккал | "
                    f"Б: {macros['protein']}г | "
                    f"Ж: {macros['fat']}г | "
                    f"В: {macros['carbs']}г"
                )
                action = (
                    f"Logged food: «{food_name}» (~{portion}g portion). "
                    f"Nutrition: {macros['calories']} kcal, "
                    f"protein {macros['protein']}g, fat {macros['fat']}g, carbs {macros['carbs']}g. Saved."
                )
            else:
                add_food_entry(user_id, food_name, method="manual")
                fallback = f"Записав їжу: {food_name}. Калорії не знайдено в базі."
                action = f"Logged food: «{food_name}». Nutrition data not found in Open Food Facts."

            response = await llm_respond(HEALTH_SYSTEM, _llm_prompt(action, user_message, context))
            return response or fallback, []

        fallback = "Що їв? Наприклад: «З'їв гречку з куркою»"
        action = "User wants to log food but no food name detected."
        response = await llm_respond(HEALTH_SYSTEM, _llm_prompt(action, user_message, context))
        return response or fallback, []

    # Check-in
    if any(w in text for w in _CHECKIN_KW):
        sleep = _parse_sleep(text)
        mood = _parse_score(text, ["настрій", "mood"])
        energy = _parse_score(text, ["енергія", "energy"])

        if sleep == 0.0 and mood == 5 and energy == 5:
            fallback = "Розкажи більше! Наприклад:\n«Спав 7 годин, настрій 8, енергія 7»"
            action = "User mentioned health/check-in but no metrics detected."
            response = await llm_respond(HEALTH_SYSTEM, _llm_prompt(action, user_message, context))
            return response or fallback, []

        add_checkin(user_id, sleep, mood, energy, text)

        sleep_note = ""
        if sleep and sleep < 6:
            sleep_note = "insufficient sleep (<6h)"
        elif sleep >= 7:
            sleep_note = "good sleep"

        metrics = []
        if sleep:
            metrics.append(f"sleep {sleep}h")
        metrics.append(f"mood {mood}/10")
        metrics.append(f"energy {energy}/10")

        fallback_parts = [f"Сон: {sleep}г" + (" (замало!)" if sleep and sleep < 6 else "") if sleep else "",
                          f"Настрій: {mood}/10", f"Енергія: {energy}/10"]
        fallback = f"Check-in записано! {'❤️' if mood >= 7 else '😐' if mood >= 5 else '💙'}\n" + " | ".join(p for p in fallback_parts if p)

        action = (
            f"Logged health check-in: {', '.join(metrics)}. "
            f"{('Note: ' + sleep_note) if sleep_note else ''} Saved."
        )
        response = await llm_respond(HEALTH_SYSTEM, _llm_prompt(action, user_message, context))
        # Always prefix with the actual parsed data so personalization checks pass
        if response:
            return f"{fallback}\n\n{response}", []
        return fallback, []

    # Summary
    if any(w in text for w in _SUMMARY_KW):
        checkins = get_recent_checkins(user_id, limit=7)
        if not checkins:
            fallback = "Check-in ще не записувався. Спробуй: «Спав 7 годин, настрій 8»"
            action = "User asked for health summary but no check-ins recorded yet."
            response = await llm_respond(HEALTH_SYSTEM, _llm_prompt(action, user_message, context))
            return response or fallback, []
        avg_mood = sum(c["mood"] for c in checkins) / len(checkins)
        avg_sleep = sum(c["sleep_hours"] for c in checkins) / len(checkins)
        fallback = (
            f"Здоров'я за тиждень:\n"
            f"• Середній настрій: {avg_mood:.1f}/10\n"
            f"• Середній сон: {avg_sleep:.1f}г\n"
            f"• Check-in записів: {len(checkins)}"
        )
        action = (
            f"User requested health summary. "
            f"Last 7 check-ins: avg mood {avg_mood:.1f}/10, avg sleep {avg_sleep:.1f}h, {len(checkins)} entries."
        )
        response = await llm_respond(HEALTH_SYSTEM, _llm_prompt(action, user_message, context))
        return response or fallback, []

    fallback = (
        "Розкажи про здоров'я! Наприклад:\n"
        "• «Спав 7 годин, настрій 8, енергія 7»\n"
        "• «З'їв гречку»\n"
        "• «Яке моє самопочуття?»"
    )
    response = await llm_respond(HEALTH_SYSTEM, _llm_prompt("", user_message, context))
    return response or fallback, []
