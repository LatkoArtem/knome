# KNOME
### *Know Me — Personal Life OS Agent*

> Knome — це персональний AI агент який знайомиться з тобою, вивчає твої паттерни і стає розумним помічником у трьох ключових сферах: навчання, фінанси і здоров'я. Він не просто відповідає на запити — він знає тебе.

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

Більшість людей живуть розрізнено — здоров'я, гроші і навчання існують окремо у різних додатках. Але насправді ці сфери глибоко пов'язані:

```
Фінансовий стрес  →  Поганий сон  →  Низька концентрація  →  Гірше навчання
Нові знання       →  Нова робота  →  Більший дохід        →  Менше стресу
Гарний сон        →  Більше енергії → Краща продуктивність → Швидше навчання
```

Knome бачить **повну картину** людини і діє відповідно. Це не три окремі інструменти — це один агент з трьома доменами знань про тебе.

**Місія:** стати найрозумнішим персональним помічником, який знає тебе краще ніж будь-який окремий додаток.

---

## Для кого

- **Основна аудиторія:** особисте використання (1-3 людини)
- **Профіль користувача:** людина яка хоче свідомо розвиватись у навчанні, контролювати фінанси і стежити за здоров'ям
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
- Нагадує про повторення по кривій забування Еббінгауза
- Адаптує план якщо темп навчання змінився
- Передбачає де людина застрягне — превентивна допомога
- Рекомендує ресурси на основі схожих профілів

### Фінанси
- Додавання витрат через чат або форму ("витратив 500 грн на їжу")
- Автоматична класифікація транзакцій через NLP
- Мультивалютний бюджет (UAH, USD, EUR та інші)
- Прогноз витрат на наступний місяць (LSTM модель)
- Виявлення аномальних витрат (Isolation Forest)
- Тижневі та місячні звіти
- Поради де скоротити витрати
- Трекінг фінансових цілей (накопичення, великі покупки)
- Архітектура підготована для майбутньої інтеграції з Monobank API

### Здоров'я
- Щоденний check-in через чат або форму (сон, настрій, активність)
- Два способи додавання їжі на вибір юзера:
  - Фото страви → CV аналіз → КБЖУ автоматично
  - Ручний ввід тексту → "з'їв борщ і хліб" → агент парсить
- Аналіз настрою через щоденні нотатки (Sentiment Analysis)
- Трекінг звичок і streak-и
- Передбачення ризику зриву звички
- Попередження про burnout за 3-7 днів наперед
- Персональний план активності адаптований по прогресу

### Cross-Domain (найцінніше)
- Виявлення кореляцій між усіма трьома сферами
- Проактивні інсайти: "Коли ти витрачаєш більше на доставку їжі — наступні 2 дні продуктивність навчання падає"
- Пріоритизація: що зараз важливіше фокусувати
- Тижневий звіт по всьому одночасно

### Проактивність
- Ранковий check-in і вечірній підсумок
- Тижневий AI-звіт написаний природною мовою
- Розумні нагадування на основі патернів поведінки
- Попередження до того як проблема стала серйозною
- Максимум 2 проактивних повідомлення на день — не спамить

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
│   └──────┬─────────────┬──────────────┬────────────┘   │
│          │             │              │                  │
│   ┌──────▼──┐   ┌──────▼──┐   ┌──────▼──┐              │
│   │Learning │   │Financial│   │ Health  │              │
│   │  Agent  │   │  Agent  │   │  Agent  │              │
│   └──────┬──┘   └──────┬──┘   └──────┬──┘              │
│          │             │              │                  │
│   ┌──────▼─────────────▼──────────────▼────────────┐   │
│   │                ML / DL LAYER                   │   │
│   │  DKT │ LSTM │ Isolation Forest │ Sentiment │ CV │   │
│   └──────────────────────────────────────────────── ┘   │
│                                                         │
│   ┌─────────────────────────────────────────────────┐   │
│   │            KNOWLEDGE GRAPH (Kuzu)               │   │
│   │         Персональні дані і зв'язки              │   │
│   └─────────────────────────────────────────────────┘   │
│                                                         │
│   ┌─────────────────────────────────────────────────┐   │
│   │              TRIGGER ENGINE                     │   │
│   │    APScheduler — проактивні повідомлення        │   │
│   └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
    ┌─────────▼────────┐    ┌───────────▼────────┐
    │   LLM (Ollama)   │    │  Зовнішні API      │
    │  dev: локально   │    │  Nutritionix (їжа) │
    │  prod: Claude/   │    │  Майбутнє: Mono    │
    │        GPT-4V    │    └────────────────────┘
    └──────────────────┘
