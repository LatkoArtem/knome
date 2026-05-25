from typing import TypedDict
from langgraph.graph import StateGraph, START, END

import agents.learning as learning_agent
import agents.financial as financial_agent
import agents.health as health_agent
import agents.workout as workout_agent
import agents.productivity as productivity_agent
import agents.reflection as reflection_agent
import agents.relationships as relationships_agent
import agents.career as career_agent
import agents.goals as goals_agent
import agents.home as home_agent
from graph.queries import commit_updates, get_user_context
from llm.client import llm_respond
from llm.prompts import GENERAL_SYSTEM
from llm.context import format_context


class KnomeState(TypedDict):
    user_id: str
    user_message: str
    domain: str
    graph_context: dict
    response: str
    graph_updates: list


_LEARNING_KW = [
    "навч", "вивч", "урок", "курс", "learn", "study", "topic", "skill",
    "книг", "позаймав", "читав", "прогрес навч", "вчив", "що я вчив",
    "хочу вчитися", "хочу повчитися", "що вчити", "що повторити",
    "хочу навчатися", "хочу позайматися",
]
_FINANCE_KW = [
    "витрат", "куп", "заплат", "гроші", "бюджет", "транзакц",
    "spent", "paid", "money", "budget", "finance", "грн", "uah", "usd", "$",
]
_HEALTH_KW = [
    "спав", "спала", "сон", "настрій", "їжа", "з'їв", "здоров",
    "самопочуття", "check-in", "чекін", "sleep", "mood", "food", "health", "ate",
    "стомл", "втомл", "виснаж", "немає сил", "нема сил",
    "не по собі", "погано себе", "погано мені", "голова болить",
    "нікудишній", "поганий настрій", "жахливий настрій",
]
_WORKOUT_KW = [
    "тренув", "потренувавс", "потренувалас", "вправ", "підхід",
    "жим", "присід", "підтяг", "станова", "гантел", "штанг",
    "gym", "workout", "exercise", "bench", "squat", "deadlift", "фітнес",
    "програм трен", "план трен", "футбол", "витривалість", "тонус",
    "тричі на тиждень", "двічі на тиждень", "рівень середній",
    "рівень початківець", "рівень просунутий", "домашній зал",
    "йду в зал", "іду в зал", "йду на тренування", "іду на тренування",
    "збираюся тренуватись", "час тренуватися", "пора тренуватися",
    "йду качатися", "іду качатися",
    "порухатись", "порухатися", "рухатись", "рухатися",
    "займатися спортом", "пробіжк", "пробігтись", "пробігтися",
    "зарядк", "спортзал", "фізичні вправи", "трохи порухатись",
]
_PRODUCTIVITY_KW = [
    "задач", "завдан", "проект", "дедлайн", "pomodoro", "помодоро",
    "таймер фокус", "task", "todo", "список задач", "план на день",
    "треба зробити", "починаю фокус", "є вільний час", "вільний час",
    "що робити", "чим зайнятися", "скучно", "з чого почати",
]
_REFLECTION_KW = [
    "щоденник", "journal", "записати думки", "вдячний", "вдячна",
    "gratitude", "тижневий огляд", "weekly review", "рефлекс",
    "підсумок тижня", "3 речі", "нотатка",
    "вдячний", "вдячна",  # double weight — gratitude beats learning tie
    "вдалий день", "все склалось", "чудовий день", "прекрасний день",
    "хороший день", "добрий день сьогодні",
]
_RELATIONSHIPS_KW = [
    "контакт", "contact", "знайомий", "друг", "подруга", "день народження",
    "birthday", "crm", "люди", "relationships", "познайомився", "познайомилась",
]
_CAREER_KW = [
    "навичка", "скіл", "skill", "досягнення", "achievement", "кар'єра",
    "career", "резюме", "resume", "портфоліо", "portfolio", "cv",
    "вакансі", "заявку", "job application", "подав заявку",
    "змінити роботу", "нова робота", "шукаю роботу", "знайти роботу",
    "пошук роботи", "нова посада", "змінити місце роботи",
]
_GOALS_KW = [
    "ціль", "мета", "bucket list", "бакет ліст", "мрія", "мрію",
    "life goal", "хочу досягти", "хочу зробити", "список мрій", "досягти",
    "поїхати", "подорож", "подорожувати", "відпочити на", "відпочинок",
]
_HOME_KW = [
    "прибрати", "прибирання", "помити посуд", "пилосос", "прання",
    "квартира", "покупки", "список покупок", "купити хліб", "купити молоко",
    "що приготувати", "меню на тиждень", "господарство", "домашні справи",
    "ремонт", "вдома треба", "дома треба",
]


def _classify_domain(text: str) -> str:
    text_lower = text.lower()
    scores = {
        "learning": sum(1 for w in _LEARNING_KW if w in text_lower),
        "finance": sum(1 for w in _FINANCE_KW if w in text_lower),
        "health": sum(1 for w in _HEALTH_KW if w in text_lower),
        "workout": sum(1 for w in _WORKOUT_KW if w in text_lower),
        "productivity": sum(1 for w in _PRODUCTIVITY_KW if w in text_lower),
        "reflection": sum(1 for w in _REFLECTION_KW if w in text_lower),
        "relationships": sum(1 for w in _RELATIONSHIPS_KW if w in text_lower),
        "career": sum(1 for w in _CAREER_KW if w in text_lower),
        "goals": sum(1 for w in _GOALS_KW if w in text_lower),
        "home": sum(1 for w in _HOME_KW if w in text_lower),
    }
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "general"


