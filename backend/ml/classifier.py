"""
Transaction category classifier.

Rule-based scoring always runs first (works offline, zero latency).
LLM is called only when rule confidence < 0.6 and Ollama is reachable.

Supported categories mirror the frontend CATEGORIES list:
  їжа | transport | розваги | навчання | здоров'я | комунальні | одяг | інше
"""
from __future__ import annotations

import logging
import re
from typing import Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Category definitions
# ---------------------------------------------------------------------------

_RULES: dict[str, list[str]] = {
    "їжа": [
        "їжа", "ресторан", "кафе", "кава", "coffee", "food", "cafe", "pizza", "піца",
        "lunch", "dinner", "breakfast", "обід", "вечеря", "сніданок",
        "макдональдс", "mcdonald", "kfc", "burger", "бургер", "суші", "sushi",
        "продукти", "супермаркет", "атб", "atb", "сільпо", "silpo", "фора", "fora",
        "novus", "новус", "варус", "varus", "ашан", "auchan",
        "delivery", "доставка", "glovo", "uklon food", "bolt food", "meest",
        "пекарня", "bakery", "снек", "snack", "морозиво", "ice cream",
        "шаурма", "shawarma", "суп", "борщ",
    ],
    "transport": [
        "метро", "metro", "таксі", "taxi", "uber", "bolt", "uklon",
        "bus", "автобус", "маршрутка", "тролейбус", "трамвай",
        "транспорт", "transport", "бензин", "petrol", "fuel", "пальне",
        "паркінг", "parking", "парковка", "поїзд", "train", "електричка",
        "укрзалізниця", "ukrzaliznytsia", "квиток", "ticket",
        "авіа", "airline", "ryanair", "wizz", "мотоцикл", "велосипед",
    ],
    "розваги": [
        "кіно", "cinema", "concert", "концерт", "game", "гра", "steam", "playstation",
        "розваги", "entertainment", "netflix", "spotify", "youtube premium",
        "apple tv", "hbo", "disney", "patreon", "twitch", "стрімінг",
        "театр", "theatre", "музей", "museum", "парк", "escape room",
        "боулінг", "bowling", "більярд", "karaoke", "караоке",
        "бар", "bar", "клуб", "club", "пиво", "beer", "вино", "wine",
    ],
    "навчання": [
        "курс", "course", "книга", "book", "udemy", "coursera", "prometheus",
        "навчання", "learning", "education", "tutorial", "підписка на курс",
        "skillshare", "duolingo", "lingoda", "preply", "репетитор", "tutor",
        "університет", "university", "школа", "school", "олімпіада",
        "конференція", "conference", "вебінар", "webinar",
        "leetcode", "pluralsight", "linkedin learning",
    ],
    "здоров'я": [
        "аптека", "pharmacy", "pharmacist", "ліки", "таблетки", "medicine",
        "лікар", "doctor", "лікарня", "hospital", "клініка", "clinic",
        "gym", "спортзал", "фітнес", "fitness", "yoga", "йога",
        "здоров'я", "health", "стоматолог", "dentist", "окуліст",
        "аналізи", "analysis", "лабораторія", "lab", "мрт", "узд",
        "вітаміни", "vitamins", "протеїн", "protein", "supplement",
    ],
    "комунальні": [
        "комунальні", "utilities", "інтернет", "internet", "wifi",
        "телефон", "phone", "мобільний", "mobile", "київстар", "kyivstar",
        "vodafone", "lifecell", "lifecell", "електрика", "electricity",
        "газ", "gas", "вода", "water", "опалення", "heating",
        "оренда", "rent", "квартира", "apartment", "страховка", "insurance",
        "icloud", "google one", "subscri",
    ],
    "одяг": [
        "одяг", "clothes", "clothing", "взуття", "shoes", "шопінг", "shopping",
        "zara", "h&m", "hm", "uniqlo", "reserved", "lcwaikiki",
        "футболка", "джинси", "jeans", "куртка", "jacket", "пальто", "coat",
        "сумка", "bag", "аксесуари", "accessories",
    ],
}

ALL_CATEGORIES = list(_RULES.keys()) + ["інше"]
DEFAULT_CATEGORY = "інше"

# Minimum number of matched keywords to consider it a confident rule match
_HIGH_CONFIDENCE_THRESHOLD = 2
_LOW_CONFIDENCE_THRESHOLD  = 1


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower().strip())


def classify_rule(description: str) -> tuple[str, float]:
    """
    Pure rule-based classification.
    Returns (category, confidence) — confidence in [0, 1].
    """
    text = _normalize(description)
    scores: dict[str, int] = {}

    for cat, keywords in _RULES.items():
        hits = sum(1 for kw in keywords if kw in text)
        if hits:
            scores[cat] = hits

    if not scores:
        return DEFAULT_CATEGORY, 0.0

    best_cat = max(scores, key=lambda c: scores[c])
    best_hits = scores[best_cat]

    if best_hits >= _HIGH_CONFIDENCE_THRESHOLD:
        confidence = min(0.95, 0.7 + best_hits * 0.1)
    else:
        confidence = 0.5

    return best_cat, round(confidence, 2)


async def classify(
    description: str,
    amount: float = 0.0,
    use_llm: bool = True,
) -> tuple[str, float, str]:
    """
    Full classifier: rule-based first, LLM fallback if uncertain.
    Returns (category, confidence, source) where source = "rule" | "llm" | "default".
    """
    if not description.strip():
        return DEFAULT_CATEGORY, 0.0, "default"

    cat, conf = classify_rule(description)

    if conf >= 0.6:
        return cat, conf, "rule"

    if not use_llm:
        return cat, conf, "rule"

    # LLM fallback — only if Ollama available
    try:
        from llm.client import llm_respond
        cats_str = " | ".join(ALL_CATEGORIES)
        system = (
            f"Classify a financial transaction into exactly one of these categories: {cats_str}. "
            "Reply with ONLY the category name, nothing else. "
            "Use Ukrainian category names as written."
        )
        prompt = f"Transaction description: «{description}», amount: {amount}"
        result = await llm_respond(system, prompt)
        if result:
            result = result.strip().lower()
            for c in ALL_CATEGORIES:
                if result == c or result in c or c in result:
                    return c, 0.85, "llm"
    except Exception as exc:
        logger.debug("LLM classifier failed: %s", exc)

    return cat, conf, "rule"


def classify_sync(description: str) -> str:
    """Synchronous rule-based only — for use in agents (already in async context)."""
    cat, _ = classify_rule(description)
    return cat
