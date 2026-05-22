from datetime import date
from integrations.base import BankIntegration


class MonobankIntegration(BankIntegration):
    # Реалізується у Фазі 5
    async def fetch_transactions(self, from_date: date, to_date: date) -> list[dict]:
        raise NotImplementedError("Monobank integration is not implemented yet")
