import re

from llm.client import llm_respond
from llm.prompts import PRODUCTIVITY_SYSTEM
from graph.queries import (
    add_task,
    get_tasks,
    update_task_status,
    add_project,
    get_projects,
    add_pomodoro,
    get_pomodoros_today,
)

_ADD_TASK_KW = [
    "додай задач", "нова задач", "задача:", "завдання:", "треба зробити",
    "add task", "new task", "todo:", "нагадай", "запиши задач",
]
_DONE_TASK_KW = [
    "виконав задач", "зробив задач", "готово:", "завершив",
    "task done", "completed task", "done:",
]
_POMODORO_KW = [
    "pomodoro", "помодоро", "таймер", "починаю", "фокус", "почав", "почала",
    "start timer", "focus session",
]
_LIST_KW = [
    "список задач", "мої задачі", "що маю зробити", "tasks", "list tasks", "покажи задачі",
]
_FREE_TIME_KW = [
    "є вільний час", "вільний час", "що робити", "чим зайнятися",
    "скучно", "що мені зробити", "порадь що робити", "нічого не роблю",
    "немає чим зайнятися", "що можна зробити", "з чого почати",
    "free time", "what should i do", "bored",
]

_PRODUCTIVITY_KW = (
    _ADD_TASK_KW + _DONE_TASK_KW + _POMODORO_KW + _LIST_KW + _FREE_TIME_KW + [
        "задач", "завдан", "проект", "дедлайн", "пріоритет",
        "task", "project", "deadline", "priority", "productivity",
        "продуктив", "зробити", "план на день",
    ]
)


def is_productivity_message(text: str) -> bool:
    t = text.lower()
    return any(kw in t for kw in _PRODUCTIVITY_KW)


def _parse_priority(text: str) -> int:
    t = text.lower()
    if any(w in t for w in ["терміново", "urgent", "критич", "critical", "дуже важлив"]):
        return 5
    if any(w in t for w in ["важлив", "important", "high", "висок"]):
        return 4
    if any(w in t for w in ["низьк", "low", "потім", "колись"]):
        return 2
    return 3


def _extract_task_title(message: str) -> str:
    """Extract task title after trigger keywords."""
    triggers = [
        "додай задачу", "нова задача", "задача:", "завдання:", "треба зробити",
        "add task", "new task", "todo:", "запиши задачу",
    ]
    text = message.strip()
    for trigger in triggers:
        if trigger in text.lower():
            idx = text.lower().find(trigger) + len(trigger)
            title = text[idx:].strip(" :—-")
            if title:
                return title
    # Fallback: entire message as title
    return text[:120]


async def process(message: str, user_id: str, context: dict = None) -> tuple[str, list]:
    ctx = context or {}
    productivity_ctx = ctx.get("productivity", {})
    text = message.lower()

    # --- Add a task ---
    if any(kw in text for kw in _ADD_TASK_KW):
        title = _extract_task_title(message)
        priority = _parse_priority(message)

        due_match = re.search(r"до\s+([\d\.\-]+)|deadline\s+([\d\.\-]+)", text)
        due_date = (due_match.group(1) or due_match.group(2) or "").strip() if due_match else ""

        task_id = add_task(user_id, title=title, priority=priority, due_date=due_date)
        priority_label = {5: "критичний", 4: "високий", 3: "середній", 2: "низький"}.get(priority, "середній")
        response = f"Задачу додано: «{title}» (пріоритет: {priority_label})."
        if due_date:
            response += f" Дедлайн: {due_date}."
        return response, []

    # --- Mark task done ---
    if any(kw in text for kw in _DONE_TASK_KW):
        tasks = get_tasks(user_id, status="active")
        if not tasks:
            return "Активних задач немає.", []

        # Try to find a matching task by keywords in message
        matched = None
        for t in tasks:
            if any(w in text for w in t["title"].lower().split()):
                matched = t
                break
        if not matched:
            matched = tasks[0]  # Fallback: most recent high-priority

        update_task_status(matched["id"], "done")
        response = f"Задача «{matched['title']}» виконана! ✅"
        remaining = len(tasks) - 1
        if remaining > 0:
            response += f" Залишилось активних: {remaining}."
        return response, []

    # --- List tasks ---
    if any(kw in text for kw in _LIST_KW):
        tasks = get_tasks(user_id, status="active")
        if not tasks:
            return "Активних задач немає. Додай першу: «задача: назва»", []
        lines = []
        for i, t in enumerate(tasks[:10], 1):
            priority_icon = "🔴" if t["priority"] >= 4 else "🟡" if t["priority"] == 3 else "🟢"
            due = f" (до {t['due_date']})" if t.get("due_date") else ""
            lines.append(f"{i}. {priority_icon} {t['title']}{due}")
        response = "Твої задачі:\n" + "\n".join(lines)
        return response, []

    # --- Pomodoro ---
    if any(kw in text for kw in _POMODORO_KW):
        dur_match = re.search(r"(\d+)\s*(хв|хвилин|min)", text)
        duration = int(dur_match.group(1)) if dur_match else 25

        pomodoro_id = add_pomodoro(user_id, duration=duration, completed=False)
        today_sessions = get_pomodoros_today(user_id)
        count = len(today_sessions)

        response = (
            f"Таймер {duration} хв запущено! 🍅 "
            f"Сьогодні вже {count} {'помодоро' if count == 1 else 'помодоро'}. "
            "Позбудься відволікань і фокусуйся!"
        )
        return response, []

    # --- Free time → show priority tasks + suggest pomodoro ---
    if any(kw in text for kw in _FREE_TIME_KW):
        tasks = get_tasks(user_id, status="active")
        if tasks:
            sorted_tasks = sorted(tasks, key=lambda t: t.get("priority", 3), reverse=True)
            top = sorted_tasks[:3]
            lines = []
            for t in top:
                p_icon = "🔴" if t.get("priority", 3) >= 4 else "🟡" if t.get("priority", 3) == 3 else "🟢"
                due = f" (до {t['due_date']})" if t.get("due_date") else ""
                lines.append(f"{p_icon} «{t['title']}»{due}")
            return (
                f"Є {len(tasks)} задач! Ось найважливіші:\n"
                + "\n".join(lines)
                + f"\n\nПочни з першої — напиши «починаю 25 хв» і я запущу таймер!"
            ), []
        return (
            "Активних задач немає — ідеальний момент щось запланувати!\n"
            "• Додай задачу: «задача: назва»\n"
            "• Або просто напиши «починаю 25 хв» для вільного помодоро"
        ), []

    # --- General productivity question ---
    active_tasks = productivity_ctx.get("active_tasks", 0)
    pomodoros = productivity_ctx.get("pomodoros_today", 0)
    focus_min = productivity_ctx.get("focus_minutes_today", 0)

    ctx_line = f"Активних задач: {active_tasks}. Сьогодні помодоро: {pomodoros} ({focus_min} хв фокусу)."
    prompt = f"Productivity context: {ctx_line}\nUser: {message}"

    response = await llm_respond(PRODUCTIVITY_SYSTEM, prompt)
    if not response:
        response = (
            "Можу допомогти з:\n"
            "• Додати задачу: «задача: назва задачі»\n"
            "• Переглянути задачі: «список задач»\n"
            "• Запустити таймер: «поморodo 25 хв» або «починаю»\n"
            "• Позначити виконаною: «виконав задачу назва»"
        )
    return response, []
