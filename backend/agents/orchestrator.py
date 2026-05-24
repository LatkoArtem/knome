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
    "книг", "позаймав", "читав", "прогрес навч",
]
_FINANCE_KW = [
    "витрат", "куп", "заплат", "гроші", "бюджет", "транзакц",
    "spent", "paid", "money", "budget", "finance", "грн", "uah", "usd", "$",
]
_HEALTH_KW = [
    "спав", "спала", "сон", "настрій", "їжа", "з'їв", "здоров",
    "самопочуття", "check-in", "чекін", "sleep", "mood", "food", "health", "ate",
]
_WORKOUT_KW = [
    "тренув", "потренувавс", "потренувалас", "вправ", "підхід",
    "жим", "присід", "підтяг", "станова", "гантел", "штанг",
    "gym", "workout", "exercise", "bench", "squat", "deadlift", "фітнес",
    "програм трен", "план трен", "футбол", "витривалість", "тонус",
    "тричі на тиждень", "двічі на тиждень", "рівень середній",
    "рівень початківець", "рівень просунутий", "домашній зал",
]
_PRODUCTIVITY_KW = [
    "задач", "завдан", "проект", "дедлайн", "pomodoro", "помодоро",
    "таймер фокус", "task", "todo", "список задач", "план на день",
    "треба зробити", "починаю фокус",
]
_REFLECTION_KW = [
    "щоденник", "journal", "записати думки", "вдячний", "вдячна",
    "gratitude", "тижневий огляд", "weekly review", "рефлекс",
    "підсумок тижня", "3 речі", "нотатка",
]
_RELATIONSHIPS_KW = [
    "контакт", "contact", "знайомий", "друг", "подруга", "день народження",
    "birthday", "crm", "люди", "relationships", "познайомився", "познайомилась",
]
_CAREER_KW = [
    "навичка", "скіл", "skill", "досягнення", "achievement", "кар'єра",
    "career", "резюме", "resume", "портфоліо", "portfolio", "cv",
]
_GOALS_KW = [
    "ціль", "мета", "bucket list", "бакет ліст", "мрія", "мрію",
    "life goal", "хочу досягти", "хочу зробити", "список мрій",
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


async def run_general(state: KnomeState) -> dict:
    ctx = state.get("graph_context", {})
    user_name = ctx.get("user", {}).get("name", "")
    ctx_str = format_context(ctx)

    parts = []
    if ctx_str:
        parts.append(f"Context:\n{ctx_str}")
    parts.append(f"User message: {state['user_message']}")
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
    graph.add_edge("run_general", "apply_updates")
    graph.add_edge("apply_updates", END)

    return graph.compile()