```

---

## Knowledge Graph

Граф — серце Knome. Він зберігає не просто дані, а **зв'язки між ними**.

### Чому граф, а не SQL

| Підхід | Проблема для Knome |
|---|---|
| JSON файл | Не відображає зв'язки між фактами |
| SQL таблиці | Складно робити cross-domain запити |
| Vector DB (тільки) | Добре для пошуку, погано для логіки |
| **Knowledge Graph** | Зв'язки — перша класова сутність ✅ |

### Інструмент

- **Розробка:** Kuzu — легкий, embedded, не потребує окремого сервера
- **Продакшн:** Neo4j — якщо масштаб виросте

### Схема вузлів (Nodes)

```
User          → id, name, age, language, created_at
Goal          → domain, description, deadline, status
Skill         → name, domain, level (0.0-1.0)
Topic         → name, domain, difficulty, parent_topic
Resource      → url, type (video/text/task), topic_id
LearningSession → date, topic_id, duration, result
Habit         → name, frequency, streak, status
CheckIn       → date, sleep_hours, mood (1-10), energy (1-10)
FoodEntry     → date, name, calories, protein, fat, carbs, method (photo/manual)
Transaction   → date, amount, currency, category, description
Budget        → category, limit_amount, period
FinancialGoal → name, target_amount, current_amount, deadline
Pattern       → type, description, confidence, domains[]
Insight       → date, text, domains[], priority
```

### Схема зв'язків (Edges)

```
(User)-[HAS_GOAL]->(Goal)
(User)-[HAS_SKILL]->(Skill)
(User)-[HAS_HABIT]->(Habit)
(User)-[COMPLETED]->(LearningSession)
(User)-[LOGGED]->(CheckIn)
(User)-[LOGGED]->(FoodEntry)
(User)-[MADE]->(Transaction)
(Goal)-[REQUIRES]->(Skill)
(Skill)-[MEASURED_BY]->(Topic)
(Topic)-[HAS_RESOURCE]->(Resource)
(LearningSession)-[COVERED]->(Topic)
(Pattern)-[CONNECTS]->(CheckIn, Transaction)   ← cross-domain
(Insight)-[BASED_ON]->(Pattern)
```

### Приклад реального графу юзера

```
(User: Олег)
    │
    ├──[HAS_GOAL]──► (Goal: вивчити Python)
    │                    │
    │              [REQUIRES]──► (Skill: алгоритми, level: 0.3)
    │                                │
    │                          [MEASURED_BY]──► (Topic: sorting algorithms)
    │
    ├──[HAS_HABIT]──► (Habit: пити воду, streak: 12 днів)
    │
    ├──[LOGGED]──► (CheckIn: 2024-01-15, sleep: 5.5h, mood: 4)
    │                  │
    │            [CONNECTS via Pattern]──► (Transaction: їжа +40%)
    │                                          │
    │                                    [GENERATES]──► (Insight: "стресовий тиждень")
    │
    └──[MADE]──► (Transaction: Silpo, 450 UAH, category: їжа)
```

---

## Агентна система

### Фреймворк: LangGraph

Вибір LangGraph обґрунтований специфікою Knome:

- Knome потребує **складного управління станом** — Knowledge Graph + профіль + 3 домени одночасно
- Потрібні **довготривалі сесії** з персистентністю між розмовами
- LangGraph 1.0 став стабільним у жовтні 2025 — production ready
- Граф-подібна структура фреймворку ідеально відповідає граф-подібній структурі даних

### Граф агентів (LangGraph nodes)

```
START
  │
  ▼
