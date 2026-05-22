# Knome — Progress Tracker

> Останнє оновлення: 2026-05-22

---

## Загальний стан

| Фаза | Назва | Статус |
|---|---|---|
| 1 | Фундамент | ✅ Завершено |
| 2 | Domain MVP | ✅ Завершено |
| 3 | ML & AI | ⬜ Не почато |
| 4 | Проактивність та Cross-Domain | ⬜ Не почато |
| 5 | Production Polish | ⬜ Не почато |

---

## Як запустити зараз

```bash
# Термінал 1 — Backend
cd backend
venv\Scripts\uvicorn main:app --reload

# Термінал 2 — Frontend
cd frontend
npm run dev
```

Відкрити: **http://localhost:5173**

> **Важливо:** Kuzu DB не підтримує два процеси одночасно.
> Якщо сервер впав з помилкою "Could not set lock" — є зависший python.exe процес. Вбий через Task Manager або `Stop-Process -Name python -Force`.

---

## Фаза 1 — Фундамент ✅

### Зроблено

**Backend:**
- `backend/main.py` — FastAPI + CORS + lifespan (init Kuzu schema)
- `backend/graph/schema.py` — Kuzu схема: 13 Node tables + 14 Rel tables
- `backend/graph/queries.py` — CRUD helpers для всіх доменів
- `backend/api/health.py` — `GET /api/health`
- `backend/api/chat.py` — WebSocket `/ws/chat/{user_id}`
- `backend/agents/onboarding.py` — LangGraph 4-фазний онбординг (greeting → goals → context → done)

**Frontend:**
- Vite + React + TailwindCSS + Zustand + react-i18next
- `src/App.jsx` — routing, dark/light theme, мовна синхронізація
- `src/pages/Onboarding.jsx` — conversational chat UI для онбордингу
- `src/pages/Chat.jsx` — основний чат з UA/EN toggle та dark/light
- `src/store/index.js` — Zustand persist store (userId, theme, language, messages)
- `src/hooks/useChat.js` — WebSocket hook
- `src/locales/ua.json`, `en.json` — повний i18n

---

## Фаза 2 — Domain MVP ✅

### Зроблено

**Backend:**
- `backend/agents/orchestrator.py` — LangGraph orchestrator з intent classifier
  - Автоматично визначає домен (learning / finance / health / general)
  - Всі node-функції **async** (критично: LangGraph 1.x запускає sync у thread pool → Kuzu не thread-safe)
- `backend/agents/learning.py` — Rule-based: логує сесії, цілі, показує прогрес
- `backend/agents/financial.py` — Rule-based: парсить суму+валюту, класифікує категорії
- `backend/agents/health.py` — Rule-based: check-in (сон/настрій/енергія), їжа
- `backend/api/learning.py` — REST: `GET /api/learning/summary/{uid}`, `POST /api/learning/session/{uid}`, `POST /api/learning/goal/{uid}`
- `backend/api/finance.py` — REST: `GET /api/finance/summary/{uid}`, `POST /api/finance/transaction/{uid}`
- `backend/api/health_domain.py` — REST: `GET /api/health-domain/summary/{uid}`, `POST /api/health-domain/checkin/{uid}`, `POST /api/health-domain/food/{uid}`

**Frontend:**
- `src/components/NavBar.jsx` — Bottom navigation (Chat / Dashboard / Learning / Finance / Health)
- `src/pages/Dashboard.jsx` — 3 картки з live-даними з REST API
- `src/pages/Learning.jsx` — цілі, сесії, форми додавання
- `src/pages/Finance.jsx` — транзакції, категорії, summary, форма
- `src/pages/Health.jsx` — check-in форма зі слайдерами, історія

### Відомі обмеження поточного стану
- **Немає LLM** — всі відповіді шаблонні (rule-based), без Ollama/Claude
- Онбординг розуміє лише конкретні слова (наприклад: "навчання", "all", "все")
- Немає автентифікації — userId генерується на клієнті (UUID)
- WebSocket session зберігається тільки в пам'яті (втрачається при рестарті сервера)
- Kuzu не підтримує concurrent access (тільки 1 процес)

### Важливі технічні нотатки
- **`$desc` — зарезервоване слово Kuzu** (конфлікт з `DESC` в ORDER BY). Замість нього використовувати `$tx_desc` або будь-яке інше ім'я
- **Kuzu API**: `result.has_next()` / `result.get_next()` (snake_case, не camelCase)
- **LangGraph 1.2.1** встановлено (requirements.txt каже 0.2.60 — треба оновити)
- WebSocket роутер **без** prefix `/api` (шлях: `/ws/chat/{user_id}`)

---

## Фаза 3 — ML & AI ⬜

### З чого починати наступну сесію