async def classify_intent(state: KnomeState) -> dict:
    domain = _classify_domain(state["user_message"])
    ctx = get_user_context(state["user_id"])
    return {"domain": domain, "graph_context": ctx}


async def run_learning(state: KnomeState) -> dict:
    response, updates = await learning_agent.process(
        state["user_message"], state["user_id"], context=state.get("graph_context")
    )
    return {"response": response, "graph_updates": updates}


async def run_finance(state: KnomeState) -> dict:
    response, updates = await financial_agent.process(
        state["user_message"], state["user_id"], context=state.get("graph_context")
    )
    return {"response": response, "graph_updates": updates}


async def run_health(state: KnomeState) -> dict:
    response, updates = await health_agent.process(
        state["user_message"], state["user_id"], context=state.get("graph_context")
    )
    return {"response": response, "graph_updates": updates}


async def run_workout(state: KnomeState) -> dict:
    response, updates = await workout_agent.process(
        state["user_message"], state["user_id"], context=state.get("graph_context")
    )
    return {"response": response, "graph_updates": updates}


async def run_productivity(state: KnomeState) -> dict:
    response, updates = await productivity_agent.process(
        state["user_message"], state["user_id"], context=state.get("graph_context")
    )
    return {"response": response, "graph_updates": updates}


async def run_reflection(state: KnomeState) -> dict:
    response, updates = await reflection_agent.process(
        state["user_message"], state["user_id"], context=state.get("graph_context")
    )
    return {"response": response, "graph_updates": updates}


async def run_relationships(state: KnomeState) -> dict:
    response, updates = await relationships_agent.process(
        state["user_message"], state["user_id"], context=state.get("graph_context")
    )
    return {"response": response, "graph_updates": updates}


async def run_career(state: KnomeState) -> dict:
    response, updates = await career_agent.process(
        state["user_message"], state["user_id"], context=state.get("graph_context")
    )
    return {"response": response, "graph_updates": updates}


async def run_goals(state: KnomeState) -> dict:
    response, updates = await goals_agent.process(
        state["user_message"], state["user_id"], context=state.get("graph_context")
    )
    return {"response": response, "graph_updates": updates}


async def run_home(state: KnomeState) -> dict:
    response, updates = await home_agent.process(
        state["user_message"], state["user_id"], context=state.get("graph_context")
    )
    return {"response": response, "graph_updates": updates}


_WEEKLY_KW = ["загалом", "аналіз мого тижн", "тижневий", "як мої справи", "підсумок тижн", "покажи аналіз"]
_GREETING_KW = ["привіт", "хай", "hello", "hi", "доброго", "добрий ранок", "добрий вечір", "good morning", "hey"]


async def _build_proactive_context(user_id: str, user_name: str) -> str | None:
    """Build a proactive suggestion block based on what's pending across all domains."""
    from graph.queries import get_tasks, get_due_reviews, get_recent_checkins
    from datetime import date
    suggestions: list[str] = []

    try:
        tasks = get_tasks(user_id, status="active")
        high = [t for t in tasks if t.get("priority", 3) >= 4]
        if high:
            suggestions.append(f"📋 Важлива задача: «{high[0]['title']}»")
        elif tasks:
            suggestions.append(f"📋 {len(tasks)} активних задач (наприклад: «{tasks[0]['title']}»)")
    except Exception:
        pass

    try:
        due = get_due_reviews(user_id)
        if due:
            extra = f" та ще {len(due)-1}" if len(due) > 1 else ""
            suggestions.append(f"📚 Час повторити: «{due[0]['topic_name']}»{extra}")
    except Exception:
        pass

    try:
        checkins = get_recent_checkins(user_id, limit=1)
        today = date.today().isoformat()
        if not checkins or checkins[0].get("date", "") < today:
            suggestions.append("💙 Ще немає чекіну сьогодні — розкажи як себе почуваєш (сон, настрій)")
    except Exception:
        pass

    if not suggestions:
        return None
    greeting = f"{user_name}, " if user_name else ""
    return f"{greeting}ось що актуально:\n" + "\n".join(f"• {s}" for s in suggestions)