[intent_classifier]        ← визначає домен і тип запиту
  │
  ├── learning_intent ──► [learning_agent] ──► [update_graph] ──► END
  │
  ├── financial_intent ─► [financial_agent] ─► [update_graph] ──► END
  │
  ├── health_intent ────► [health_agent] ────► [update_graph] ──► END
  │
  ├── cross_domain ──────► [orchestrator] ───► [update_graph] ──► END
  │
  └── onboarding ────────► [onboarding_agent] ► [build_graph] ──► END
```

### Orchestrator логіка

```python
# Псевдокод LangGraph стану

class KnomeState(TypedDict):
    messages: list[BaseMessage]
    user_id: str
    intent: str
    domain: str
    graph_context: dict       # дані з Knowledge Graph
    active_agent: str
    response: str
    graph_updates: list       # що оновити в графі після відповіді

def intent_classifier(state: KnomeState) -> KnomeState:
    # Класифікує: learning / financial / health / cross / onboarding
    # Якщо cross_domain → збирає контекст з усіх трьох доменів
    ...

def update_graph(state: KnomeState) -> KnomeState:
    # Зберігає нові дані в Knowledge Graph
    # Шукає нові паттерни і кореляції
    # Генерує інсайти якщо є що сказати
    ...
```

### Onboarding Agent — детально

Агент **не задає всі питання одразу** — веде природну розмову і поступово формує профіль.

```
Фаза 1 — Хто ти? (2-3 хв)
  "Привіт! Я Knome. Як тебе звати?"
  → ім'я, мова спілкування

Фаза 2 — Твоє життя зараз
  "Що зараз займає найбільше твого часу?"
  "Що тебе турбує найбільше?"
  "Які цілі на найближчі 3-6 місяців?"

Фаза 3 — Домени (природньо, не як анкета)
  Навчання: "Що хочеш вивчити? Як зазвичай навчаєшся?"
  Фінанси:  "Ведеш бюджет? Є якісь фінансові цілі?"
  Здоров'я: "Як зі сном і активністю? Є звички які хочеш виробити?"

Фаза 4 — Калібрування
  "Схоже ти — людина яка навчається краще ввечері. Вірно?"
  "Здається фінанси зараз важливіше ніж спорт — так?"
  → Агент перевіряє свої припущення

Результат: заповнений Knowledge Graph і перший персональний план
```

---

## Домени

### Домен 1: Learning Agent

**Що отримує з графу:**
- Поточні цілі навчання і рівень скілів
- Якість сну останніх днів (з Health домену)
- Рівень фінансового стресу (з Financial домену)

**Що робить:**
- Будує curriculum: ціль → підтеми → ресурси → порядок
- Після кожної сесії оновлює Knowledge Tracing модель
- Підбирає формат матеріалу під стиль: відео / текст / практика
- Нагадує про повторення по алгоритму інтервальних повторень

**Ресурси:** YouTube, статті, книги, задачі з LeetCode/Codewars (для tech)

---

### Домен 2: Financial Agent

**Що отримує з графу:**
- Всі транзакції і категорії витрат
- Фінансові цілі і поточний прогрес
- Рівень стресу (з Health — впливає на імпульсні покупки)

**Що робить:**
- Парсить витрати з природної мови: "витратив 200 на каву" → Transaction
- Класифікує категорії автоматично через NLP
- Прогнозує витрати на наступний місяць
- Попереджає про аномалії в режимі реального часу
- Формує тижневий фінансовий звіт

**Категорії витрат:**
```
Їжа (продукти, ресторани, доставка)
Транспорт (пальне, таксі, громадський)
Розваги (кіно, ігри, підписки)
Здоров'я (ліки, спортзал, лікарі)
Навчання (курси, книги, інструменти)
Комунальні послуги
Одяг і речі
Інше
```

**Майбутня інтеграція (архітектура вже закладена):**
```python
# Абстрактний інтерфейс — підготовлений для Mono API
class BankIntegration(ABC):
    @abstractmethod
    async def fetch_transactions(self, from_date, to_date) -> list[Transaction]:
        pass

class ManualInput(BankIntegration):       # Реалізовано зараз
    async def fetch_transactions(self, ...): ...

class MonobankIntegration(BankIntegration): # Реалізовано пізніше
    async def fetch_transactions(self, ...): ...
