"""
Monobank Personal API integration.
Docs: https://api.monobank.ua/

Token: Monobank app → Settings → Other → API
Rate limit: 1 req/minute per token.
"""
import logging
from datetime import date, datetime, timezone
from typing import Optional

import httpx

from integrations.base import BankIntegration

logger = logging.getLogger(__name__)

_BASE = "https://api.monobank.ua"
_TIMEOUT = 15.0

# ISO 4217 → string
_CURRENCY_MAP = {980: "UAH", 840: "USD", 978: "EUR", 826: "GBP", 756: "CHF"}

# MCC → Knome category
_MCC_CATEGORY: dict[int, str] = {
    # Food & Grocery
    5411: "їжа", 5412: "їжа", 5422: "їжа", 5441: "їжа", 5451: "їжа",
    5462: "їжа", 5499: "їжа", 5812: "їжа", 5813: "розваги",
    5814: "їжа", 5411: "їжа",
    # Transport
    4111: "transport", 4112: "transport", 4121: "transport", 4131: "transport",
    4215: "transport", 5511: "transport", 5521: "transport", 5541: "transport",
    5542: "transport", 7523: "transport", 7542: "transport",
    # Entertainment
    7832: "розваги", 7922: "розваги", 7941: "розваги", 7993: "розваги",
    7994: "розваги", 7995: "розваги", 5734: "розваги", 5735: "розваги",
    # Health
    5122: "здоров'я", 5912: "здоров'я", 8011: "здоров'я", 8021: "здоров'я",
    8031: "здоров'я", 8049: "здоров'я", 8099: "здоров'я", 7298: "здоров'я",
    # Education
    8220: "навчання", 8241: "навчання", 8249: "навчання", 8299: "навчання",
    # Utilities
    4813: "комунальні", 4814: "комунальні", 4899: "комунальні",
    4900: "комунальні", 6300: "комунальні",
    # Clothing
    5600: "одяг", 5611: "одяг", 5621: "одяг", 5631: "одяг",
    5641: "одяг", 5651: "одяг", 5661: "одяг", 5691: "одяг", 5699: "одяг",
}


def _mcc_to_category(mcc: int) -> str:
    return _MCC_CATEGORY.get(mcc, "інше")


def _minor_to_main(amount: int, currency_code: int) -> float:
    """Convert minor currency units to main (kopecks → hryvnias)."""
    return round(amount / 100, 2)


def _parse_transaction(raw: dict) -> dict:
    amount_raw = raw.get("amount", 0)
    currency_code = raw.get("currencyCode", 980)
    amount = abs(_minor_to_main(amount_raw, currency_code))
    is_income = amount_raw > 0

    mcc = raw.get("mcc") or raw.get("originalMcc") or 0
    category = _mcc_to_category(mcc)

    ts = raw.get("time", 0)
    tx_date = datetime.fromtimestamp(ts, tz=timezone.utc).isoformat() if ts else ""

    return {
        "mono_id": raw.get("id", ""),
        "description": raw.get("description") or raw.get("comment") or "",
        "amount": amount,
        "currency": _CURRENCY_MAP.get(currency_code, str(currency_code)),
        "category": category,
        "mcc": mcc,
        "is_income": is_income,
        "date": tx_date,
    }


class MonobankIntegration(BankIntegration):
    def __init__(self, token: str):
        self._token = token
        self._headers = {"X-Token": token}

    async def get_client_info(self) -> Optional[dict]:
        try:
            async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
                resp = await client.get(f"{_BASE}/personal/client-info", headers=self._headers)
                resp.raise_for_status()
                return resp.json()
        except httpx.HTTPStatusError as e:
            logger.warning("Monobank client-info error: %s", e.response.status_code)
            return None
        except Exception as e:
            logger.warning("Monobank client-info failed: %s", e)
            return None

    async def fetch_transactions(self, from_date: date, to_date: date, account: str = "0") -> list[dict]:
        from_ts = int(datetime(from_date.year, from_date.month, from_date.day, tzinfo=timezone.utc).timestamp())
        to_ts = int(datetime(to_date.year, to_date.month, to_date.day, 23, 59, 59, tzinfo=timezone.utc).timestamp())

        try:
            async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
                resp = await client.get(
                    f"{_BASE}/personal/statement/{account}/{from_ts}/{to_ts}",
                    headers=self._headers,
                )
                resp.raise_for_status()
                raw_list = resp.json()
        except httpx.HTTPStatusError as e:
            status = e.response.status_code
            if status == 429:
                raise RuntimeError("Monobank rate limit: зачекай 1 хвилину між запитами")
            if status == 403:
                raise RuntimeError("Невірний Monobank токен")
            logger.warning("Monobank statement error: %s", status)
            return []
        except Exception as e:
            logger.warning("Monobank fetch failed: %s", e)
            return []

        return [_parse_transaction(tx) for tx in raw_list if tx.get("amount", 0) < 0]
