# KNOME
### *Know Me — Personal Life OS Agent*

> Knome — це персональний AI агент який знайомиться з тобою, вивчає твої паттерни і стає розумним помічником у всіх ключових сферах життя. Він не просто відповідає на запити — він знає тебе і бачить повну картину.

---

## Зміст

1. [Концепція і Місія](#концепція-і-місія)
2. [Для кого](#для-кого)
3. [Що вміє Knome](#що-вміє-knome)
4. [Архітектура системи](#архітектура-системи)
5. [Knowledge Graph](#knowledge-graph)
6. [Агентна система](#агентна-система)
7. [Домени](#домени)
8. [ML / DL компоненти](#ml--dl-компоненти)
9. [Cold Start стратегія](#cold-start-стратегія)
10. [Проактивність](#проактивність)
11. [Інтерфейс і дизайн](#інтерфейс-і-дизайн)
12. [Приватність і безпека](#приватність-і-безпека)
13. [Технологічний стек](#технологічний-стек)
14. [Фази розробки](#фази-розробки)
15. [Майбутні функції](#майбутні-функції)

---

## Концепція і Місія

Більшість людей живуть розрізнено — здоров'я, гроші, навчання, задачі існують окремо у різних додатках. Але насправді всі сфери глибоко пов'язані:

```
Фінансовий стрес  →  Поганий сон       →  Низька концентрація  →  Гірше навчання
Нові знання       →  Нова робота       →  Більший дохід        →  Менше стресу
Гарний сон        →  Більше енергії    →  Краща продуктивність →  Швидше навчання
Тренування        →  Вища енергія      →  Кращий настрій       →  Більше мотивації
Рефлексія         →  Ясність цілей     →  Фокус на важливому   →  Кращі результати
```

Knome бачить **повну картину** людини і діє відповідно. Це не набір окремих інструментів — це один агент з багатьма доменами знань про тебе.

**Місія:** стати найрозумнішим персональним помічником, який знає тебе краще ніж будь-який окремий додаток.

---

## Для кого

- **Основна аудиторія:** особисте використання (1-3 людини)
- **Профіль користувача:** людина яка хоче свідомо розвиватись у всіх сферах життя
- **Не є масовим продуктом** на старті — це персональний інструмент якості

---

## Що вміє Knome

### Onboarding і Профіль
- Природна розмова при першому знайомстві — без нудних анкет
- Поступово формує детальний профіль через діалог
- Виявляє зв'язки між доменами автоматично
- Оновлює профіль в реальному часі в процесі використання
- Калібрує припущення: "Схоже ти вчишся краще ввечері — вірно?"

### Навчання
- Будує персональний curriculum під конкретну ціль
- Вибирає формат матеріалу (відео / текст / задачі) під стиль навчання
- Трекає засвоєння кожної теми через DKT модель
- Нагадує про повторення по кривій забування (SM-2)
- Адаптує план якщо темп навчання змінився
- Передбачає де людина застрягне — превентивна допомога
- Читацький трекер (книги, статті, нотатки до них)
- Мовний модуль (вивчення іноземних мов + SM-2)
- Трекінг сертифікатів і курсів (Coursera, Udemy тощо)

### Фінанси
- Додавання витрат через чат або форму ("витратив 500 грн на їжу")
- Автоматична класифікація транзакцій через NLP
- Мультивалютний бюджет (UAH, USD, EUR та інші)
- Прогноз витрат на наступний місяць (LSTM модель)
- Виявлення аномальних витрат (Isolation Forest)
- Тижневі та місячні звіти
- Поради де скоротити витрати
- Трекінг фінансових цілей (накопичення, великі покупки)
- Monobank API інтеграція (автоматичний імпорт)
- Менеджер підписок (Netflix, Spotify тощо — скільки витрачаєш щомісяця)
- Трекер боргів і позик (хто кому скільки)
- Net Worth трекер (активи мінус пасиви)
- Нагадування про оплату рахунків
- Податковий трекер (для фрілансерів)

### Здоров'я і Фітнес
- Щоденний check-in через чат або форму (сон, настрій, активність)
- Два способи додавання їжі: фото (CV) або текст
- Аналіз настрою через щоденні нотатки (Sentiment Analysis)
- Трекінг звичок і streak-и
- Передбачення ризику зриву звички
- Попередження про burnout за 3-7 днів наперед
- Трекер ваги і замірів тіла
- Hydration tracker (скільки води випив)
- Трекер відновлення (м'язова втома, дні відпочинку)
- Нагадування про ліки і БАДи

### Тренування — Конструктор програм ⭐
- **Персональний конструктор програм тренувань:**
  - Вибір мети (схуднення / набір маси / сила / витривалість / тонус)
  - Вибір кількості днів на тиждень (2-6)
  - Вибір доступного обладнання (штанга / гантелі / тренажери / без обладнання)
  - Вибір рівня підготовки (початківець / середній / просунутий)
  - Вибір тривалості тренування (30 / 45 / 60 / 90 хв)
  - AI генерує повну програму з вправами, підходами, повтореннями
- **Бібліотека вправ:** опис, техніка, м'язові групи, відео (посилання)
- **Трекінг тренувань:** вага, підходи, повторення, час
- **Прогресія навантажень:** автоматичне підвищення ваги/повторень по прогресу
- **Адаптація програми:** якщо пропускаєш тренування — план перебудовується
- **Periodization:** циклічність (мезо/макроцикли) для просунутих
- **Деload тижні:** автоматичне планування відпочинку кожні 4-6 тижнів
- **Кардіо інтеграція:** HIIT, LISS, кількість кроків
- **Muscle group баланс:** агент стежить щоб не було дисбалансу груп м'язів

### Продуктивність і Задачі
- Щоденний план (3 головні задачі дня)
- Taск-менеджер з пріоритетами і дедлайнами
- Pomodoro таймер вбудований в чат
- Time tracking (скільки часу на що витрачаєш)
- Тижневий огляд (що зробив, що ні, чому)
- Проекти і підзадачі
- ML: передбачення коли ти найпродуктивніший по часу дня

### Рефлексія і Ментальне здоров'я
- Щоденний журнал (вільний текст)
- Gratitude journal (3 речі за які вдячний)
- Трекер стресу і тригерів
- Медитація трекер
- Тижнева рефлексія з AI аналізом
- ML: sentiment trends + виявлення тригерів стресу

### Стосунки і Соціальне
- Особистий CRM — важливі контакти
- Важливі дати (дні народження, річниці)
- "Давно не спілкувався з X" — розумні нагадування
- Ідеї подарунків для людей
- Трекінг зустрічей і домовленостей

### Кар'єра і Розвиток
- Портфоліо навичок (що вмію, на якому рівні)
- Трекер вакансій (якщо шукаєш роботу)
- Нетворкінг трекер
- Досягнення і кейси (для резюме)
- Зарплатний трекер і динаміка
- ML: gap analysis між поточними скілами і бажаною позицією

### Побут і Дім
- Нагадування обслуговування (авто, техніка, ремонт)
- Розумний список покупок (пам'ятає що купуєш регулярно)
- Планування їжі на тиждень (meal prep)
- Контакти майстрів і сервісів

### Подорожі і Глобальні Цілі
- Bucket list з прогресом
- Планування поїздок
- Трекер подорожей (де вже був)
- Цілі на рік / 5 років / 10 років

### Cross-Domain (найцінніше)
- Виявлення кореляцій між усіма сферами
- Проактивні інсайти по всіх доменах одночасно
- Пріоритизація: що зараз важливіше фокусувати
- Тижневий звіт по всьому одночасно

### Проактивність
- Ранковий check-in і вечірній підсумок
- Тижневий AI-звіт написаний природною мовою
- Розумні нагадування на основі патернів поведінки
- Попередження до того як проблема стала серйозною
- Максимум 2 проактивних повідомлення на день

### Інтерфейс
- Мови: українська і англійська з перемикачем
- Теми: темна і світла з перемикачем
- Основний чат + дашборди по кожному домену
- Графіки прогресу і трендів
- Адаптивний дизайн для браузера на телефоні

---

## Архітектура системи

```
┌─────────────────────────────────────────────────────────┐
│                    WEB INTERFACE                        │
│              React + TailwindCSS + i18n                 │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTP / WebSocket
┌──────────────────────────▼──────────────────────────────┐
│                   FastAPI BACKEND                       │
│                                                         │
│   ┌─────────────────────────────────────────────────┐   │
│   │              ORCHESTRATOR AGENT                 │   │
│   │                  (LangGraph)                    │   │
│   │                                                 │   │
│   │   Класифікує інтент → вибирає домен агента     │   │
│   │   Збирає контекст з Knowledge Graph            │   │
│   │   Оновлює граф після кожної взаємодії          │   │
│   └──┬──────┬──────┬──────┬──────┬──────┬──────────┘   │
│      │      │      │      │      │      │                │
│   Learn  Financ Health Workout Produc Reflect           │
│   Agent  Agent  Agent  Agent   Agent   Agent  ...       │
│      │      │      │      │      │      │                │
│   ┌──▼──────▼──────▼──────▼──────▼──────▼────────────┐  │
│   │                ML / DL LAYER                      │  │
│   │  DKT │ LSTM │ IsoForest │ Sentiment │ CV │ RF ... │  │
│   └───────────────────────────────────────────────────┘  │
│                                                         │
│   ┌─────────────────────────────────────────────────┐   │
│   │            KNOWLEDGE GRAPH (Kuzu)               │   │
│   └─────────────────────────────────────────────────┘   │
│                                                         │
│   ┌─────────────────────────────────────────────────┐   │
│   │         TRIGGER ENGINE (APScheduler)            │   │
│   └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
    ┌─────────▼────────┐    ┌───────────▼────────────┐
    │   LLM (Ollama)   │    │  Зовнішні API          │
    │  dev: локально   │    │  Nutritionix, Monobank  │
    │  prod: Claude/   │    │  ExerciseDB, OpenFoodDB │
    │        GPT-4V    │    └────────────────────────┘
    └──────────────────┘
```

---

## Knowledge Graph

### Схема вузлів (Nodes) — повна

```
# Ядро
User            → id, name, age, language, timezone, created_at

# Навчання
Goal            → domain, description, deadline, status
Skill           → name, domain, level (0.0-1.0)
Topic           → name, domain, difficulty, parent_topic
Resource        → url, type (video/text/task), topic_id
LearningSession → date, topic_id, duration, result
Book            → title, author, status, rating, notes, pages_total, pages_read
Certificate     → name, provider, date, url

# Фінанси
Transaction     → date, amount, currency, category, description, source
Budget          → category, limit_amount, period
FinancialGoal   → name, target_amount, current_amount, deadline
Subscription    → name, amount, currency, billing_cycle, category, next_billing
Debt            → person, amount, currency, direction (owe/owed), due_date
Asset           → name, type, value, currency, updated_at

# Здоров'я
Habit           → name, frequency, streak, status, domain
CheckIn         → date, sleep_hours, mood (1-10), energy (1-10), water_ml
FoodEntry       → date, name, calories, protein, fat, carbs, method
BodyMeasurement → date, weight, body_fat, measurements{}
Medication      → name, dose, frequency, start_date, notes

# Тренування
WorkoutProgram  → id, name, goal, days_per_week, equipment[], level,
                   duration_min, created_at, is_active
WorkoutDay      → program_id, day_number, name, muscle_groups[]
Exercise        → name, muscle_group, equipment, type, description, video_url
WorkoutSession  → date, program_id, duration, exercises_done[], notes, rating
ExerciseLog     → session_id, exercise_id, sets[], reps[], weight[], rpe

# Продуктивність
Task            → title, priority (1-5), status, due_date, project, domain
Project         → name, description, status, deadline, tasks[]
PomodoroSession → date, task_id, duration, completed
TimeBlock       → date, start, end, category, description

# Рефлексія
JournalEntry    → date, text, mood, energy, tags[]
GratitudeEntry  → date, items[] (3 речі)
WeeklyReview    → week, wins[], challenges[], next_week_focus[]

# Стосунки
Contact         → name, relationship_type, birthday, notes, tags[]
Interaction     → contact_id, date, type, notes
GiftIdea        → contact_id, idea, occasion, budget, status

# Кар'єра
CareerSkill     → name, level, category, verified, last_used
JobApplication  → company, role, status, applied_date, notes
Achievement     → title, description, date, impact, skills_used[]
SalaryEntry     → date, amount, currency, company, role

# Побут
HomeTask        → name, category, frequency, last_done, next_due
ShoppingItem    → name, category, quantity, regular (bool)
MealPlan        → week, days{}, prep_notes

# Цілі і Подорожі
LifeGoal        → title, timeframe (1yr/5yr/10yr), status, progress
BucketItem      → title, category, status, date_done, notes
Trip            → destination, dates, status, budget, notes

# Cross-Domain
Pattern         → type, description, confidence, domains[]
Insight         → date, text, domains[], priority
```

### Схема зв'язків (Edges) — повна

```
# Навчання
(User)-[HAS_GOAL]->(Goal)
(User)-[HAS_SKILL]->(Skill)
(User)-[COMPLETED]->(LearningSession)
(User)-[READING]->(Book)
(Goal)-[REQUIRES]->(Skill)
(Skill)-[MEASURED_BY]->(Topic)
(LearningSession)-[COVERED]->(Topic)

# Фінанси
(User)-[MADE]->(Transaction)
(User)-[HAS_BUDGET]->(Budget)
(User)-[HAS_SUBSCRIPTION]->(Subscription)
(User)-[HAS_ASSET]->(Asset)

# Здоров'я
(User)-[HAS_HABIT]->(Habit)
(User)-[LOGGED]->(CheckIn)
(User)-[LOGGED]->(FoodEntry)
(User)-[MEASURED]->(BodyMeasurement)

# Тренування
(User)-[HAS_PROGRAM]->(WorkoutProgram)
(WorkoutProgram)-[HAS_DAY]->(WorkoutDay)
(WorkoutDay)-[INCLUDES]->(Exercise)
(User)-[DID_SESSION]->(WorkoutSession)
(WorkoutSession)-[LOGGED]->(ExerciseLog)
(ExerciseLog)-[FOR_EXERCISE]->(Exercise)

# Продуктивність
(User)-[HAS_TASK]->(Task)
(User)-[HAS_PROJECT]->(Project)
(Task)-[BELONGS_TO]->(Project)
(User)-[DID_POMODORO]->(PomodoroSession)

# Рефлексія
(User)-[WROTE]->(JournalEntry)
(User)-[GRATEFUL]->(GratitudeEntry)
(User)-[REVIEWED]->(WeeklyReview)

# Стосунки
(User)-[KNOWS]->(Contact)
(User)-[HAD]->(Interaction)
(Interaction)-[WITH]->(Contact)

# Cross-Domain
(Pattern)-[CONNECTS]->(CheckIn, Transaction, WorkoutSession, Task)
(Insight)-[BASED_ON]->(Pattern)
```

---

## Агентна система

### Фреймворк: LangGraph

```
START → [intent_classifier] → domain agent → [update_graph] → END
```

`KnomeState` (TypedDict): `messages`, `user_id`, `intent`, `domain`,
`graph_context`, `active_agent`, `response`, `graph_updates`

### Агенти (повний список)

```
onboarding      — перше знайомство, 4 фази
orchestrator    — cross-domain аналіз і routing
learning        — навчання, книги, мови, сертифікати
financial       — витрати, бюджет, цілі, підписки
health          — check-in, їжа, звички, здоров'я
workout         — програми тренувань, логування, прогресія
productivity    — задачі, проекти, pomodoro, time tracking
reflection      — журнал, gratitude, тижневий огляд
relationships   — контакти, дати, нагадування
career          — навички, досягнення, вакансії
home            — побутові задачі, покупки, meal plan
goals           — bucket list, цілі на роки
```

### Конструктор програм тренувань — детально

```
Крок 1 — Збір параметрів через чат:
  "Яка твоя ціль?" → схуднення / маса / сила / тонус / витривалість
  "Скільки днів на тиждень?" → 2 / 3 / 4 / 5 / 6
  "Яке обладнання є?" → тренажерний зал / гантелі / штанга / дім
  "Рівень підготовки?" → початківець / середній / просунутий
  "Скільки часу на тренування?" → 30 / 45 / 60 / 90 хв

Крок 2 — AI генерує програму:
  WorkoutProgram {
    name: "Push-Pull-Legs 4x тиждень",
    goal: "сила",
    days: [
      { name: "Push A", exercises: [
          { name: "Жим штанги лежачи", sets: 4, reps: "5", rest: 180 },
          { name: "Жим гантелей під кутом", sets: 3, reps: "8-10", rest: 90 },
          { name: "Трицепс блок", sets: 3, reps: "12", rest: 60 },
        ]
      },
      { name: "Pull A", exercises: [...] },
      ...
    ]
  }

Крок 3 — Логування тренування:
  Юзер: "зробив тренування, жим 80кг 4x5"
  Агент парсить → ExerciseLog → оновлює граф

Крок 4 — Прогресія (автоматично):
  Якщо юзер виконав всі підходи → наступного разу +2.5кг або +1 повтор
  Якщо не виконав → залишаємо вагу або -5%

Крок 5 — Адаптація:
  Пропустив 2+ тренування → програма перебудовується
  Деload кожні 4-6 тижнів → -40% об'єму автоматично
  Muscle imbalance detected → Knome пропонує корективи

ML компонент:
  Random Forest → передбачення RPE (рівень важкості) для наступного тренування
  Time series → трекінг 1RM прогресу по основних вправах
```

---

## ML / DL компоненти

### Існуючі (Фази 1-5)

```
DKT (LSTM)          — Knowledge Tracing для навчання
LSTM Forecasting    — прогноз витрат
Isolation Forest    — anomaly detection у витратах
XLM-RoBERTa         — sentiment analysis нотаток
Transaction NLP     — класифікація транзакцій
Burnout Predictor   — Random Forest, ризик вигорання
Food Vision         — LLaVA / Claude Vision
SM-2                — інтервальні повторення
```

### Нові (Фази 6-8)

```
Workout Progression — прогресія навантажень (rule-based + RF)
1RM Tracker         — time series прогресу сили
Productivity Clock  — коли ти найпродуктивніший (clustering)
Relationship Health — частота контактів → health score
Meal Suggester      — рекомендації їжі на тиждень (CF)
Goal Predictor      — коли досягнеш цілі при поточному темпі
```

---

## Cold Start стратегія

```
День 1-7:    Rule-based + pre-trained (sentiment, food vision)
День 8-30:   Fine-tuning на твоїх даних починається
День 31-60:  DKT, Burnout, Workout Progression активні
День 61-90:  LSTM Forecasting активний (потрібно 90 днів)
День 90+:    Всі моделі повністю персоналізовані
```

---

## Проактивність

### Trigger Engine — повний список тригерів

```
Time-based:
  09:00 щодня      — ранковий check-in
  21:00 щодня      — вечірній підсумок (якщо не зробив)
  Неділя 10:00     — тижневий AI-звіт
  1-ше місяця      — місячний фінансовий звіт

Event-based:
  Витрата > ліміту       — фінансовий alert
  Сон < 5 год            — попередження
  Тренування пропущено   — нагадування про програму
  Дедлайн задачі завтра  — нагадування
  День народження друга  — нагадування за 3 дні
  Підписка списується    — нагадування за 2 дні

Pattern-based:
  3 дні без навчання         — learning trigger
  4 дні поганого настрою     — mental health trigger
  Витрати ↑ 40% за тиждень  — financial trigger
  Тиждень без тренування     — workout trigger
  7 днів без журналу         — reflection trigger
  Давно не контактував з X   — relationship trigger

Cross-domain:
  Стрес + пропущені тренування → burnout risk
  Поганий сон + дедлайн навчання → полегшити план
  Витрати на їжу ↑ + поганий настрій → корекція
```

---

## Інтерфейс і дизайн

### Структура сторінок — повна

```
/ → redirect
│
├── /onboarding              ← перший запуск
├── /login                   ← вхід / реєстрація
├── /chat                    ← головний чат (завжди доступний)
├── /dashboard               ← загальний огляд всього
│
├── /learning
│   ├── /curriculum          ← поточний план
│   ├── /progress            ← графіки засвоєння
│   ├── /session             ← активна сесія
│   ├── /books               ← читацький трекер
│   └── /certificates        ← сертифікати
│
├── /finance
│   ├── /overview            ← бюджет і баланс
│   ├── /transactions        ← список транзакцій
│   ├── /goals               ← фінансові цілі
│   ├── /subscriptions       ← менеджер підписок
│   └── /net-worth           ← активи і пасиви
│
├── /health
│   ├── /checkin             ← щоденний check-in
│   ├── /habits              ← трекер звичок
│   ├── /nutrition           ← їжа і КБЖУ
│   ├── /measurements        ← вага і заміри
│   └── /trends              ← графіки самопочуття
│
├── /workout                 ← ⭐ НОВИЙ ДОМЕН
│   ├── /programs            ← мої програми тренувань
│   ├── /builder             ← конструктор програми
│   ├── /session             ← поточне тренування
│   ├── /exercises           ← бібліотека вправ
│   └── /progress            ← прогрес сили і об'ємів
│
├── /productivity            ← НОВИЙ ДОМЕН
│   ├── /today               ← план на сьогодні
│   ├── /tasks               ← всі задачі
│   ├── /projects            ← проекти
│   └── /pomodoro            ← таймер
│
├── /reflection              ← НОВИЙ ДОМЕН
│   ├── /journal             ← щоденник
│   ├── /gratitude           ← gratitude journal
│   └── /weekly              ← тижнева рефлексія
│
├── /relationships           ← НОВИЙ ДОМЕН
│   ├── /contacts            ← CRM контакти
│   └── /calendar            ← важливі дати
│
├── /career                  ← НОВИЙ ДОМЕН
│   ├── /skills              ← портфоліо навичок
│   ├── /achievements        ← досягнення
│   └── /applications        ← трекер вакансій
│
├── /goals                   ← НОВИЙ ДОМЕН
│   ├── /life                ← цілі на роки
│   └── /bucket              ← bucket list
│
└── /settings
    ├── /profile
    ├── /preferences
    └── /privacy
```

---

## Приватність і безпека

```
НА ПРИСТРОЇ:                    НА СЕРВЕР іде тільки:
├── Knowledge Graph (Kuzu)      ├── LLM запити (анонімізовані)
├── ML моделі (ONNX)            ├── Nutritionix API запити
├── Всі персональні дані        └── Оновлення pre-trained моделей
└── SQLite (auth, metadata)

Шифрування:    SQLite з SQLCipher (AES-256)
Анонімізація:  імена → [USER], суми → [AMOUNT] перед LLM
Контроль:      повний JSON export, cascade delete, гранулярні дозволи
```

---

## Технологічний стек

### Backend (Python)

```
FastAPI          — HTTP API і WebSocket
LangGraph        — агентний фреймворк
Kuzu             — Knowledge Graph (dev), Neo4j (prod)
SQLite           — auth і session metadata
APScheduler      — тригери і проактивність
PyTorch          — DKT, LSTM
scikit-learn     — Isolation Forest, Random Forest
HuggingFace      — XLM-RoBERTa, sentence-transformers
Ollama + LLaVA   — LLM і vision (dev)
slowapi          — rate limiting
python-jose      — JWT auth
bcrypt           — хешування паролів
```

### Frontend (JavaScript)

```
React            — UI фреймворк
TailwindCSS      — стилізація
Recharts         — графіки і дашборди
react-i18next    — UA + EN
Zustand          — стан
React Router     — навігація
Axios            — HTTP
```

### Зовнішні API

```
Ollama + LLaVA   — локальний LLM + vision (dev)
Claude / GPT-4V  — production LLM + vision
Nutritionix API  — КБЖУ продуктів
Monobank API     — банківська інтеграція ✅
ExerciseDB API   — база вправ (безкоштовно)
Open Food Facts  — альтернатива Nutritionix (open source)
```

---

## Фази розробки

### Фаза 1 — Фундамент ✅ ЗАВЕРШЕНО
```
✓ FastAPI + React + Kuzu scaffold
✓ Knowledge Graph схема (15 Node + 14 Rel tables)
✓ LangGraph 4-фазний Onboarding Agent
✓ WebSocket + word-by-word streaming
✓ UA/EN i18n, Dark/Light тема
```

### Фаза 2 — Domain MVP ✅ ЗАВЕРШЕНО
```
✓ Orchestrator з intent classifier
✓ Learning, Financial, Health агенти (rule-based)
✓ REST endpoints для всіх доменів
✓ Dashboard, Learning, Finance, Health сторінки
✓ NavBar
```

### Фаза 3 — ML і AI ✅ ЗАВЕРШЕНО
```
✓ Ollama інтеграція (qwen2.5:7b)
✓ LLM Streaming токен-за-токеном
✓ Transaction Classifier
✓ SM-2 Spaced Repetition
✓ Food Vision (LLaVA)
✓ Cross-domain context і insights API
```

### Фаза 4 — Проактивність і Cross-Domain ✅ ЗАВЕРШЕНО
```
✓ Trigger Engine (APScheduler) — 3 типи тригерів
✓ Burnout Predictor (rule-based + RF stub)
✓ Spending Forecaster (linear + LSTM stub)
✓ Dashboard ML cards
✓ Pattern detection в KnomeState
```

### Фаза 5 — Production Polish 🔄 В ПРОЦЕСІ
```
✓ Word-by-word streaming (_stream_text)
✓ Frontend streaming (useChat.js)
✓ JWT Authentication (register/login/me)
✓ Login/Register сторінка
✓ Monobank API інтеграція
✓ Settings сторінка
✓ Data export і delete account
✓ Rate limiting (slowapi)
✓ Error Boundary
✓ Structured logging
⬜ Refresh token
⬜ WebSocket JWT перевірка
```

### Фаза 6 — Розширення Health + Тренування + Продуктивність
```
⬜ WorkoutProgram конструктор (AI генерація)
⬜ WorkoutDay і Exercise бібліотека (ExerciseDB API)
⬜ WorkoutSession логування (чат + форма)
⬜ Прогресія навантажень (rule-based → RF)
⬜ 1RM трекер і графіки прогресу сили
⬜ Deload автоматичний scheduler
⬜ Hydration tracker
⬜ BodyMeasurement трекер
⬜ Task manager (Today / All tasks / Projects)
⬜ Pomodoro таймер
⬜ Time tracking базовий
⬜ /workout і /productivity сторінки
⬜ Нові Knowledge Graph ноди (WorkoutProgram, Task, Project...)
```

### Фаза 7 — Рефлексія + Стосунки + Кар'єра + Finance розширення
```
⬜ Journal щоденник (текст + теги + настрій)
⬜ Gratitude journal
⬜ Weekly Review з AI аналізом
⬜ Sentiment trends на графіках
⬜ Personal CRM (контакти, дати, нагадування)
⬜ Gift ideas tracker
⬜ Career skills portfolio
⬜ Achievements tracker
⬜ Job applications tracker
⬜ Subscriptions manager
⬜ Net Worth tracker
⬜ Debt tracker
⬜ /reflection, /relationships, /career, /finance/subscriptions сторінки
```

### Фаза 8 — Побут + Цілі + Advanced ML + Polish
```
⬜ Home tasks і maintenance reminders
⬜ Smart shopping list
⬜ Meal planning на тиждень
⬜ Bucket list
⬜ Life goals (1yr/5yr/10yr)
⬜ Trip planner
⬜ Productivity Clock ML (коли найпродуктивніший)
⬜ Goal Predictor ML (коли досягнеш цілі)
⬜ Advanced cross-domain insights (всі нові домени)
⬜ PWA (Progressive Web App)
⬜ Docker Compose prod deploy
⬜ Neo4j міграція (опційно)
```

---

## Майбутні функції

### Короткострокові (після Фази 8)
- **Голосовий input** — диктувати замість друкувати
- **Apple Health / Google Fit** — автоматичні дані про сон і активність
- **ПриватБанк API** — альтернативна банківська інтеграція
- **Recommendation Engine v2** — collaborative filtering (2-3 юзери)

### Довгострокові
- **PWA** — встановлюється як додаток на телефоні
- **Knome API** — дозволити іншим додаткам читати/писати в граф
- **Fine-tuned персональна модель** — повністю натренована на твоїх даних
- **Wearables** — Garmin, Fitbit, Apple Watch інтеграція

---

## Технічні нотатки

```
$desc — зарезервоване слово Kuzu → використовувати $tx_desc
Kuzu API: result.has_next() / result.get_next() (snake_case)
LangGraph: всі node-функції мають бути async
Streaming протокол: {token: "word "} → ... → {done: True[, extra...]}
JWT: 30 днів, HS256, секрет в env JWT_SECRET
Auth DB: SQLite окремо від Kuzu, шлях ./data/auth.db
Kuzu concurrent: тільки 1 процес — при помилці "Could not set lock" → вбити python.exe
```

---

## Швидкий старт

```bash
# Backend
cd backend
venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn main:app --reload    # localhost:8000

# Frontend
cd frontend
npm install
npm run dev                  # localhost:5173

# LLM (опційно для живих відповідей)
ollama serve
ollama pull qwen2.5:7b
ollama pull llava

# Відкрити: http://localhost:5173
```

---

## Структура проекту (поточна + майбутня)

```
KNOME/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── agents/
│   │   ├── orchestrator.py      ✅
│   │   ├── onboarding.py        ✅
│   │   ├── learning.py          ✅
│   │   ├── financial.py         ✅
│   │   ├── health.py            ✅
│   │   ├── workout.py           ⬜ Фаза 6
│   │   ├── productivity.py      ⬜ Фаза 6
│   │   ├── reflection.py        ⬜ Фаза 7
│   │   ├── relationships.py     ⬜ Фаза 7
│   │   ├── career.py            ⬜ Фаза 7
│   │   └── goals.py             ⬜ Фаза 8
│   ├── api/
│   │   ├── auth.py              ✅
│   │   ├── chat.py              ✅
│   │   ├── learning.py          ✅
│   │   ├── finance.py           ✅
│   │   ├── health_domain.py     ✅
│   │   ├── insights.py          ✅
│   │   ├── ml.py                ✅
│   │   ├── workout.py           ⬜ Фаза 6
│   │   ├── productivity.py      ⬜ Фаза 6
│   │   ├── reflection.py        ⬜ Фаза 7
│   │   └── relationships.py     ⬜ Фаза 7
│   ├── auth/
│   │   ├── db.py                ✅
│   │   └── security.py          ✅
│   ├── graph/
│   │   ├── schema.py            ✅
│   │   ├── queries.py           ✅
│   │   └── patterns.py          ✅
│   ├── llm/
│   │   ├── client.py            ✅
│   │   ├── prompts.py           ✅
│   │   ├── context.py           ✅
│   │   └── insights.py          ✅
│   ├── ml/
│   │   ├── sm2.py               ✅
│   │   ├── burnout.py           ✅
│   │   ├── forecasting.py       ✅
│   │   ├── classifier.py        ✅
│   │   ├── workout_progression.py ⬜ Фаза 6
│   │   └── productivity_clock.py  ⬜ Фаза 8
│   ├── triggers/
│   │   ├── engine.py            ✅
│   │   ├── rules.py             ✅
│   │   └── store.py             ✅
│   └── integrations/
│       ├── base.py              ✅
│       ├── manual.py            ✅
│       └── monobank.py          ✅
│
├── frontend/src/
│   ├── pages/
│   │   ├── Login.jsx            ✅
│   │   ├── Onboarding.jsx       ✅
│   │   ├── Chat.jsx             ✅
│   │   ├── Dashboard.jsx        ✅
│   │   ├── Learning.jsx         ✅
│   │   ├── Finance.jsx          ✅
│   │   ├── Health.jsx           ✅
│   │   ├── Workout.jsx          ⬜ Фаза 6
│   │   ├── Productivity.jsx     ⬜ Фаза 6
│   │   ├── Reflection.jsx       ⬜ Фаза 7
│   │   ├── Relationships.jsx    ⬜ Фаза 7
│   │   ├── Career.jsx           ⬜ Фаза 7
│   │   └── Goals.jsx            ⬜ Фаза 8
│   ├── locales/
│   │   ├── ua.json              ✅
│   │   └── en.json              ✅
│   └── store/index.js           ✅
│
├── CLAUDE.md                    ✅
├── KNOME_PROJECT.md             ✅
└── PROGRESS.md                  ✅
```

---

*Knome — Know Me. Агент який знає тебе повністю.*