```

---

### Домен 3: Health Agent

**Що отримує з графу:**
- Check-in дані (сон, настрій, активність)
- Навчальне навантаження (з Learning)
- Фінансовий стрес (з Financial)

**Що робить:**
- Щоденний check-in через чат або форму
- Аналізує настрій через текстові нотатки
- Два способи логування їжі (вибір юзера)
- Відстежує звички і streak-и
- Прогнозує ризик зриву і burnout

**Логування їжі — два режими:**

```
Режим 1 — Фото
  Юзер: [прикріплює фото тарілки]
  Knome:
    1. LLaVA (dev) / Claude Vision (prod) → ідентифікує страву
    2. Nutritionix API → точні КБЖУ
    3. "Знайшов: борщ (~250 ккал), хліб (~120 ккал). Зберегти?"

Режим 2 — Текст (чат або форма)
  Юзер: "з'їв борщ і два шматки хліба"
  Knome:
    1. NLP парсинг → ["борщ", "хліб x2"]
    2. Nutritionix API → КБЖУ
    3. Підтвердження і збереження
```

---

## ML / DL компоненти

### 1. Deep Knowledge Tracing (DKT) — Навчання

**Задача:** відстежувати рівень засвоєння кожної теми в реальному часі

```
Input:  [тема_id, результат (0/1), час_витрачений, кількість_спроб]
Output: P(знає тему X) для кожної теми в curriculum

Архітектура: LSTM мережа
              Input → Hidden (128) → Hidden (64) → Sigmoid Output
Тренування:  PyTorch, власні дані юзера після 30+ сесій
До 30 сесій: rule-based (>70% правильних → засвоєно)
```

### 2. LSTM Forecasting — Фінанси

**Задача:** прогноз витрат на наступний місяць по категоріях

```
Input:  90 днів витрат по категоріях (часовий ряд)
Output: прогноз наступних 30 днів + довірчий інтервал

Архітектура: Stacked LSTM (2 шари)
             Sequence length: 90 днів
             Forecast horizon: 30 днів
До 90 днів:  Moving average як fallback
```

### 3. Anomaly Detection — Фінанси

**Задача:** виявляти нетипові витрати

```
Алгоритм:  Isolation Forest (sklearn)
Input:     [сума, категорія, день_тижня, час_доби]
Output:    anomaly score (0.0 - 1.0)
Поріг:     >0.7 → попередження юзеру
До даних:  Z-score по категоріям як fallback
```

### 4. Sentiment Analysis — Здоров'я

**Задача:** аналіз настрою і стресу з щоденних нотаток

```
Модель:    XLM-RoBERTa (multilingual, підтримує UA + EN)
Завдання:  HuggingFace pipeline (sentiment)
Input:     текст щоденного check-in нотатку
Output:    настрій (positive/negative/neutral) + score

Завжди використовується pre-trained — не потребує своїх даних
```

### 5. Transaction Classifier — Фінанси

**Задача:** автоматична категоризація витрат

```
Метод:     Fine-tuned sentence-transformers
Input:     опис транзакції ("Silpo 450грн", "Nova Poshta")
Output:    категорія (їжа, транспорт, тощо) + confidence

Базова модель: multilingual-e5-base (підтримує UA)
Fine-tuning:   на перших 50-100 вручну підтверджених транзакціях
```

### 6. Burnout Predictor — Здоров'я

**Задача:** передбачити ризик вигорання за 3-7 днів

```
Input:  [сон (7 днів), настрій (7 днів), навантаження (7 днів),
          кількість пропущених звичок, рівень фін. стресу]
Output: ризик burnout (0.0 - 1.0) + топ причина

Архітектура:  Random Forest (інтерпретованість важлива)
До 30 днів:   rule-based (сон < 6год × 3 дні + настрій < 5 → HIGH RISK)
```

### 7. Food Vision — Здоров'я

**Задача:** розпізнавання їжі з фото

```
Dev:   LLaVA (через Ollama, безкоштовно, локально)
Prod:  Claude Vision / GPT-4V
       → точність ~89-90% для стандартних страв
       → Nutritionix API для точних КБЖУ значень

