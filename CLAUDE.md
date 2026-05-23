# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Knome** ("Know Me") — a Personal Life OS Agent that learns the user across 10+ interconnected life domains: learning, finance, health, workout, productivity, reflection, relationships, career, home, and goals. Cross-domain insight is the core differentiator (e.g., detecting that late food delivery spending correlates with lower learning productivity two days later via sleep quality).

Full specification: `KNOME_PROJECT_V2.md` (V2 — expanded scope with 10+ domains)
Original spec: `KNOME_PROJECT.md` (V1 — 3-domain baseline, kept for reference)

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

The **Knowledge Graph (Kuzu)** is central — not a supplementary cache. All domains write to and read from it; cross-domain patterns are first-class graph edges, not derived queries. Use Kuzu (embedded, no server) in dev, Neo4j in prod. SQLite stores only session metadata and user auth.

Key node types (core): `User`, `Goal`, `Skill`, `Topic`, `LearningSession`, `Habit`, `CheckIn`, `FoodEntry`, `Transaction`, `Budget`, `Pattern`, `Insight`.

Extended node types (V2): `WorkoutProgram`, `WorkoutDay`, `Exercise`, `WorkoutSession`, `ExerciseLog`, `Task`, `Project`, `PomodoroSession`, `JournalEntry`, `GratitudeEntry`, `WeeklyReview`, `Contact`, `Interaction`, `CareerSkill`, `Achievement`, `JobApplication`, `Subscription`, `Debt`, `Asset`, `BodyMeasurement`, `LifeGoal`, `BucketItem`, `Trip`, `Book`, `Certificate`.

The `Pattern` node with `(Pattern)-[CONNECTS]->(CheckIn, Transaction, WorkoutSession, Task)` is how cross-domain correlation is stored.

### Agent system (LangGraph)

```
START → [intent_classifier] → domain agent → [update_graph] → END
```

`KnomeState` (TypedDict) carries: `messages`, `user_id`, `intent`, `domain`, `graph_context`, `active_agent`, `response`, `graph_updates`. The orchestrator collects context from all graph domains before routing to domain agents. Every agent response ends with a `graph_updates` list that `update_graph` commits.

Twelve agent types: `onboarding`, `learning`, `financial`, `health`, `workout`, `productivity`, `reflection`, `relationships`, `career`, `home`, `goals`, `orchestrator` (cross-domain).

### ML cold-start strategy

ML models activate progressively — never fail on empty data:
- **Day 1–7:** rule-based fallback for all predictions
- **Day 8–30:** data collection, pre-trained models active (XLM-RoBERTa for sentiment, LLaVA for food vision, multilingual-e5 for transaction classification — all zero-data-required)
- **Day 31–60:** DKT (LSTM) and Burnout Predictor (Random Forest) activate; Workout Progression (RF) active
- **Day 61–90:** LSTM Forecasting activates (needs 90 days of expense history)

### Trigger Engine (APScheduler)

Three trigger types:
- **Time-based:** morning check-in 09:00, evening summary 21:00, weekly report Sunday 10:00, monthly finance report 1st of month
- **Event-based:** anomaly detected, habit missed, task deadline tomorrow, subscription billing in 2 days, friend birthday in 3 days
- **Pattern-based:** 3 days without learning, 4 consecutive bad mood days, week without workout, 7 days without journal

Hard cap: max 2 proactive messages per day.

### Frontend routing

```
/onboarding → /chat (primary) → /dashboard
/learning/{curriculum,progress,session,books,certificates}
/finance/{overview,transactions,goals,subscriptions,net-worth}
/health/{checkin,habits,nutrition,measurements,trends}
/workout/{programs,builder,session,exercises,progress}     ← Phase 6
/productivity/{today,tasks,projects,pomodoro}              ← Phase 6
/reflection/{journal,gratitude,weekly}                     ← Phase 7
/relationships/{contacts,calendar}                         ← Phase 7
/career/{skills,achievements,applications}                 ← Phase 7
/goals/{life,bucket}                                       ← Phase 8
/settings/{profile,preferences,privacy}
```

State management: Zustand. Charts: Recharts. i18n: react-i18next with `/src/locales/ua.json` and `en.json`.

### Bank integration abstraction

`BankIntegration` (ABC) with `ManualInput` implemented. `MonobankIntegration` fully implemented (setup/sync/disconnect, 60+ MCC codes, deduplication). All financial agents go through this interface.

### LLM strategy

Dev: Ollama (local, `localhost:11434`) with LLaVA for food vision. Prod: Claude Vision / GPT-4V. LLM requests are anonymized before sending: names and amounts replaced with placeholders, categories kept.

## Code rules

- Python: type hints required everywhere, Pydantic for all data validation
- React: functional components + hooks only
- Always create a new git branch for each feature
- LangGraph state must be a `TypedDict` with explicit fields — no dynamic keys
- ML models must implement a rule-based fallback for the cold-start period
- New domain data must update the Knowledge Graph via `graph_updates` in state, not direct DB calls from agents

## Critical technical notes

- **bcrypt MUST be 4.3.0** — 5.x.x incompatible with passlib 1.7.4 (breaks registration!)
- **`$desc` is a reserved word in Kuzu** → use `$tx_desc`
- **Kuzu: only 1 process** — on "Could not set lock" → `Stop-Process -Name python -Force`
- **WebSocket NOT under /api** — path: `/ws/chat/{user_id}`
- **react-markdown v10** — NOT `className` prop, only `components` prop
- **`@apply` limitation** — cannot `@apply` custom animation or utility from `@layer utilities` inside `@layer components`. Symptom: PostCSS error "class does not exist". Fix: use inline CSS or direct box-shadow property
- **`text-2xs`** — defined in `@layer utilities`, do NOT `@apply text-2xs` in components
- **LangGraph**: all node-functions must be async
- **JWT**: HS256, env `JWT_SECRET`

## Development phases

Phase 1–5 are COMPLETE. Current focus: Phase 6.

1. ✅ **Foundation** — FastAPI + React scaffold, Kuzu schema, Onboarding Agent, basic chat UI, Ollama connection
2. ✅ **Domain MVP** — all three domain agents with rule-based ML, dashboards, UA/EN toggle, dark/light theme
3. ✅ **ML & AI** — Sentiment Analysis, Transaction Classifier, Food Vision, Nutritionix integration, Anomaly Detection, DKT, SM-2
4. ✅ **Proactivity & Cross-Domain** — Trigger Engine, pattern detection, cross-domain insights, LSTM Forecasting, Burnout Predictor, weekly AI report
5. ✅ **Production Polish** — JWT auth, Monobank API, Settings, export/delete, rate limiting, streaming, UX redesign
6. 🔄 **Workout + Productivity** — WorkoutProgram builder, exercise library (ExerciseDB API), workout logging, progression; Task manager, Pomodoro timer, Projects
7. ⬜ **Reflection + Relationships + Career + Finance expansion** — Journal, Gratitude, CRM, Career skills, Subscriptions manager, Net Worth tracker
8. ⬜ **Home + Goals + Advanced ML + PWA** — Bucket list, Life goals, Trip planner, Productivity Clock ML, Goal Predictor ML, PWA
