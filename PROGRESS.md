# Knome — Progress Tracker

> Останнє оновлення: 2026-05-22

---

## Загальний стан

| Фаза | Назва | Статус |
|---|---|---|
| 1 | Фундамент | ✅ Завершено |
| 2 | Domain MVP | ✅ Завершено |
| 3 | ML & AI | ✅ Завершено |
| 4 | Проактивність та Cross-Domain | ✅ Завершено |
| 5 | Production Polish | 🔄 В процесі |

---

## Як запустити зараз

```bash
# Термінал 1 — Backend
cd backend
venv\Scripts\uvicorn main:app --reload

# Термінал 2 — Frontend
cd frontend
npm run dev

# Опційно — LLM (для живих відповідей)
ollama serve
```

Відкрити: **http://localhost:5173**

> **Важливо:** Kuzu DB не підтримує два процеси одночасно.
> Якщо сервер впав з помилкою "Could not set lock" — є зависший python.exe процес. Вбий через Task Manager або `Stop-Process -Name python -Force`.

---

## Фаза 1 — Фундамент ✅

- FastAPI + CORS + lifespan (init Kuzu schema)
- Kuzu схема: 15 Node tables + 14 Rel tables (+ TopicReview)
- LangGraph 4-фазний онбординг (greeting → goals → context → done)
- WebSocket `/ws/chat/{user_id}` з word-by-word стрімінгом
- Vite + React + TailwindCSS + Zustand + react-i18next
- Повний i18n (ua/en), dark/light theme

---

## Фаза 2 — Domain MVP ✅

- Orchestrator з intent classifier (learning / finance / health / general)
- Domain agents: learning, financial, health (rule-based)
- REST endpoints для всіх доменів
- Dashboard, Learning, Finance, Health сторінки
- NavBar з bottom navigation

---

## Фаза 3 — ML & AI ✅

- **Ollama інтеграція** — LLM з rule-based fallback (model: qwen2.5:7b)
- **LLM Streaming** — `llm_stream()` токен-за-токеном через WebSocket
- **Transaction Classifier** — rule-based + LLM fallback (`backend/ml/classifier.py`)
- **SM-2 Spaced Repetition** — планувальник повторень (`backend/ml/sm2.py`)
- **Food Vision** — запит через Ollama LLaVA
- **Cross-domain context** — всі агенти мають доступ до health/finance/learning стану
- **Cross-domain insights API** — `GET /api/insights/{user_id}`

---

## Фаза 4 — Проактивність та Cross-Domain ✅

- **Trigger Engine** (APScheduler) — 3 типи тригерів:
  - `morning_checkin` — щодня 09:00
  - `weekly_report` — неділя 10:00
  - `pattern_scan` — кожні 15 хв
- Добовий ліміт: max 2 проактивні повідомлення
- **Burnout Predictor** (rule-based, RF stub) — `GET /api/ml/burnout/{uid}`
- **Spending Forecaster** (linear, LSTM stub) — `GET /api/ml/forecast/{uid}`
- **Dashboard ML cards** — Burnout Risk + Forecast + Insights
- **Pattern detection** — cross-domain флаги в KnomeState

---

## Фаза 5 — Production Polish 🔄

### Зроблено

- ✅ **Word-by-word streaming** — `_stream_text()` в `chat.py` для всіх відповідей
- ✅ **Frontend streaming** — `useChat.js` обробляє `{token}`, `{done}`, `{text}`
  - Loading dots поки чекаємо першого токена
  - Стрімінг-бабл з анімованим курсором
  - Авто-скрол при нових токенах
- ✅ **Onboarding streaming** — `Onboarding.jsx` обробляє token-протокол
- ✅ **Trigger messages** — відображаються з кольоровим label (☀️/📊/💡)
- ✅ **JWT Authentication** (backend)
  - `POST /api/auth/register` — реєстрація → JWT token
  - `POST /api/auth/login` — вхід → JWT token
  - `GET /api/auth/me` — поточний користувач
  - SQLite (`data/auth.db`) для credentials
  - bcrypt для хешування паролів, python-jose для JWT
- ✅ **Login/Register сторінка** (`/login`) — toggle login/register форма
- ✅ **Guest mode** — можна продовжити без реєстрації через `/onboarding`

### В процесі / Залишилось

