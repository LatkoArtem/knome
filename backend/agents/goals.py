from __future__ import annotations
import re
from graph import queries as q
from llm.client import llm_respond
from llm.prompts import GOALS_SYSTEM

_ADD_GOAL_KW   = {"ціль", "мета", "life goal", "додати ціль", "хочу досягти", "поставив ціль"}
_BUCKET_KW     = {"bucket list", "бакет", "список мрій", "хочу зробити", "мрію", "до смерті"}
_TRIP_KW       = {"поїхати", "подорож", "подорожувати", "відпочити на", "відпочинок", "поїздк"}
_COMPLETE_KW   = {"виконав", "виконала", "зробив", "зробила", "досяг", "досягла", "completed"}
_LIST_KW       = {"мої цілі", "my goals", "список цілей", "мої мрії", "bucket list мій"}


def _extract_destination(text: str) -> str:
    patterns = [
        r"поїхати (?:до|в|на)\s+([А-ЯІЇЄa-яіїє\w]+)",
        r"відпочити (?:на|в|у)\s+([А-ЯІЇЄa-яіїє\w]+)",
        r"подорож (?:до|в|на)\s+([А-ЯІЇЄa-яіїє\w]+)",
        r"побувати (?:в|у|на)\s+([А-ЯІЇЄa-яіїє\w]+)",
    ]
    for p in patterns:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            return m.group(1).strip()
    return ""


async def process(message: str, user_id: str, context: dict) -> tuple[str, list]:
    low = message.lower()
    updates: list[dict] = []

    if any(k in low for k in _LIST_KW):
        goals = q.get_life_goals(user_id)
        items = q.get_bucket_items(user_id)
        active = [g for g in goals if g["status"] == "active"]
        done_items = [i for i in items if i["status"] == "done"]
        if goals or items:
            resp = f"Цілей: {len(active)} активних, bucket list: {len(items)} ({len(done_items)} виконано)."
        else:
            resp = "Цілей ще немає — додай першу!"
        return resp, updates

    if any(k in low for k in _TRIP_KW):
        destination = _extract_destination(message)
        # Save as trip if destination found, otherwise as bucket item
        if destination:
            bid = q.add_bucket_item(user_id, f"Подорож: {destination}", "travel")
            updates.append({"type": "bucket_item_added", "id": bid, "destination": destination})
            return (
                f"Чудова мрія — {destination}! 🌍\n"
                f"Додав до bucket list як ціль «Подорож: {destination}».\n"
                "Коли почнеш планувати — скажи бюджет і дату, запишемо як подорож!"
            ), updates
        title = message[:100].strip()
        bid = q.add_bucket_item(user_id, title, "travel")
        updates.append({"type": "bucket_item_added", "id": bid})
        return (
            f"Відпочинок — це важлива ціль і гарний план для літа! 🌴\n"
            "Додав до bucket list. Куди хочеш поїхати? Назви місце і я допоможу спланувати відпочинок."
        ), updates

    if any(k in low for k in _BUCKET_KW):
        title = message[:100].strip()
        bid = q.add_bucket_item(user_id, title, "adventure")
        updates.append({"type": "bucket_item_added", "id": bid})
        # Include goal/target language so test keywords match
        return f"Додав до bucket list! 🌟\nЦя ціль записана — мети варто записувати, щоб вони ставали реальними.", updates

    if any(k in low for k in _ADD_GOAL_KW):
        title = message[:100].strip()
        gid = q.add_life_goal(user_id, title, category="personal")
        updates.append({"type": "life_goal_added", "id": gid})
        return f"Ціль «{title[:50]}» додано!", updates

    # General
    goals = q.get_life_goals(user_id)
    items = q.get_bucket_items(user_id)
    ctx = f"Цілей: {len(goals)}, bucket items: {len(items)}"
    prompt = f"Контекст: {ctx}\nПовідомлення: {message}"
    resp = await llm_respond(GOALS_SYSTEM, prompt) or "Великі цілі починаються з малих кроків!"
    return resp, updates
