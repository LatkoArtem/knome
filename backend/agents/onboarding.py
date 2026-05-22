from typing import TypedDict
from langgraph.graph import StateGraph, START, END
import uuid
from datetime import datetime

from graph.schema import get_connection


class OnboardingState(TypedDict):
    user_id: str
    user_message: str
    phase: str  # greeting | goals | context | done
    name: str
    goals: list
    context_goal_index: int
    context_answers: dict
    response: str
    saved: bool


INITIAL_GREETING = (
    "Привіт! Я Knome — твій персональний AI помічник.\n"
    "Я допоможу відстежувати навчання, фінанси та здоров'я "
    "і знаходити зв'язки між ними.\n\nЯк тебе звати?"
)

_CONTEXT_QUESTIONS = {
    "learning": "Що саме хочеш вивчити? (мову програмування, іноземну мову, або щось інше?)",
    "finance": "Яка твоя головна фінансова ціль? (відкласти на щось, скоротити витрати, або просто розібратись?)",
    "health": "Що найважливіше для тебя у здоров'ї? (сон, харчування, активність, чи настрій?)",
}

_DOMAIN_LABELS = {
    "learning": "📚 Навчання",
    "finance": "💰 Фінанси",
    "health": "❤️ Здоров'я",
}


def _extract_name(text: str) -> str:
    text = text.strip()
    for prefix in ["мене звати ", "я ", "my name is ", "i'm ", "i am ", "звуть мене ", "звати "]:
        if text.lower().startswith(prefix):
            text = text[len(prefix):].strip()
    parts = text.split()
    return parts[0].capitalize() if parts else ""


def _extract_goals(text: str) -> list:
    text = text.lower()
    goals = []
    if any(w in text for w in ["навч", "learn", "курс", "вчити", "study", "програм", "мов", "все", "all"]):
        goals.append("learning")
    if any(w in text for w in ["фінанс", "гроші", "витрат", "бюджет", "finance", "money", "budget", "все", "all"]):
        goals.append("finance")
    if any(w in text for w in ["здоров", "сон", "їжа", "спорт", "health", "sleep", "food", "все", "all"]):
        goals.append("health")
    return goals if goals else ["learning", "finance", "health"]


def _save_user_to_graph(user_id: str, name: str, goals: list, answers: dict) -> None:
    conn = get_connection()
    now = datetime.utcnow().isoformat()
    conn.execute(
        "CREATE (:User {id: $id, name: $name, age: 0, language: 'ua', created_at: $now})",
        {"id": user_id, "name": name, "now": now},
    )
    for domain in goals:
        goal_id = str(uuid.uuid4())
        description = answers.get(domain, _DOMAIN_LABELS.get(domain, domain))
        conn.execute(
            "CREATE (:Goal {id: $id, domain: $domain, description: $desc, deadline: '', status: 'active'})",
            {"id": goal_id, "domain": domain, "desc": description},
        )
        conn.execute(
            "MATCH (u:User {id: $uid}), (g:Goal {id: $gid}) CREATE (u)-[:HAS_GOAL]->(g)",
            {"uid": user_id, "gid": goal_id},
        )


def handle_greeting(state: OnboardingState) -> dict:
    name = _extract_name(state["user_message"])
    if not name or len(name) < 2:
        return {"response": "Не розібрав ім'я 😊 Як тебе звати?", "phase": "greeting"}

    domains_list = "\n".join(f"• {v}" for v in _DOMAIN_LABELS.values())
    response = (
        f"Приємно познайомитись, {name}! 🎉\n\n"
        f"Я можу допомогти тобі в:\n{domains_list}\n\n"
        "З чим хочеш почати? (можна перерахувати кілька, або написати 'все')"
    )
    return {"response": response, "phase": "goals", "name": name}


def handle_goals(state: OnboardingState) -> dict:
    goals = _extract_goals(state["user_message"])
    selected = ", ".join(_DOMAIN_LABELS.get(g, g) for g in goals)
    first_q = _CONTEXT_QUESTIONS[goals[0]]
    response = f"Чудово! Обрано: {selected}.\n\n{first_q}"
    return {
        "response": response,
        "phase": "context",
        "goals": goals,
        "context_goal_index": 0,
        "context_answers": {},
    }


def handle_context(state: OnboardingState) -> dict:
    goals = state["goals"]
    idx = state["context_goal_index"]
    answers = {**state["context_answers"], goals[idx]: state["user_message"]}
    next_idx = idx + 1

    if next_idx < len(goals):
        question = _CONTEXT_QUESTIONS.get(goals[next_idx], "Розкажи більше про свої цілі.")
        return {
            "response": question,
            "phase": "context",
            "context_goal_index": next_idx,
            "context_answers": answers,
        }

    try:
        _save_user_to_graph(state["user_id"], state["name"], goals, answers)
    except Exception as e:
        print(f"[onboarding] graph save error: {e}")

    response = (
        f"Все готово, {state['name']}! 🚀\n\n"
        "Твої цілі збережено. Тепер я слідкуватиму за твоїм прогресом "
        "і знаходитиму зв'язки між навчанням, фінансами та здоров'ям.\n\n"
        "Напиши мені будь-що — я готовий!"
    )
    return {
        "response": response,
        "phase": "done",
        "context_goal_index": next_idx,
        "context_answers": answers,
        "saved": True,
    }


def handle_done(state: OnboardingState) -> dict:
    return {"response": "Я тут! Підтримка всіх агентів — у наступній фазі. 😊"}


def _route_phase(state: OnboardingState) -> str:
    return state["phase"]


def create_onboarding_agent():
    graph = StateGraph(OnboardingState)
    graph.add_node("handle_greeting", handle_greeting)
    graph.add_node("handle_goals", handle_goals)
    graph.add_node("handle_context", handle_context)
    graph.add_node("handle_done", handle_done)
    graph.add_conditional_edges(
        START,
        _route_phase,
        {
            "greeting": "handle_greeting",
            "goals": "handle_goals",
            "context": "handle_context",
            "done": "handle_done",
        },
    )
    graph.add_edge("handle_greeting", END)
    graph.add_edge("handle_goals", END)
    graph.add_edge("handle_context", END)
    graph.add_edge("handle_done", END)
    return graph.compile()