Юзер завжди може підтвердити або виправити результат
```

### 8. Recommendation System — Навчання

**Задача:** рекомендація навчальних ресурсів

```
Метод:   Collaborative filtering
Логіка:  "Люди з схожим профілем і цілями вчили X після Y"
         + Content-based (тема, формат, складність)
Старт:   Content-based (не потребує інших юзерів)
Пізніше: Hybrid (CF + Content) коли є 2-3 юзери
```

---

## Cold Start стратегія

ML моделі потребують даних. День перший — даних нуль. Ось рішення:

### Три рівні

**Рівень 1 — Онбординг як перші дані (день 1)**

Під час знайомства агент вже збирає структуровані початкові значення:
- "Як часто ти зриваєш заплановане?" → калібрує burnout модель
- "Скільки витрачаєш на їжу на місяць?" → baseline для фінансів
- "Оціни рівень Python від 1 до 10" → стартова точка DKT

**Рівень 2 — Rule-based fallback (тижні 1-4)**

Поки даних мало — прості правила замість ML:

```python
# Замість LSTM:
if витрати_категорії > середня * 1.2:
    anomaly = True

# Замість DKT:
if днів_без_повторення > 7:
    нагадати(тема)

# Замість Burnout Predictor:
if sleep_hours < 6 and count >= 3 and mood < 5:
    risk = "HIGH"
```

**Рівень 3 — Pre-trained як база**

```
Sentiment Analysis → XLM-RoBERTa (одразу, не потребує даних)
Food Recognition   → LLaVA / Claude Vision (одразу)
Transaction NLP    → multilingual-e5 (одразу, fine-tune пізніше)
```

### Графік переходу

```
День  1-7:   Тільки rule-based + pre-trained моделі
День  8-30:  Збір даних, перші fine-tuning спроби
День 31-60:  DKT і Burnout Predictor активуються
День 61-90:  LSTM Forecasting активується (потрібно 90 днів)
День 90+:    Всі ML моделі повністю персоналізовані
```

---

## Проактивність

Knome не чекає — він сам ініціює коли є що сказати.

### Trigger Engine

```
┌─────────────────────────────────────────────────────┐
│                 TRIGGER ENGINE                      │
├─────────────────┬───────────────┬───────────────────┤
│   Time-based    │  Event-based  │   Pattern-based   │
│                 │               │                   │
│ Щодня 09:00     │ Витрата       │ 3 дні без         │
│ ранковий check  │ > ліміту      │ навчання          │
│                 │               │                   │
│ Щонеділі 10:00  │ Сон < 5 год  │ Витрати ↑ 40%     │
│ тижневий звіт   │ зафіксовано   │ за тиждень        │
│                 │               │                   │
│ Щомісяця        │ Новий патерн  │ Настрій < 5       │
│ фінансовий звіт │ виявлено      │ 4 дні поспіль     │
└─────────────────┴───────────────┴───────────────────┘
                          │
                  Priority Queue
               (максимум 2 повідомлення/день)
                          │
                  Browser Push / UI Notification
```

### Приклади повідомлень

**Learning trigger:**
> "Ти не повторював 'async/await' вже 9 днів. За кривою забування є ризик втратити цю тему. 10-хвилинне повторення?"

**Financial trigger:**
> "Цього тижня витратив на їжу вже 87% місячного бюджету, а місяць закінчується за 12 днів."

**Health trigger:**
> "Три дні поганого сну і дедлайн по навчанню — схоже на твій патерн перед зривом звичок. Може сьогодні легший день?"

**Cross-domain trigger (найцінніший):**
> "Помітив: коли ти витрачаєш більше на доставку їжі ввечері — наступні 2 дні продуктивність навчання падає приблизно на 30%. Зв'язок через якість сну і харчування."

### Технічна реалізація

```python
# APScheduler для time-based тригерів
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()

@scheduler.scheduled_job('cron', hour=9, minute=0)
async def morning_checkin(user_id: str):
    context = await knowledge_graph.get_context(user_id)
    if not context.checked_in_today:
        await send_notification(user_id, "morning_checkin")

