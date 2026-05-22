"""
Cross-domain insight generation.
LLM-based with rule-based fallback — always returns something meaningful.
"""
from llm.client import llm_respond
from llm.context import format_context
from graph.queries import get_due_reviews

_SYSTEM = """You are Knome's insight engine. Analyze cross-domain user data and generate exactly 2-3 insights.

Rules:
- ЗАВЖДИ відповідай ТІЛЬКИ українською мовою
- Each insight MUST mention at least 2 life domains (health+learning, health+finance, etc.)
- Use specific numbers from the context when available
- Be concise — max 25 words per insight, one sentence
- Be action-oriented when possible
- Output ONLY the insights, one per line, no bullets, no numbering, no extra text
- If data is clearly insufficient for cross-domain insights, output a single line explaining what to log"""

_DOMAIN_KEYWORDS = {
    "learning": ["навч", "сесі", "хвилин", "ціл", "тем", "skill", "study", "learn"],
    "health":   ["сон", "настрій", "енергі", "sleep", "mood", "energy", "здоров"],
    "finance":  ["витрат", "грн", "uah", "spend", "budget", "фінанс"],
}


def _detect_domains(text: str) -> list[str]:
    text_lower = text.lower()
    return [d for d, kws in _DOMAIN_KEYWORDS.items() if any(k in text_lower for k in kws)]


def _rule_based_insights(ctx: dict) -> list[dict]:
    """Generate insights purely from patterns + stats when LLM is unavailable."""
    insights: list[dict] = []
    patterns = ctx.get("patterns", [])
    health = ctx.get("health", {})
    learning = ctx.get("learning", {})
    finance = ctx.get("finance", {})
    nutrition = ctx.get("nutrition", {})

    seen_sleep_insight = False

    # Pattern-based cross-domain insights
    for p in patterns:
        if p == "sleep_learning_risk:poor_sleep_may_reduce_focus":
            sleep = health.get("last_sleep", 0)
            insights.append({
                "text": f"Ніч була {sleep}г сну — концентрація знижена, зроби коротку сесію замість довгої.",
                "domains": ["health", "learning"], "type": "pattern", "priority": 1,
            })
            seen_sleep_insight = True
        elif p == "mood_spending_risk:low_mood_with_active_spending":
            mood = health.get("last_mood", 0)
            insights.append({
                "text": f"Настрій {mood}/10 і кілька витрат сьогодні — стережись імпульсних покупок.",
                "domains": ["health", "finance"], "type": "pattern", "priority": 1,
            })
        elif p == "no_learning_this_week":
            insights.append({
                "text": "Цього тижня ще немає навчання — навіть 10 хвилин щодня дають ефект.",
                "domains": ["learning"], "type": "tip", "priority": 2,
            })
        elif p.startswith("low_sleep_last_night:") and not seen_sleep_insight:
            h = p.split(":")[1]
            insights.append({
                "text": f"Ніч була {h} сну — відстеж чи вплине це на навчання та настрій сьогодні.",
                "domains": ["health", "learning"], "type": "pattern", "priority": 2,
            })
        elif p == "mood_declining":
            insights.append({
                "text": "Настрій знижується відносно твого середнього — зверни увагу на сон та навантаження.",
                "domains": ["health"], "type": "pattern", "priority": 2,
            })

    # Cross-domain stats insights (need enough data)
    if health and learning and health.get("avg_sleep") and learning.get("total_minutes"):
        avg_sleep = health["avg_sleep"]
        total_min = learning["total_minutes"]
        sessions = learning.get("session_count", 0)
        if sessions >= 3 and avg_sleep:
            sleep_quality = "добре" if avg_sleep >= 7 else "недостатньо"
            insights.append({
                "text": f"Середній сон {avg_sleep}г ({sleep_quality}) і {total_min} хв навчання за тиждень — непогана комбінація.",
                "domains": ["health", "learning"], "type": "correlation", "priority": 3,
            })

    if nutrition and nutrition.get("total_calories") and health.get("avg_mood"):
        kcal = nutrition["total_calories"]
        insights.append({
            "text": f"Сьогодні {kcal} ккал. Харчування впливає на енергію та концентрацію.",
            "domains": ["health"], "type": "tip", "priority": 3,
        })

    # SM-2 due reviews insight
    user = ctx.get("user", {})
    user_id = user.get("id", "")
    if user_id:
        due = get_due_reviews(user_id)
        if due:
            overdue = [d for d in due if d["days_overdue"] > 0]
            topics = ", ".join(d["topic_name"] for d in due[:3])
            if overdue:
                insights.append({
                    "text": f"Пропущено повторення: {', '.join(d['topic_name'] for d in overdue[:2])}. Пам'ять зменшується без практики.",
                    "domains": ["learning"], "type": "sm2", "priority": 1,
                })
            else:
                insights.append({
                    "text": f"Сьогодні до повторення: {topics}. Займе 5-10 хвилин.",
                    "domains": ["learning"], "type": "sm2", "priority": 2,
                })

    # Empty state
    if not insights:
        has_health = bool(health)
        has_learning = bool(learning)
        has_finance = bool(finance)
        logged = sum([has_health, has_learning, has_finance])
        if logged == 0:
            insights.append({
                "text": "Почни логувати — після кількох днів записів з'являться крос-доменні інсайти.",
                "domains": [], "type": "empty", "priority": 10,
            })
        else:
            missing = [d for d, has in [("здоров'я", has_health), ("навчання", has_learning), ("фінанси", has_finance)] if not has]
            if missing:
                insights.append({
                    "text": f"Додай записи в: {', '.join(missing)} — тоді побачиш зв'язки між доменами.",
                    "domains": [], "type": "empty", "priority": 10,
                })

    return sorted(insights, key=lambda x: x["priority"])[:3]


async def generate_insights(ctx: dict) -> list[dict]:
    """Generate 2-3 cross-domain insights. LLM-based with rule-based fallback."""
    if not ctx:
        return [{
            "text": "Почни знайомство з Knome — заповни профіль щоб отримати персональні інсайти.",
            "domains": [], "type": "empty", "priority": 10,
        }]

    ctx_str = format_context(ctx)
    if not ctx_str:
        return _rule_based_insights(ctx)

    llm_text = await llm_respond(_SYSTEM, f"User data:\n{ctx_str}")

    if llm_text:
        lines = [l.strip(" •-–—123456789.)") for l in llm_text.strip().splitlines() if l.strip()]
        lines = [l for l in lines if len(l) > 10][:3]
        if lines:
            return [
                {
                    "text": line,
                    "domains": _detect_domains(line),
                    "type": "llm",
                    "priority": i + 1,
                }
                for i, line in enumerate(lines)
            ]

    return _rule_based_insights(ctx)
