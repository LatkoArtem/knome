from abc import ABC, abstractmethod
from datetime import date


class BankIntegration(ABC):
    @abstractmethod
    async def fetch_transactions(self, from_date: date, to_date: date) -> list[dict]:
        pass