# Event-based через Knowledge Graph hooks
async def on_transaction_added(transaction: Transaction):
    if await anomaly_detector.is_anomaly(transaction):
        await trigger_engine.fire("anomaly_detected", transaction)
```

---

## Інтерфейс і дизайн

### Структура сторінок

```
/ (root)
│
├── /onboarding         ← перший запуск, знайомство
│
├── /chat               ← головний чат з агентом (Knome)
│
├── /dashboard          ← загальний огляд всіх доменів
│
├── /learning
│   ├── /curriculum     ← поточний план навчання
│   ├── /progress       ← графіки засвоєння
│   └── /session        ← активна навчальна сесія
│
├── /finance
│   ├── /overview       ← бюджет і баланс
│   ├── /transactions   ← список транзакцій
│   └── /goals          ← фінансові цілі
│
├── /health
│   ├── /checkin        ← щоденний check-in
│   ├── /habits         ← трекер звичок
│   ├── /nutrition      ← їжа і КБЖУ
│   └── /trends         ← графіки самопочуття
│
└── /settings
    ├── /profile        ← особистий профіль
    ├── /preferences    ← мова, тема, нотифікації
    └── /privacy        ← дані і приватність
```

### Головний чат — центр Knome

```
┌─────────────────────────────────────────────────────┐
│  🧠 Knome              [🌙 Dark] [UA/EN] [Олег ▾]  │
├──────────────────────────────────────────────────────┤
│  💡 Knome помітив: Цього тижня ти спав в середньому │
│     5.8 год. Це може впливати на навчання.          │
│                                              [×]    │
├────────────┬─────────────────────────────────────────┤
│ 💬 Чат    │                                         │
│ 📊 Фінанси│    Привіт! Як пройшов день?             │
│ 📚 Навчан.│                                         │
│ 🏋️ Здоров.│    Сьогодні вивчав React hooks, але    │
│ 📈 Звіти  │    сон був поганий, прокинувся о 5:00   │
│            │                            ← Олег      │
│            │                                         │
│            │  Розумію — мало сну і при цьому        │
│            │  навчався. Запишу: React hooks ✓        │
│            │  Сон: 5 год. Хочеш запланувати         │
│            │  повторення хуків на завтра?     Knome │
│            │                                         │
│            │  [📷 Фото їжі]  [повідомлення...]  [↑] │
└────────────┴─────────────────────────────────────────┘
```

### Дизайн-принципи

- Мінімалістичний і чистий — нічого зайвого
- Темна і світла тема з плавним перемикачем
- Графіки і дашборди — Recharts (React)
- Акцент кольору: глибокий синій або індиго
- Мобільна адаптивність через браузер

---

## Приватність і безпека

### Підхід: Local-First

Всі персональні дані зберігаються **локально** під час розробки і початкового використання.

```
НА ПРИСТРОЇ:                    НА СЕРВЕР іде тільки:
├── Knowledge Graph (Kuzu)      ├── LLM запити (анонімізовані)
├── ML моделі (ONNX)            ├── Nutritionix API запити
├── Всі персональні дані        └── (в майбутньому) оновлення моделей
└── SQLite (метадані)
```

### Анонімізація LLM запитів

```python
# Перед відправкою в LLM API — замінюємо чутливі дані
def anonymize_for_llm(context: dict) -> dict:
    return {
        "user": "[USER]",
        "amount": f"[AMOUNT_{context['currency']}]",
        "category": context['category'],  # категорія — не чутлива
        "mood_score": context['mood'],
        # Імена, суми, особисті деталі → плейсхолдери
    }
```

### Контроль юзера (обов'язково)

```
У /settings/privacy:
  ✓ "Покажи всі мої дані" → повний JSON експорт
  ✓ "Видали мене повністю" → cascade delete з графу
  ✓ "Не зберігай фінансові дані" → гранулярні дозволи
  ✓ "Очисти дані старше 1 року" → авто-очищення
