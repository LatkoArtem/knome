from typing import TypedDict
from langgraph.graph import StateGraph, START, END

import agents.learning as learning_agent
import agents.financial as financial_agent
import agents.health as health_agent
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


def _classify_domain(text: str) -> str:
    text_lower = text.lower()
    scores = {
        "learning": sum(1 for w in _LEARNING_KW if w in text_lower),
        "finance": sum(1 for w in _FINANCE_KW if w in text_lower),
        "health": sum(1 for w in _HEALTH_KW if w in text_lower),
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
            "Здоров'я — «спав 7 годин, настрій 8»"
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
            "general": "run_general",
        },
    )
    graph.add_edge("run_learning", "apply_updates")
    graph.add_edge("run_finance", "apply_updates")
    graph.add_edge("run_health", "apply_updates")
    graph.add_edge("run_general", "apply_updates")
    graph.add_edge("apply_updates", END)

    return graph.compile()