async def run_general(state: KnomeState) -> dict:
    ctx = state.get("graph_context", {})
    user_name = ctx.get("user", {}).get("name", "")
    ctx_str = format_context(ctx)
    user_message = state["user_message"]
    text_lower = user_message.lower()

    # Multi-domain weekly summary
    if any(w in text_lower for w in _WEEKLY_KW):
        from graph.queries import (
            get_recent_transactions, get_recent_checkins,
            get_learning_sessions, get_recent_workout_sessions, get_life_goals,
        )
        uid = state["user_id"]
        domain_parts: list[str] = []

        try:
            checkins = get_recent_checkins(uid, limit=7)
            if checkins:
                avg_sleep = sum(c["sleep_hours"] for c in checkins) / len(checkins)
                avg_mood = sum(c["mood"] for c in checkins) / len(checkins)
                domain_parts.append(f"Здоров'я: сон {avg_sleep:.1f}г, настрій {avg_mood:.1f}/10")
        except Exception:
            pass

        try:
            txs = get_recent_transactions(uid, limit=20)
            if txs:
                total = sum(t["amount"] for t in txs)
                domain_parts.append(f"Фінанси: витрачено {total:.0f} {txs[0]['currency']}")
        except Exception:
            pass

        try:
            sessions = get_learning_sessions(uid, limit=7)
            if sessions:
                total_min = sum(s["duration"] for s in sessions)
                domain_parts.append(f"Навчання: {total_min} хвилин ({len(sessions)} сесій)")
        except Exception:
            pass

        try:
            ws = get_recent_workout_sessions(uid, limit=7)
            if ws:
                domain_parts.append(f"Тренування: {len(ws)} сесій цього тижня")
        except Exception:
            pass

        try:
            goals = get_life_goals(uid)
            if goals:
                active = [g for g in goals if g["status"] == "active"]
                domain_parts.append(f"Цілі: {len(active)} активних")
        except Exception:
            pass

        if domain_parts:
            structured = "\n".join(f"• {p}" for p in domain_parts)
            greeting = f"{user_name}, " if user_name else ""
            prefix = f"{greeting}ось твій тижневий огляд:\n{structured}"
            llm_prompt = f"{prefix}\n\nUser: {user_message}"
            llm_response = await llm_respond(GENERAL_SYSTEM, llm_prompt)
            return {"response": prefix + (f"\n\n{llm_response}" if llm_response else ""), "graph_updates": []}

    # Proactive context for greetings only
    is_greeting = any(w in text_lower for w in _GREETING_KW)
    if is_greeting:
        proactive = await _build_proactive_context(state["user_id"], user_name)
        if proactive:
            llm_prompt = f"{proactive}\n\nUser: {user_message}"
            llm_resp = await llm_respond(GENERAL_SYSTEM, llm_prompt)
            return {"response": proactive + (f"\n\n{llm_resp}" if llm_resp else ""), "graph_updates": []}

    parts = []
    if ctx_str:
        parts.append(f"Context:\n{ctx_str}")
    parts.append(f"User message: {user_message}")
    prompt = "\n\n".join(parts)

    response = await llm_respond(GENERAL_SYSTEM, prompt)

    if not response:
        greeting = f"{user_name}, " if user_name else ""
        response = (
            f"{greeting}я можу допомогти з:\n"
            "Навчання — «позаймався Python 30 хвилин»\n"
            "Фінанси — «витратив 200 грн на каву»\n"
            "Здоров'я — «спав 7 годин, настрій 8»\n"
            "Тренування — «потренувався, жим 80кг 4×5»\n"
            "Задачі — «задача: зробити X»"
        )
    return {"response": response, "graph_updates": []}


async def apply_updates(state: KnomeState) -> dict:
    if state["graph_updates"]:
        commit_updates(state["graph_updates"])
    return {"graph_updates": []}


def _route_domain(state: KnomeState) -> str:
    return state["domain"]


def create_orchestrator():
    graph = StateGraph(KnomeState)
    graph.add_node("classify_intent", classify_intent)
    graph.add_node("run_learning", run_learning)
    graph.add_node("run_finance", run_finance)
    graph.add_node("run_health", run_health)
    graph.add_node("run_workout", run_workout)
    graph.add_node("run_productivity", run_productivity)
    graph.add_node("run_reflection", run_reflection)
    graph.add_node("run_relationships", run_relationships)
    graph.add_node("run_career", run_career)
    graph.add_node("run_goals", run_goals)
    graph.add_node("run_home", run_home)
    graph.add_node("run_general", run_general)
    graph.add_node("apply_updates", apply_updates)

    graph.add_edge(START, "classify_intent")
    graph.add_conditional_edges(
        "classify_intent",
        _route_domain,
        {
            "learning": "run_learning",
            "finance": "run_finance",
            "health": "run_health",
            "workout": "run_workout",
            "productivity": "run_productivity",
            "reflection": "run_reflection",
            "relationships": "run_relationships",
            "career": "run_career",
            "goals": "run_goals",
            "home": "run_home",
            "general": "run_general",
        },
    )
    graph.add_edge("run_learning", "apply_updates")
    graph.add_edge("run_finance", "apply_updates")
    graph.add_edge("run_health", "apply_updates")
    graph.add_edge("run_workout", "apply_updates")
    graph.add_edge("run_productivity", "apply_updates")
    graph.add_edge("run_reflection", "apply_updates")
    graph.add_edge("run_relationships", "apply_updates")
    graph.add_edge("run_career", "apply_updates")
    graph.add_edge("run_goals", "apply_updates")
    graph.add_edge("run_home", "apply_updates")
    graph.add_edge("run_general", "apply_updates")
    graph.add_edge("apply_updates", END)

    return graph.compile()