- ⬜ **Monobank API інтеграція** — webhook + API клієнт
- ⬜ **Refresh token / token expiry** — зараз токен на 30 днів без рефрешу
- ⬜ **WebSocket auth** — WS поки без JWT перевірки
- ⬜ **Rate limiting** — API без обмежень
- ⬜ **Env vars** — `JWT_SECRET`, `KUZU_DB_PATH` тільки з дефолтами
- ⬜ **PostgreSQL/Neo4j** — для prod (поточно Kuzu/SQLite)

---

## Структура проекту (поточна)

```
KNOME/
├── backend/
│   ├── main.py                    ✅
│   ├── requirements.txt           ✅
│   ├── agents/
│   │   ├── onboarding.py          ✅ LangGraph, 4 фази
│   │   ├── orchestrator.py        ✅ Intent classifier + routing + LLM
│   │   ├── learning.py            ✅ Rule-based + LLM + SM-2
│   │   ├── financial.py           ✅ Rule-based + LLM + classifier
│   │   └── health.py              ✅ Rule-based + LLM + food
│   ├── api/
│   │   ├── auth.py                ✅ register/login/me
│   │   ├── chat.py                ✅ WebSocket + streaming
│   │   ├── health.py              ✅ System health check
│   │   ├── learning.py            ✅ REST endpoints + SM-2
│   │   ├── finance.py             ✅ REST endpoints + classifier
│   │   ├── health_domain.py       ✅ REST endpoints + food
│   │   ├── insights.py            ✅ Cross-domain insights
│   │   └── ml.py                  ✅ Burnout + Forecast endpoints
│   ├── auth/
│   │   ├── db.py                  ✅ SQLite auth store
│   │   └── security.py            ✅ JWT + bcrypt
│   ├── graph/
│   │   ├── schema.py              ✅ Kuzu schema
│   │   ├── queries.py             ✅ CRUD helpers
│   │   └── patterns.py            ✅ Pattern detection
│   ├── llm/
│   │   ├── client.py              ✅ Ollama client + llm_stream
│   │   ├── prompts.py             ✅ System prompts
│   │   ├── context.py             ✅ Context formatter
│   │   └── insights.py            ✅ Cross-domain insight generator
│   ├── ml/
│   │   ├── sm2.py                 ✅ Spaced repetition
│   │   ├── burnout.py             ✅ Burnout predictor
│   │   ├── forecasting.py         ✅ Spending forecaster
│   │   └── classifier.py          ✅ Transaction classifier
│   ├── triggers/
│   │   ├── engine.py              ✅ APScheduler (3 jobs)
│   │   ├── rules.py               ✅ Trigger rules
│   │   └── store.py               ✅ Pending message queue
│   └── integrations/
│       ├── base.py                ✅ ABC
│       ├── manual.py              ✅ ManualInput
│       └── monobank.py            ⬜ Фаза 5 (заглушка)
├── frontend/
│   ├── src/
│   │   ├── App.jsx                ✅ + /login route
│   │   ├── main.jsx               ✅
│   │   ├── i18n.js                ✅
│   │   ├── store/index.js         ✅ + token, auth actions, streaming state
│   │   ├── hooks/useChat.js       ✅ + token protocol handling
│   │   ├── components/
│   │   │   └── NavBar.jsx         ✅
│   │   ├── pages/
│   │   │   ├── Login.jsx          ✅ login/register toggle
│   │   │   ├── Onboarding.jsx     ✅ + streaming support
│   │   │   ├── Chat.jsx           ✅ + streaming bubble + loading dots
│   │   │   ├── Dashboard.jsx      ✅ + ML cards
│   │   │   ├── Learning.jsx       ✅
│   │   │   ├── Finance.jsx        ✅
│   │   │   └── Health.jsx         ✅
│   │   └── locales/
│   │       ├── ua.json            ✅
│   │       └── en.json            ✅
│   └── package.json               ✅
├── CLAUDE.md                      ✅
├── KNOME_PROJECT.md               ✅
└── PROGRESS.md                    ✅ (цей файл)
```

---

## Технічні нотатки

- **`$desc` — зарезервоване слово Kuzu** → використовувати `$tx_desc`
- **Kuzu API**: `result.has_next()` / `result.get_next()` (snake_case)
- **LangGraph**: всі node-функції мають бути `async`
- **Streaming протокол**: `{token: "word "}` → ... → `{done: True[, extra...]}`
- **JWT**: 30 днів, HS256, секрет в env `JWT_SECRET`
- **Auth DB**: SQLite окремо від Kuzu, шлях `./data/auth.db`
- **Kuzu concurrent**: тільки 1 процес — при помилці "Could not set lock" вбити python.exe
