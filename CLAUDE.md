# Knome — Personal Life OS Agent

## Проект

Персональний AI агент з трьома доменами: навчання, фінанси, здоров'я.
Детальна документація: KNOME_PROJECT.md

## Стек

- Backend: Python, FastAPI, LangGraph, Kuzu, Ollama
- Frontend: React, TailwindCSS, react-i18next, Zustand, Recharts
- LLM: Ollama (dev) → Claude/GPT-4V (prod)
- ML: PyTorch, scikit-learn, HuggingFace

## Команди

- Backend: cd backend && uvicorn main:app --reload
- Frontend: cd frontend && npm run dev
- Tests: cd backend && pytest

## Правила коду

- Python: type hints обов'язково, pydantic для валідації
- React: тільки functional components + hooks
- Коміти: завжди створюй новий git branch для фічі
- Ніколи не комить .env і API ключі

## Структура

- /backend/agents/ — всі LangGraph агенти
- /backend/graph/ — Knowledge Graph (Kuzu)
- /backend/ml/ — всі ML моделі
- /frontend/src/pages/ — сторінки
- /frontend/src/locales/ — переклади UA/EN
