# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Knome** ("Know Me") — a personal AI agent that learns the user across three interconnected life domains: learning, finance, and health. Cross-domain insight is the core differentiator (e.g., detecting that late food delivery spending correlates with lower learning productivity two days later via sleep quality).

Full specification: `KNOME_PROJECT.md`

## Commands

```bash
# Backend dev server (localhost:8000)
cd backend && uvicorn main:app --reload

# Frontend dev server (localhost:5173)
cd frontend && npm run dev

# All tests
cd backend && pytest

# Single test file
cd backend && pytest tests/test_agents/test_orchestrator.py -v

# Local LLM (required for dev)
ollama serve
```

## Architecture

### Data layer

The **Knowledge Graph (Kuzu)** is central — not a supplementary cache. All three domains write to and read from it; cross-domain patterns are first-class graph edges, not derived queries. Use Kuzu (embedded, no server) in dev, Neo4j in prod. SQLite stores only session metadata and user auth.

Key node types: `User`, `Goal`, `Skill`, `Topic`, `LearningSession`, `Habit`, `CheckIn`, `FoodEntry`, `Transaction`, `Budget`, `Pattern`, `Insight`. The `Pattern` node with `(Pattern)-[CONNECTS]->(CheckIn, Transaction)` is how cross-domain correlation is stored.

### Agent system (LangGraph)

```
START → [intent_classifier] → domain agent → [update_graph] → END
```

`KnomeState` (TypedDict) carries: `messages`, `user_id`, `intent`, `domain`, `graph_context`, `active_agent`, `response`, `graph_updates`. The orchestrator collects context from all three graph domains before routing to domain agents. Every agent response ends with a `graph_updates` list that `update_graph` commits.

Five agent types: `onboarding`, `learning`, `financial`, `health`, `orchestrator` (cross-domain).

### ML cold-start strategy

ML models activate progressively — never fail on empty data:
- **Day 1–7:** rule-based fallback for all predictions
- **Day 8–30:** data collection, pre-trained models active (XLM-RoBERTa for sentiment, LLaVA for food vision, multilingual-e5 for transaction classification — all zero-data-required)
- **Day 31–60:** DKT (LSTM) and Burnout Predictor (Random Forest) activate
- **Day 61–90:** LSTM Forecasting activates (needs 90 days of expense history)

### Trigger Engine (APScheduler)

Three trigger types: time-based (morning check-in 09:00, weekly report Sunday 10:00), event-based (anomaly detected, habit missed), pattern-based (3 days without learning, 4 consecutive bad mood days). Hard cap: max 2 proactive messages per day.

### Frontend routing

```
/onboarding → /chat (primary) → /dashboard
/learning/{curriculum,progress,session}
/finance/{overview,transactions,goals}
/health/{checkin,habits,nutrition,trends}
/settings/{profile,preferences,privacy}
```

State management: Zustand. Charts: Recharts. i18n: react-i18next with `/src/locales/ua.json` and `en.json`.

### Bank integration abstraction

`BankIntegration` (ABC) with `ManualInput` implemented first. `MonobankIntegration` stub prepared but not implemented. All financial agents go through this interface.

### LLM strategy

Dev: Ollama (local, `localhost:11434`) with LLaVA for food vision. Prod: Claude Vision / GPT-4V. LLM requests are anonymized before sending: names and amounts replaced with placeholders, categories kept.

## Code rules

- Python: type hints required everywhere, Pydantic for all data validation
- React: functional components + hooks only
- Always create a new git branch for each feature
- LangGraph state must be a `TypedDict` with explicit fields — no dynamic keys
- ML models must implement a rule-based fallback for the cold-start period
- New domain data must update the Knowledge Graph via `graph_updates` in state, not direct DB calls from agents

## Development phases

The project is pre-code (documentation phase). Development order:
1. **Foundation** — FastAPI + React scaffold, Kuzu schema, Onboarding Agent, basic chat UI, Ollama connection
2. **Domain MVP** — all three domain agents with rule-based ML, dashboards, UA/EN toggle, dark/light theme
3. **ML & AI** — Sentiment Analysis, Transaction Classifier, Food Vision, Nutritionix integration, Anomaly Detection, DKT
4. **Proactivity & Cross-Domain** — Trigger Engine, pattern detection, cross-domain insights, LSTM Forecasting, Burnout Predictor, weekly AI report
5. **Production Polish** — Docker Compose, Nginx, performance, Monobank API integration
