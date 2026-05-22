from datetime import date
from integrations.base import BankIntegration


class ManualInput(BankIntegration):
    async def fetch_transactions(self, from_date: date, to_date: date) -> list[dict]:
        # Повертає транзакції введені вручну через чат або форму
        return []