```

### Шифрування

```
База даних:     SQLite з SQLCipher (AES-256)
Knowledge Graph: зашифрований at rest (Kuzu encryption)
API ключі:      зберігаються в .env, ніколи не в коді
```

---

## Технологічний стек

### Backend (Python)

```
FastAPI          — HTTP API і WebSocket для чату
LangGraph        — агентний фреймворк (Orchestrator)
Kuzu             — Knowledge Graph (dev), Neo4j (prod)
SQLite           — метадані і сесії
APScheduler      — тригери і проактивні нотифікації
PyTorch          — DKT, LSTM, Burnout Predictor
scikit-learn     — Isolation Forest, Random Forest
HuggingFace      — XLM-RoBERTa, sentence-transformers
Ollama + LLaVA   — LLM і vision (dev, безкоштовно)
httpx            — HTTP клієнт для зовнішніх API
pydantic         — валідація даних
```

### Frontend (JavaScript)

```
React            — UI фреймворк
TailwindCSS      — стилізація
Recharts         — графіки і дашборди
react-i18next    — інтернаціоналізація (UA + EN)
Zustand          — управління станом
React Router     — навігація
Axios            — HTTP запити до FastAPI
```

### Зовнішні API

```
Ollama + LLaVA   — локальний LLM + vision (dev)
Claude Vision /
GPT-4V           — vision для їжі (prod)
Nutritionix API  — база КБЖУ продуктів (freemium)
```

### Майбутні інтеграції (архітектура підготована)

```
Monobank API     — автоматичний імпорт транзакцій
ПриватБанк API   — альтернатива Mono
Apple Health /
Google Fit       — дані про активність і сон
```

### Розгортання

```
Dev:   Локально на ПК розробника
       Backend: uvicorn (localhost:8000)
       Frontend: vite dev server (localhost:5173)
       LLM: Ollama (localhost:11434)

Prod:  VPS (коли буде готово для інших юзерів)
       Docker Compose (backend + frontend)
       Nginx як reverse proxy
       LLM: Claude / GPT-4V API
```

---

## Фази розробки

### Фаза 1 — Фундамент (місяць 1-2)

**Мета:** базова інфраструктура і онбординг

```
✓ Налаштування проекту (FastAPI + React + Kuzu)
✓ Схема Knowledge Graph
✓ Onboarding Agent (LangGraph)
✓ Базовий чат інтерфейс
✓ Підключення Ollama
✓ Зберігання профілю юзера в графі
```

**Результат:** можна познайомитись з Knome і він запам'ятовує тебе

---

### Фаза 2 — Домени MVP (місяць 3-4)

**Мета:** всі три домени мінімально працюють

```
✓ Health Agent: check-in, трекер звичок, ручний ввід їжі
✓ Financial Agent: ввід витрат, категоризація, базовий бюджет
✓ Learning Agent: curriculum builder, трекінг сесій
✓ Rule-based ML fallback для всіх доменів
✓ Базові дашборди (Recharts)
✓ UA + EN перемикач мови
✓ Dark/Light тема
```

**Результат:** Knome MVP — можна користуватись щодня

---

### Фаза 3 — ML і AI (місяць 5-6)

**Мета:** підключити реальні ML моделі

```
✓ Sentiment Analysis (XLM-RoBERTa) для здоров'я
✓ Transaction Classifier (sentence-transformers) для фінансів
✓ Food Vision (LLaVA → фото їжі)
✓ Nutritionix API інтеграція
✓ Anomaly Detection (Isolation Forest)
✓ DKT модель для навчання (після 30+ сесій даних)
```

**Результат:** Knome стає розумнішим і персоналізованим

---

### Фаза 4 — Проактивність і Cross-Domain (місяць 7-8)

**Мета:** Knome сам ініціює і бачить зв'язки

```
✓ Trigger Engine (APScheduler)
✓ Pattern detection між доменами
✓ Cross-domain інсайти
✓ LSTM Forecasting (після 90 днів даних)
✓ Burnout Predictor
✓ Тижневий AI-звіт
✓ Browser push notifications
```

**Результат:** Knome попереджає про проблеми до того як вони стались

---

### Фаза 5 — Полірування і продакшн (місяць 9-10)

**Мета:** якість, UX і готовність для 2-3 юзерів

```
✓ Повний аудит приватності і безпеки
✓ Шифрування бази даних
✓ Експорт / видалення даних
✓ Docker Compose для деплою
✓ Перехід з Ollama на Claude/GPT-4V для prod
✓ Тестування з реальними юзерами
✓ UX покращення на основі feedback
```

**Результат:** Knome готовий для регулярного використання кількома людьми

---

## Майбутні функції

### Короткострокові (після стабільного MVP)

- **Monobank API** — автоматичний імпорт транзакцій в реальному часі
- **ПриватБанк API** — альтернативна банківська інтеграція
- **Recommendation Engine v2** — collaborative filtering коли є 2-3 юзери
- **Голосовий input** — диктувати замість друкувати

### Довгострокові

- **Apple Health / Google Fit** — автоматичні дані про сон і активність
- **PWA** — встановлюється як додаток на телефоні через браузер
- **Knome API** — дозволити іншим додаткам читати/писати в граф
- **Fine-tuned персональна модель** — повністю натренована на твоїх даних

### Свідомо не плануємо

```
✗ Соціальні функції і стосунки — занадто особисто і складно
✗ Інвестиційні поради — юридична відповідальність
✗ Кар'єрний агент — окремий великий проект
```

---

## Швидкий старт (для розробника)

```bash
# 1. Клонування і залежності
git clone https://github.com/username/knome
cd knome

