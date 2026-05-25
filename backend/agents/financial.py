import re
from graph.queries import add_transaction, get_recent_transactions
from llm.client import llm_respond
from llm.prompts import FINANCE_SYSTEM
from llm.context import format_context
from ml.classifier import classify

_SPEND_KW = ["витрат", "куп", "заплат", "paid", "spent", "bought", "buy"]
_SUMMARY_KW = ["скільки", "витрати", "бюджет", "статистик", "spending", "budget", "how much", "summary"]

_CURRENCY_MAP = {
    "грн": "UAH", "uah": "UAH", "₴": "UAH",
    "usd": "USD", "$": "USD", "дол": "USD",
    "eur": "EUR", "€": "EUR", "євро": "EUR",
}


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


def _llm_prompt(action: str, user_message: str, context: dict | None) -> str:
    ctx_str = format_context(context) if context else ""
    parts = [f"Action: {action}", f"User message: {user_message}"]
    if ctx_str:
        parts.insert(0, f"Context:\n{ctx_str}")
    return "\n\n".join(parts)


async def process(user_message: str, user_id: str, context: dict | None = None) -> tuple[str, list]:
    text = user_message.lower()
    parsed = _parse_amount_currency(text)

    # Summary FIRST — "Скільки витратив?" must not fall into the expense-log branch
    if any(w in text for w in _SUMMARY_KW) and not parsed:
        txs = get_recent_transactions(user_id, limit=20)
        if not txs:
            fallback = "Витрат ще не записано. Спробуй: «Витратив 500 грн на їжу»"
            action = "User asked for spending summary but no transactions recorded yet."
            response = await llm_respond(FINANCE_SYSTEM, _llm_prompt(action, user_message, context))
            return response or fallback, []
        by_cat: dict[str, float] = {}
        for tx in txs:
            by_cat[tx["category"]] = by_cat.get(tx["category"], 0) + tx["amount"]
        total = sum(by_cat.values())
        currency = txs[0]["currency"] if txs else "UAH"
        lines = "\n".join(f"• {cat}: {amt:.0f}" for cat, amt in sorted(by_cat.items(), key=lambda x: -x[1]))
        # Always include structured data to prevent LLM hallucination of amounts
        prefix = f"Твої витрати (всього: {total:.0f} {currency}):\n{lines}"
        action = (
            f"User asked how much they spent. "
            f"Total: {total:.0f} {currency} across {len(txs)} transactions. "
            f"By category: {lines}"
        )
        response = await llm_respond(FINANCE_SYSTEM, _llm_prompt(action, user_message, context))
        return f"{prefix}\n\n{response}" if response else prefix, []

    # Log transaction
    if any(w in text for w in _SPEND_KW):
        if parsed:
            amount, currency = parsed
            # Extract meaningful description from original message (not lowercased)
            desc_raw = re.sub(
                r"^(витратив|витратила|купив|купила|заплатив|заплатила|spent|paid|bought)\s*",
                "", user_message, flags=re.IGNORECASE,
            )
            desc_raw = re.sub(
                r"\s*\d+(?:[.,]\d+)?\s*(грн|uah|usd|\$|€|eur|дол|євро)\s*",
                " ", desc_raw, flags=re.IGNORECASE,
            ).strip(" ,.-")
            desc = desc_raw if len(desc_raw) > 2 else user_message
            category, _, _ = await classify(desc, amount)
            add_transaction(user_id, amount, currency, category, desc)
            fallback = f"Записав: {amount} {currency} — {category}. Баланс оновлено!"
            action = f"Logged expense: {amount} {currency} on «{category}» ({desc}). Saved."
            response = await llm_respond(FINANCE_SYSTEM, _llm_prompt(action, user_message, context))
            return response or fallback, []
        fallback = "Вкажи суму. Наприклад: «Витратив 200 грн на каву»"
        action = "User wants to log expense but no amount detected."
        response = await llm_respond(FINANCE_SYSTEM, _llm_prompt(action, user_message, context))
        return response or fallback, []

    # Show summary
    if any(w in text for w in _SUMMARY_KW):
        txs = get_recent_transactions(user_id, limit=20)
        if not txs:
            fallback = "Витрат ще не записано. Спробуй: «Витратив 500 грн на їжу»"
            action = "User asked for spending summary but no transactions recorded yet."
            response = await llm_respond(FINANCE_SYSTEM, _llm_prompt(action, user_message, context))
            return response or fallback, []
        by_cat: dict[str, float] = {}
        for tx in txs:
            by_cat[tx["category"]] = by_cat.get(tx["category"], 0) + tx["amount"]
        total = sum(by_cat.values())
        currency = txs[0]["currency"] if txs else "UAH"
        lines = "\n".join(f"• {cat}: {amt:.0f}" for cat, amt in sorted(by_cat.items(), key=lambda x: -x[1]))
        prefix = f"Твої витрати (всього: {total:.0f} {currency}):\n{lines}"
        action = (
            f"User requested spending summary. "
            f"Total: {total:.0f} {currency} across {len(txs)} transactions. "
            f"By category: {lines}"
        )
        response = await llm_respond(FINANCE_SYSTEM, _llm_prompt(action, user_message, context))
        return f"{prefix}\n\n{response}" if response else prefix, []

    fallback = (
        "Можу записати витрату або показати статистику. Наприклад:\n"
        "• «Витратив 500 грн на їжу»\n"
        "• «Заплатив $20 за Spotify»\n"
        "• «Які мої витрати?»"
    )
    response = await llm_respond(FINANCE_SYSTEM, _llm_prompt("", user_message, context))
    return response or fallback, []
