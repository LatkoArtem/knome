import re
from graph.queries import add_transaction, get_recent_transactions
from llm.client import llm_respond
from llm.prompts import FINANCE_SYSTEM

_SPEND_KW = ["витрат", "куп", "заплат", "paid", "spent", "bought", "buy"]
_SUMMARY_KW = ["скільки", "витрати", "бюджет", "статистик", "spending", "budget", "how much", "summary"]

_CATEGORY_MAP = {
    "їжа": ["їжа", "кафе", "ресторан", "кофе", "кава", "food", "cafe", "coffee", "pizza", "lunch", "dinner"],
    "transport": ["метро", "таксі", "uber", "bolt", "bus", "транспорт", "бензин", "transport"],
    "розваги": ["кіно", "cinema", "concert", "game", "розваги", "entertainment", "netflix", "spotify"],
    "навчання": ["курс", "книга", "udemy", "course", "book", "learning"],
    "здоров'я": ["аптека", "лікар", "gym", "спорт", "health", "pharmacy", "doctor"],
    "комунальні": ["комунальні", "інтернет", "internet", "phone", "utilities"],
}

_CURRENCY_MAP = {
    "грн": "UAH", "uah": "UAH", "₴": "UAH",
    "usd": "USD", "$": "USD", "дол": "USD",
    "eur": "EUR", "€": "EUR", "євро": "EUR",
}


def _classify_category(text: str) -> str:
    text = text.lower()
    for cat, keywords in _CATEGORY_MAP.items():
        if any(kw in text for kw in keywords):
            return cat
    return "інше"


def _parse_amount_currency(text: str) -> tuple[float, str] | None:
    patterns = [
        r"(\d+(?:[.,]\d+)?)\s*(грн|uah|usd|\$|€|eur|дол|євро)",
        r"(грн|uah|usd|\$|€|eur|дол|євро)\s*(\d+(?:[.,]\d+)?)",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            groups = m.groups()
            try:
                amount = float(groups[0].replace(",", "."))
                cur = _CURRENCY_MAP.get(groups[1].lower(), "UAH")
            except (ValueError, IndexError):
                try:
                    amount = float(groups[1].replace(",", "."))
                    cur = _CURRENCY_MAP.get(groups[0].lower(), "UAH")
                except (ValueError, IndexError):
                    continue
            return amount, cur
    return None


async def process(user_message: str, user_id: str) -> tuple[str, list]:
    text = user_message.lower()

    # Log transaction
    if any(w in text for w in _SPEND_KW):
        parsed = _parse_amount_currency(text)
        if parsed:
            amount, currency = parsed
            category = _classify_category(text)
            desc = re.sub(r"\d+(?:[.,]\d+)?\s*(грн|uah|usd|\$|€|eur|дол|євро)", "", text, flags=re.IGNORECASE).strip()
            for kw in _SPEND_KW:
                desc = desc.replace(kw, "")
            desc = desc.strip(" ,.-на") or category
            add_transaction(user_id, amount, currency, category, desc)
            fallback = f"Записав: {amount} {currency} — {category}. Баланс оновлено!"
            ctx = f"User logged expense: {amount} {currency} on category «{category}» ({desc}). Transaction saved."
            response = await llm_respond(FINANCE_SYSTEM, f"{ctx}\n\nUser message: {user_message}")
            return response or fallback, []
        fallback = "Вкажи суму. Наприклад: «Витратив 200 грн на каву»"
        response = await llm_respond(FINANCE_SYSTEM, f"User wants to log an expense but didn't provide an amount.\n\nUser message: {user_message}")
        return response or fallback, []

    # Show summary
    if any(w in text for w in _SUMMARY_KW):
        txs = get_recent_transactions(user_id, limit=20)
        if not txs:
            fallback = "Витрат ще не записано. Спробуй: «Витратив 500 грн на їжу»"
            response = await llm_respond(FINANCE_SYSTEM, f"User asked for spending summary but no transactions recorded yet.\n\nUser message: {user_message}")
            return response or fallback, []
        by_cat: dict[str, float] = {}
        for tx in txs:
            by_cat[tx["category"]] = by_cat.get(tx["category"], 0) + tx["amount"]
        total = sum(by_cat.values())
        currency = txs[0]["currency"] if txs else "UAH"
        lines = "\n".join(f"• {cat}: {amt:.0f}" for cat, amt in sorted(by_cat.items(), key=lambda x: -x[1]))
        fallback = f"Останні витрати (сума: {total:.0f} {currency}):\n{lines}"
        ctx = (
            f"User asked for spending summary.\n"
            f"Total: {total:.0f} {currency} across {len(txs)} transactions.\n"
            f"By category:\n{lines}"
        )
        response = await llm_respond(FINANCE_SYSTEM, f"{ctx}\n\nUser message: {user_message}")
        return response or fallback, []

    fallback = (
        "Можу записати витрату або показати статистику. Наприклад:\n"
        "• «Витратив 500 грн на їжу»\n"
        "• «Заплатив $20 за Spotify»\n"
        "• «Які мої витрати?»"
    )
    response = await llm_respond(FINANCE_SYSTEM, f"User message: {user_message}")
    return response or fallback, []