# 2. Backend
cd backend
python -m venv venv
source venv/bin/activate  # або venv\Scripts\activate на Windows
pip install -r requirements.txt
cp .env.example .env      # заповни API ключі

# 3. Ollama (локальний LLM)
ollama pull llama3.2
ollama pull llava          # для food vision

# 4. Frontend
cd ../frontend
npm install

# 5. Запуск
# Terminal 1:
cd backend && uvicorn main:app --reload

# Terminal 2:
cd frontend && npm run dev

# Відкрити: http://localhost:5173
```

---

## Структура проекту

```
knome/
├── backend/
│   ├── main.py                  ← FastAPI app
│   ├── agents/
│   │   ├── orchestrator.py      ← LangGraph Orchestrator
│   │   ├── onboarding.py        ← Onboarding Agent
│   │   ├── learning.py          ← Learning Agent
│   │   ├── financial.py         ← Financial Agent
│   │   └── health.py            ← Health Agent
│   ├── graph/
│   │   ├── schema.py            ← Knowledge Graph схема
│   │   ├── queries.py           ← Kuzu запити
│   │   └── patterns.py          ← Pattern detection
│   ├── ml/
│   │   ├── dkt.py               ← Deep Knowledge Tracing
│   │   ├── lstm_forecast.py     ← LSTM Forecasting
│   │   ├── anomaly.py           ← Isolation Forest
│   │   ├── sentiment.py         ← XLM-RoBERTa
│   │   ├── classifier.py        ← Transaction Classifier
│   │   ├── burnout.py           ← Burnout Predictor
│   │   └── food_vision.py       ← LLaVA / Claude Vision
│   ├── triggers/
│   │   └── engine.py            ← APScheduler Trigger Engine
│   ├── integrations/
│   │   ├── base.py              ← AbstractBankIntegration
│   │   ├── manual.py            ← ManualInput (зараз)
│   │   └── monobank.py          ← MonobankIntegration (майбутнє)
│   ├── api/
│   │   ├── chat.py              ← WebSocket чат ендпоінти
│   │   ├── finance.py           ← Фінансові ендпоінти
│   │   ├── health.py            ← Health ендпоінти
│   │   └── learning.py          ← Learning ендпоінти
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Chat.jsx         ← Головний чат
│   │   │   ├── Dashboard.jsx    ← Загальний дашборд
│   │   │   ├── Finance.jsx      ← Фінансовий дашборд
│   │   │   ├── Health.jsx       ← Health дашборд
│   │   │   └── Learning.jsx     ← Learning дашборд
│   │   ├── components/
│   │   ├── locales/
│   │   │   ├── ua.json          ← Українські переклади
│   │   │   └── en.json          ← Англійські переклади
│   │   └── store/               ← Zustand state
│   └── package.json
│
├── docker-compose.yml           ← для продакшн деплою
└── README.md
```

---

*Knome — Know Me. Агент який знає тебе.*