**Перший крок — підключити Ollama для живих відповідей в чаті.**

Це найбільш відчутна зміна — замість шаблонів буде природна мова.

```
# Встановити ollama якщо немає:
# https://ollama.ai

ollama pull llama3.2
ollama serve  # запускати в окремому терміналі
```

**Що реалізувати в Фазі 3 (порядок важливий):**

1. **Ollama інтеграція в orchestrator** (`langchain_ollama.ChatOllama`)
   - Замінити шаблонні відповіді на LLM з контекстом з Kuzu
   - System prompt: передавати цілі, останні дані домену, ім'я користувача
   - Файл: `backend/agents/orchestrator.py` + кожен domain agent

2. **Sentiment Analysis** (`transformers`, `XLM-RoBERTa`)
   - Аналіз настрою з нотаток check-in
   - Файл: `backend/ml/sentiment.py`

3. **Transaction Classifier** (`sentence-transformers`, `multilingual-e5`)
   - Автоматична класифікація транзакцій за описом
   - Файл: `backend/ml/transaction_classifier.py`

4. **Food Vision** (`LLaVA` через Ollama)
   - Фото страви → КБЖУ
   - Потрібно: endpoint для upload фото, інтеграція з LLaVA
   - Файл: `backend/api/health_domain.py` (новий endpoint)

5. **DKT — Dynamic Knowledge Tracing** (LSTM)
   - Трекінг засвоєння тем
   - Активується після 30+ днів даних
   - Файл: `backend/ml/dkt.py`

---

## Фаза 4 — Проактивність та Cross-Domain ⬜

- APScheduler trigger engine (`backend/triggers/engine.py` — заглушка готова)
- Pattern detection (вузол `Pattern` в Kuzu вже є в схемі)
- Cross-domain insights: кореляція витрат → сон → навчання
- LSTM Forecasting витрат (потрібно 90 днів даних)
- Burnout Predictor (Random Forest, потрібно 60 днів)
- Weekly AI звіт

---

## Фаза 5 — Production Polish ⬜

- Docker Compose (backend + frontend + nginx)
- Monobank API інтеграція (`backend/integrations/monobank.py` — заглушка готова)
- Аутентифікація (JWT, `python-jose` вже в requirements)
- PostgreSQL/Neo4j замість SQLite/Kuzu для продакшну
- Performance: connection pooling, кешування

---

## Структура проекту (поточна)

```
KNOME/
├── backend/
│   ├── main.py                    ✅
│   ├── requirements.txt           ✅
│   ├── agents/
│   │   ├── onboarding.py          ✅ LangGraph, 4 фази
│   │   ├── orchestrator.py        ✅ Intent classifier + routing
│   │   ├── learning.py            ✅ Rule-based
│   │   ├── financial.py           ✅ Rule-based
│   │   └── health.py              ✅ Rule-based
│   ├── api/
│   │   ├── chat.py                ✅ WebSocket
│   │   ├── health.py              ✅ System health check
│   │   ├── learning.py            ✅ REST endpoints
│   │   ├── finance.py             ✅ REST endpoints
│   │   └── health_domain.py       ✅ REST endpoints
│   ├── graph/
│   │   ├── schema.py              ✅ Kuzu schema (13 nodes, 14 rels)
│   │   ├── queries.py             ✅ CRUD helpers
│   │   └── patterns.py            ⬜ Фаза 4
│   ├── ml/                        ⬜ Фаза 3 (порожня папка)
│   ├── triggers/
│   │   └── engine.py              ⬜ Фаза 4 (заглушка)
│   └── integrations/
│       ├── base.py                ✅ ABC
│       ├── manual.py              ✅ ManualInput
│       └── monobank.py            ⬜ Фаза 5 (заглушка)
├── frontend/
│   ├── src/
│   │   ├── App.jsx                ✅
│   │   ├── main.jsx               ✅
│   │   ├── i18n.js                ✅
│   │   ├── store/index.js         ✅ Zustand
│   │   ├── hooks/useChat.js       ✅ WebSocket hook
│   │   ├── components/
│   │   │   └── NavBar.jsx         ✅
│   │   ├── pages/
│   │   │   ├── Onboarding.jsx     ✅
│   │   │   ├── Chat.jsx           ✅
│   │   │   ├── Dashboard.jsx      ✅
│   │   │   ├── Learning.jsx       ✅
│   │   │   ├── Finance.jsx        ✅
│   │   │   └── Health.jsx         ✅
│   │   └── locales/
│   │       ├── ua.json            ✅ Повний
│   │       └── en.json            ✅ Повний
│   └── package.json               ✅
├── CLAUDE.md                      ✅
├── KNOME_PROJECT.md               ✅
└── PROGRESS.md                    ✅ (цей файл)
```
