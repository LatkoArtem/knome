from __future__ import annotations
import re
from datetime import date, timedelta
from graph import queries as q
from llm.client import llm_respond
from llm.prompts import GENERAL_SYSTEM

_CLEANING_KW  = {"прибрати", "прибирання", "помити посуд", "пилосос", "прання", "прати", "помити підлогу",
                 "підмести", "clean", "cleaning"}
_SHOPPING_KW  = {"купити", "список покупок", "покупки", "shopping list", "в магазин", "до магазину"}
_MEAL_KW      = {"що приготувати", "меню", "страва", "обід", "вечеря", "сніданок", "meal plan"}
_LIST_TASKS_KW = {"домашні справи", "household tasks", "що треба вдома", "що ще треба зробити вдома",
                  "список домашніх"}


def _extract_item(text: str, keywords: set) -> str:
    low = text.lower()
    for kw in sorted(keywords, key=len, reverse=True):
        if kw in low:
            idx = low.index(kw) + len(kw)
            item = text[idx:].strip().lstrip(":,- ")
            if item:
                return item[:80]
    return ""


async def process(message: str, user_id: str, context: dict) -> tuple[str, list]:
    low = message.lower()
    updates: list[dict] = []

    # Shopping list
    if any(k in low for k in _SHOPPING_KW):
        item_name = _extract_item(message, _SHOPPING_KW)
        if item_name and len(item_name) > 2 and item_name not in {"магазин", "покупки", "список"}:
            sid = q.add_shopping_item(user_id, item_name, category="general")
            updates.append({"type": "shopping_item_added", "name": item_name})
            return f"Додав до списку покупок: «{item_name}» 🛒", updates

        # Show current shopping list
        items = q.get_shopping_items(user_id)
        pending = [i for i in items if not i.get("is_bought")]
        if pending:
            lines = "\n".join(f"• {i['name']}" + (f" ({i['quantity']})" if i.get("quantity") else "") for i in pending[:10])
            return f"Список покупок ({len(pending)} товарів):\n{lines}", updates
        return "Список покупок порожній. Що додати? Напиши «купити молоко» і я запам'ятаю.", updates

    # Cleaning task
    if any(k in low for k in _CLEANING_KW):
        task_name = _extract_item(message, _CLEANING_KW)
        # Clean up extracted name — strip irrelevant trailing text
        if task_name:
            task_name = task_name.split(",")[0].split(".")[0].strip()
        if not task_name or task_name.lower() in {"вдома", "дома", "квартиру", "давно не робив", "давно не робила"}:
            task_name = "Прибирання вдома"

        # Check when last cleaning was done
        tasks = q.get_home_tasks(user_id)
        cleaning_tasks = [t for t in tasks if "приб" in t.get("name", "").lower() or "clean" in t.get("name", "").lower()]

        if cleaning_tasks:
            last = cleaning_tasks[0]
            last_done = last.get("last_done", "")
            if last_done:
                days_ago = (date.today() - date.fromisoformat(last_done)).days
                note = f" (востаннє {days_ago} дн. тому)" if days_ago else ""
                return f"Прибирання вже є у плані{note} ✅\nЯкщо хочеш зафіксувати виконання — напиши «зробив прибирання»", updates

        tid = q.add_home_task(user_id, task_name, category="cleaning", frequency="weekly")
        updates.append({"type": "home_task_added", "name": task_name})
        return f"Задачу «{task_name}» додано до домашніх справ 🏠\nКоли зробиш — напиши «зробив {task_name.lower()}»", updates

    # Meal planning
    if any(k in low for k in _MEAL_KW):
        prompt = f"Порадь що приготувати (здорова, проста їжа). Повідомлення: {message}"
        resp = await llm_respond(GENERAL_SYSTEM, prompt)
        return resp or "Пропоную: курка з рисом, суп або омлет — класика, яка завжди рятує 🍳", updates

    # List home tasks
    if any(k in low for k in _LIST_TASKS_KW):
        tasks = q.get_home_tasks(user_id)
        if tasks:
            today = date.today().isoformat()
            overdue = [t for t in tasks if t.get("next_due", "9999") <= today]
            lines = "\n".join(f"• {t['name']}" + (" ⏰ прострочено!" if t in overdue else "") for t in tasks[:8])
            return f"Домашні справи ({len(tasks)}):\n{lines}", updates
        return "Домашніх задач немає. Додай першу — наприклад «треба прибрати»", updates

    # Generic home message — respond contextually
    tasks = q.get_home_tasks(user_id)
    today = date.today().isoformat()
    overdue_tasks = [t for t in tasks if t.get("next_due", "9999") <= today]
    ctx = f"Домашніх справ: {len(tasks)}"
    if overdue_tasks:
        ctx += f"; прострочених: {len(overdue_tasks)}"
    prompt = f"Контекст: {ctx}\nДопоможи з домашніми справами. Повідомлення: {message}"
    resp = await llm_respond(GENERAL_SYSTEM, prompt)
    fallback = (
        f"Тримай дім в порядку 🏠 У тебе {len(tasks)} домашніх задач.\n"
        "Скажи що треба зробити — наприклад «треба прибрати» або «купити хліб» — і я запишу."
    )
    return resp or fallback, updates
