from __future__ import annotations
from graph import queries as q
from llm.client import llm_respond
from llm.prompts import GOALS_SYSTEM

_ADD_GOAL_KW   = {"ціль", "мета", "life goal", "додати ціль", "хочу досягти", "поставив ціль"}
_BUCKET_KW     = {"bucket list", "бакет", "список мрій", "хочу зробити", "мрію", "до смерті"}
_COMPLETE_KW   = {"виконав", "виконала", "зробив", "зробила", "досяг", "досягла", "completed"}
_LIST_KW       = {"мої цілі", "my goals", "список цілей", "мої мрії", "bucket list мій"}


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

    if any(k in low for k in _BUCKET_KW):
        title = message[:100].strip()
        bid = q.add_bucket_item(user_id, title, "adventure")
        updates.append({"type": "bucket_item_added", "id": bid})
        return "Додано до bucket list — мрій більше!", updates

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
