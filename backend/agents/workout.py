import re
from typing import Optional

from llm.client import llm_respond
from llm.prompts import WORKOUT_SYSTEM
from graph.queries import (
    add_workout_session,
    add_exercise_log,
    get_recent_workout_sessions,
    get_active_workout_program,
    get_workout_programs,
    create_workout_program,
)

# Match numbered answers 1–6
_NUMBERED_RE = re.compile(r'(?:^|\n)\s*[1-6][\.\)]', re.MULTILINE)

_QUESTIONNAIRE = (
    "Давай складемо твою персональну програму! Відповідай по пунктах:\n"
    "1. Яка ціль? (сила / маса / тонус / витривалість / схуднення)\n"
    "2. Є вид спорту чи активності? (футбол, бокс тощо — або «ні»)\n"
    "3. Скільки днів на тиждень і які саме? (напр: 3 — пн/ср/пт)\n"
    "4. Яке обладнання? (штанга+диски / гантелі / тренажери / без обладнання)\n"
    "5. Рівень підготовки? (початківець / середній / просунутий)\n"
    "6. Скільки часу на тренування? (30 / 45 / 60 / 90 хв)"
)


def _is_program_spec_answer(text: str) -> bool:
    """Detect when user is answering the program questionnaire (≥3 numbered points)."""
    return len(_NUMBERED_RE.findall(text)) >= 3


def _parse_days(text: str) -> int:
    for word, n in [("щодня", 7), ("сім", 7), ("шість", 6), ("п'ять", 5),
                    ("чотири", 4), ("тричі", 3), ("тріч", 3), ("двічі", 2), ("раз", 1)]:
        if word in text.lower():
            return n
    m = re.search(r'(\d)\s*дн', text.lower())
    return int(m.group(1)) if m else 3


def _parse_duration(text: str) -> int:
    m = re.search(r"(\d+)\s*(хв|хвилин|min)", text.lower())
    if m:
        return int(m.group(1))
    m2 = re.search(r"(\d+(?:\.\d+)?)\s*(год|hours?)", text.lower())
    if m2:
        return int(float(m2.group(1)) * 60)
    for val, minutes in [("90", 90), ("45", 45), ("30", 30)]:
        if val in text:
            return minutes
    return 60


def _parse_program_params(text: str) -> dict:
    """Extract structured params from questionnaire answers."""
    t = text.lower()

    # Goal
    if any(w in t for w in ["маса", "набрат", "масу", "об'єм"]):
        goal = "маса"
    elif any(w in t for w in ["схуд", "похудіт", "скинут", "схуднення"]):
        goal = "схуднення"
    elif any(w in t for w in ["сила", "силу", "strength"]):
        goal = "сила"
    elif any(w in t for w in ["витривал", "кардіо", "endurance"]):
        goal = "витривалість"
    else:
        goal = "тонус"

    # Sport
    if any(w in t for w in ["футбол", "матч", "матчі"]):
        sport = "футбол"
    elif any(w in t for w in ["баскетбол"]):
        sport = "баскетбол"
    elif any(w in t for w in ["бокс", "єдиноборств", "mma", "бойов"]):
        sport = "бокс/єдиноборства"
    elif any(w in t for w in ["біг", "бігати", "марафон"]):
        sport = "біг"
    elif any(w in t for w in ["волейбол"]):
        sport = "волейбол"
    elif any(w in t for w in ["теніс"]):
        sport = "теніс"
    else:
        sport = ""

    # Equipment
    if any(w in t for w in ["штанг", "диски", "лавк", "barbell"]):
        equipment = "штанга + гантелі"
    elif any(w in t for w in ["гантел", "dumbbell"]):
        equipment = "гантелі"
    elif any(w in t for w in ["зал", "тренажер", "gym"]):
        equipment = "тренажерний зал"
    else:
        equipment = "власна вага"

    # Level
    if any(w in t for w in ["початківець", "початк", "новачок", "beginner"]):
        level = "початківець"
    elif any(w in t for w in ["просунутий", "просунут", "досвідчен", "advanced"]):
        level = "просунутий"
    else:
        level = "середній"

    days = _parse_days(text)
    duration = _parse_duration(text)

    # Program name
    sport_suffix = f" ({sport})" if sport else ""
    name = f"Програма {goal}{sport_suffix}"

    return {
        "goal": goal, "sport": sport, "days": days,
        "equipment": equipment, "level": level,
        "duration": duration, "name": name,
    }


def _build_program(message: str, days_label: str = "") -> str:
    """Adaptive rule-based program generator."""
    text = message.lower()
    days = _parse_days(text)

    # ── Sport detection ──────────────────────────────────────────────
    sport_note = ""
    sport_label = ""
    if any(w in text for w in ["футбол", "матч", "матчі"]):
        sport_note = "\n\n🏅 **Футбол:** вибухові стрибки 4×8, бічні переміщення 4×30с, ікри 4×15."
        sport_label = "для футболістів "
    elif any(w in text for w in ["баскетбол"]):
        sport_note = "\n\n🏀 **Баскетбол:** вертикальний стрибок 4×8, швидкі зупинки 4×20с."
        sport_label = "для баскетболістів "
    elif any(w in text for w in ["бокс", "єдиноборств", "бойов", "mma"]):
        sport_note = "\n\n🥊 **Єдиноборства:** тіньовий бокс 3×3хв, вибухові відтискання 4×8."
        sport_label = "для єдиноборств "
    elif any(w in text for w in ["біг", "бігати", "марафон", "пробіжк"]):
        sport_note = "\n\n🏃 **Біг:** акцент на ікри, стегна, кор для економії кроку."
        sport_label = "для бігунів "
    elif any(w in text for w in ["велосипед", "велоспорт"]):
        sport_note = "\n\n🚴 **Велоспорт:** квадрицепси, стегна, кор."
        sport_label = "для велосипедистів "
    elif any(w in text for w in ["плаван", "басейн"]):
        sport_note = "\n\n🏊 **Плавання:** широчайні, плечі, кор."
        sport_label = "для плавців "

    # ── Goals ────────────────────────────────────────────────────────
    wants_strength  = any(w in text for w in ["сила", "силу", "strength", "максимал"])
    wants_mass      = any(w in text for w in ["маса", "масу", "набрат", "об'єм", "mass"])
    wants_endurance = any(w in text for w in ["витривалість", "кардіо", "витривал", "endurance"])
    wants_tone      = any(w in text for w in ["тонус", "форм", "рельєф", "tone"])
    wants_loss      = any(w in text for w in ["схуд", "похудіт", "скинут", "схуднення"])

    # ── Equipment ────────────────────────────────────────────────────
    has_barbell   = any(w in text for w in ["штанг", "диски", "лавк", "barbell"])
    has_dumbbells = any(w in text for w in ["гантел", "dumbbell"])
    has_gym       = any(w in text for w in ["зал", "тренажер", "gym"])

    if has_barbell:
        squat = "Присідання зі штангою"; press = "Жим штанги лежачи"
        row   = "Тяга штанги в нахилі";  rdl   = "Румунська тяга зі штангою"
        ohp   = "Жим штанги стоячи";     curl  = "Згинання біцепс зі штангою"
    elif has_dumbbells or has_gym:
        squat = "Присідання з гантелями"; press = "Жим гантелей лежачи"
        row   = "Тяга гантелі в нахилі";  rdl   = "Румунська тяга з гантелями"
        ohp   = "Жим гантелей сидячи";    curl  = "Згинання біцепс з гантелями"
    else:
        squat = "Присідання";                curl  = "Відтискання на трицепс"
        press = "Відтискання";               rdl   = "«Добрий ранок» без ваги"
        row   = "Австралійські підтяг.";     ohp   = "Відтискання вузьким хватом"

    # ── Sets / reps by goal ──────────────────────────────────────────
    if wants_mass:
        s, r = "4", "8-12"
    elif wants_strength:
        s, r = "5", "4-6"
    else:
        s, r = "3", "12-15"

    # ── Level adjustments ────────────────────────────────────────────
    is_beginner = any(w in text for w in ["початківець", "початк", "beginner", "новачок"])
    is_advanced = any(w in text for w in ["просунутий", "просунут", "advanced", "досвідчен"])
    if is_beginner:
        s, r = "3", "10-12"
        level_note = "\n\n⚡ **Початківець:** фокус на техніці, починай з легкої ваги. Відпочинок 2-3 хв між підходами."
    elif is_advanced:
        level_note = "\n\n⚡ **Просунутий:** прогресивне навантаження +2.5-5 кг/тиж, суперсети для економії часу."
    else:
        level_note = "\n\n⚡ **Відновлення:** 10 хв розминка + 10 хв стретчинг після кожного тренування."

    # ── Cardio block ─────────────────────────────────────────────────
    if wants_endurance or wants_loss or sport_note:
        cardio = "• Інтервали: 8×(30с швидко / 90с спокійно)\n• Берпі — 3×10\n• Планка — 3×60с"
    else:
        cardio = "• Кардіо 15 хв (біг / скакалка)\n• Планка — 3×60с\n• Прес — 3×20"

    # ── Schedule line ─────────────────────────────────────────────────
    schedule_line = f"\n📅 **Розклад:** {days_label}" if days_label else ""

    # ── Program by days ──────────────────────────────────────────────
    day_word = "день" if days == 1 else "дні" if days < 5 else "днів"
    title = f"**Програма тренувань {sport_label}— {days} {day_word}/тиждень**{schedule_line}"

    if days >= 4:
        prog = (
            f"{title}\n\n"
            f"**День 1 — Нижня частина тіла**\n"
            f"• {squat} — {s}×{r}\n• {rdl} — {s}×{r}\n• Випади — 3×12/ногу\n• Ікри — 4×15\n\n"
            f"**День 2 — Верхня частина тіла**\n"
            f"• {press} — {s}×{r}\n• {row} — {s}×{r}\n• {ohp} — 3×{r}\n• {curl} — 3×{r}\n\n"
            f"**День 3 — Кардіо + кор**\n{cardio}\n\n"
            f"**День 4 — Повне тіло (об'єм)**\n"
            f"• {squat} — 3×15 (легше)\n• {press} — 3×15\n• {row} — 3×15\n• Берпі — 3×10"
        )
    elif days >= 3:
        prog = (
            f"{title}\n\n"
            f"**День 1 — Нижня частина тіла**\n"
            f"• {squat} — {s}×{r}\n• {rdl} — {s}×{r}\n• Випади — 3×10/ногу\n• Ікри — 4×15\n\n"
            f"**День 2 — Верхня частина тіла**\n"
            f"• {press} — {s}×{r}\n• {row} — {s}×{r}\n• {ohp} — 3×{r}\n• {curl} — 3×{r}\n\n"
            f"**День 3 — Кардіо + повне тіло**\n{cardio}\n"
            f"• {squat} — 3×15 (легше)\n• {press} — 3×15"
        )
    else:
        prog = (
            f"{title}\n\n"
            f"**День 1 — Верхня частина тіла**\n"
            f"• {press} — {s}×{r}\n• {row} — {s}×{r}\n• {ohp} — 3×{r}\n\n"
            f"**День 2 — Нижня частина + кардіо**\n"
            f"• {squat} — {s}×{r}\n• {rdl} — 3×{r}\n{cardio}"
        )

    return prog + sport_note + level_note


_LOG_KW = [
    "потренувавс", "потренувалас", "зробив трен", "зробила трен",
    "закінчив трен", "закінчила трен", "workout done", "did workout",
    "completed workout", "тренування готово",
]
_PROGRAM_KW = [
    "програм", "план трен", "скласти програм", "нова програм",
    "хочу трен", "розпис", "program", "create plan",
]
_PROGRESS_KW = [
    "прогрес", "статистик", "скільки трен", "results", "stats", "progress",
]
_GOING_KW = [
    "йду на тренування", "іду на тренування", "йду в зал", "іду в зал",
    "збираюся тренуватись", "збираюся тренуватися", "час тренуватися",
    "пора тренуватися", "зараз потренуюсь", "зараз потренуюся",
    "перед тренуванням", "going to gym", "going to workout", "off to the gym",
    "йду качатися", "іду качатися",
    "порухатись", "порухатися", "рухатись", "рухатися", "трохи порухатись",
    "займатися спортом", "пробіжк", "пробігтись", "пробігтися", "зарядк",
]

_RECOMMEND_KW = [
    "яку вагу", "рекоменд", "наступн трен", "next workout", "наступн підхід",
    "скільки важити", "яка вага", "порад вагу",
]

_EXERCISE_MAP = [
    ("жим",      r"жим.*?(\d+(?:\.\d+)?)\s*кг"),
    ("присід",   r"присід.*?(\d+(?:\.\d+)?)\s*кг"),
    ("станова",  r"станова.*?(\d+(?:\.\d+)?)\s*кг"),
    ("підтяг",   r"підтяг.*?(\d+(?:\.\d+)?)\s*кг"),
    ("тяга",     r"тяга.*?(\d+(?:\.\d+)?)\s*кг"),
]

_WORKOUT_KW = _LOG_KW + _PROGRAM_KW + _PROGRESS_KW + [
    "тренув", "вправ", "підхід", "жим", "присід", "підтяг", "станова",
    "gym", "workout", "exercise", "bench", "squat", "deadlift",
    "гантел", "штанг", "тренажер", "спорт", "фітнес", "м'яз",
]


def is_workout_message(text: str) -> bool:
    return any(kw in text.lower() for kw in _WORKOUT_KW)


def _get_day_plan(program: dict, day_num: int) -> str:
    """Generate today's workout based on stored program params."""
    goal = program.get("goal", "тонус")
    equipment = program.get("equipment", "власна вага")
    days = program.get("days_per_week", 3)

    if "штанг" in equipment:
        press = "Жим штанги лежачи"; squat = "Присідання зі штангою"
        row = "Тяга штанги в нахилі"; rdl = "Румунська тяга"; ohp = "Жим штанги стоячи"
    elif "гантел" in equipment or "тренажер" in equipment:
        press = "Жим гантелей лежачи"; squat = "Присідання з гантелями"
        row = "Тяга гантелі в нахилі"; rdl = "Румунська тяга з гантелями"; ohp = "Жим гантелей сидячи"
    else:
        press = "Відтискання"; squat = "Присідання"
        row = "Австралійські підтяг."; rdl = "«Добрий ранок»"; ohp = "Відтискання вузьким хватом"

    if goal in ("маса", "mass"): s, r = "4", "8-12"
    elif goal in ("сила", "strength"): s, r = "5", "4-6"
    else: s, r = "3", "12-15"

    cardio = "• Кардіо 15 хв\n• Планка — 3×60с\n• Прес — 3×20"

    if days >= 4:
        plans = [
            f"🦵 Нижня частина тіла\n• {squat} — {s}×{r}\n• {rdl} — {s}×{r}\n• Випади — 3×12/ногу\n• Ікри — 4×15",
            f"💪 Верхня частина тіла\n• {press} — {s}×{r}\n• {row} — {s}×{r}\n• {ohp} — 3×{r}\n• Біцепс — 3×{r}",
            f"🏃 Кардіо + кор\n{cardio}",
            f"🔄 Повне тіло\n• {squat} — 3×15\n• {press} — 3×15\n• {row} — 3×15\n• Берпі — 3×10",
        ]
    elif days >= 3:
        plans = [
            f"🦵 Нижня частина тіла\n• {squat} — {s}×{r}\n• {rdl} — {s}×{r}\n• Випади — 3×10/ногу\n• Ікри — 4×15",
            f"💪 Верхня частина тіла\n• {press} — {s}×{r}\n• {row} — {s}×{r}\n• {ohp} — 3×{r}\n• Біцепс — 3×{r}",
            f"🏃 Кардіо + повне тіло\n{cardio}\n• {squat} — 3×15",
        ]
    else:
        plans = [
            f"💪 Верхня частина тіла\n• {press} — {s}×{r}\n• {row} — {s}×{r}\n• {ohp} — 3×{r}",
            f"🦵 Нижня + кардіо\n• {squat} — {s}×{r}\n• {rdl} — 3×{r}\n{cardio}",
        ]

    return plans[(day_num - 1) % len(plans)]


def _parse_exercises(text: str) -> list[dict]:
    """Parse 'жим 80кг 4x5, присід 100 3x8' from natural text."""
    exercises = []
    set_rep_re = re.compile(r"(\d+)\s*[xхX×]\s*(\d+)")
    weight_re  = re.compile(r"(\d+(?:\.\d+)?)\s*кг")

    parts = re.split(r"[,;]|\bі\b|\bта\b", text)
    for part in parts:
        sr = set_rep_re.search(part)
        if not sr:
            continue
        sets = int(sr.group(1))
        reps = int(sr.group(2))
        w_match  = weight_re.search(part[:sr.start()])
        weight   = float(w_match.group(1)) if w_match else 0.0
        name_end = w_match.start() if w_match else sr.start()
        raw_name = part[:name_end].strip()
        name = re.sub(
            r"\b(зробив|робив|виконав|тренування|зробила|виконала|ще|також|потім)\b",
            "", raw_name, flags=re.IGNORECASE,
        ).strip(" .,;:-")
        if name:
            exercises.append({"name": name, "sets": sets, "reps": str(reps), "weight": str(weight)})
    return exercises


def _parse_session_duration(text: str) -> int:
    m = re.search(r"(\d+)\s*(хв|хвилин|min)", text.lower())
    if m:
        return int(m.group(1))
    m2 = re.search(r"(\d+(?:\.\d+)?)\s*(год|hours?)", text.lower())
    if m2:
        return int(float(m2.group(1)) * 60)
    return 60


def _extract_days_label(text: str) -> str:
    """Extract preferred days string from answer (e.g. 'пн/ср/пт')."""
    t = text.lower()
    day_map = [
        ("понеділ", "Пн"), ("пн", "Пн"),
        ("вівтор", "Вт"), ("вт", "Вт"),
        ("серед", "Ср"), ("ср", "Ср"),
        ("четвер", "Чт"), ("чт", "Чт"),
        ("п'ятниц", "Пт"), ("п'ятн", "Пт"), ("пт", "Пт"),
        ("субот", "Сб"), ("сб", "Сб"),
        ("неділ", "Нд"), ("нд", "Нд"),
    ]
    seen = []
    for key, label in day_map:
        if key in t and label not in seen:
            seen.append(label)
    return " / ".join(seen) if seen else ""


async def process(message: str, user_id: str, context: dict = None) -> tuple[str, list]:
    ctx = context or {}
    text = message.lower()

    # --- Log a completed session ---
    if any(kw in text for kw in _LOG_KW):
        exercises = _parse_exercises(message)
        duration = _parse_session_duration(message)

        active = get_active_workout_program(user_id)
        program_id = active["id"] if active else ""

        session_id = add_workout_session(
            user_id, duration=duration, notes=message, program_id=program_id
        )
        for ex in exercises:
            add_exercise_log(session_id, exercise_name=ex["name"],
                             sets=ex["sets"], reps=ex["reps"], weight=ex["weight"])

        if exercises:
            lines = [
                f"• {e['name']}: {e['sets']}×{e['reps']}"
                + (f" @ {e['weight']}кг" if e["weight"] != "0.0" else "")
                for e in exercises
            ]
            response = f"Тренування записано! {duration} хв.\n\n" + "\n".join(lines) + "\n\nВідмінна робота! 💪"
        else:
            response = (
                f"Тренування записано! {duration} хв.\n"
                "Хочеш записати вправи? Наприклад: «жим 80кг 4×5, присід 100кг 3×8»"
            )
        return response, []

    # --- User answered the program questionnaire ---
    if _is_program_spec_answer(message):
        params = _parse_program_params(message)
        days_label = _extract_days_label(message)

        # Save WorkoutProgram to Knowledge Graph
        saved = False
        save_error = ""
        try:
            create_workout_program(
                user_id=user_id,
                name=params["name"],
                goal=params["goal"],
                days_per_week=int(params["days"]),
                equipment=params["equipment"],
                level=params["level"],
                duration_min=int(params["duration"]),
            )
            saved = True
        except Exception as e:
            save_error = str(e)

        program_text = _build_program(message, days_label=days_label)
        if saved:
            saved_note = "\n\n✅ *Програму збережено в твоєму профілі.*"
        else:
            saved_note = f"\n\n⚠️ *Не вдалось зберегти програму: {save_error}*" if save_error else "\n\n⚠️ *Програму не вдалось зберегти.*"
        return program_text + saved_note, []

    # --- Going to gym → show today's plan from active program ---
    if any(kw in text for kw in _GOING_KW):
        active = get_active_workout_program(user_id)
        if not active:
            return (
                "У тебе ще немає програми тренувань! Давай складемо — займе 1 хвилину.\n\n"
                + _QUESTIONNAIRE
            ), []
        sessions = get_recent_workout_sessions(user_id, limit=30)
        day_num = (len(sessions) % active["days_per_week"]) + 1
        day_plan = _get_day_plan(active, day_num)
        return (
            f"Програма «{active['name']}» — День {day_num} з {active['days_per_week']}:\n\n"
            f"{day_plan}\n\n"
            f"💪 Успіхів! Після тренування напиши результати:\n"
            f"«потренувався 60 хв: жим 80кг 4×5, присід 100кг 3×8»"
        ), []

    # --- Program / plan request → show fixed questionnaire ---
    if any(kw in text for kw in _PROGRAM_KW):
        active = get_active_workout_program(user_id)
        if active:
            response = (
                f"У тебе вже є активна програма «{active['name']}» "
                f"(ціль: {active['goal']}, {active['days_per_week']} днів/тиж).\n"
                "Хочеш залишити її чи скласти нову?"
            )
        else:
            response = _QUESTIONNAIRE
        return response, []

    # --- Progress / stats ---
    if any(kw in text for kw in _PROGRESS_KW):
        sessions = get_recent_workout_sessions(user_id, limit=7)
        total = len(sessions)
        total_min = sum(s["duration"] for s in sessions)
        if total:
            response = f"За останні 7 днів: {total} тренувань, {total_min} хвилин загалом. Продовжуй так! 💪"
        else:
            response = "Тренувань ще не записано. Після кожного тренування напиши «потренувався» — і я запишу."
        return response, []

    # --- General workout question ---
    sessions = get_recent_workout_sessions(user_id, limit=3)
    ctx_line = f"{len(sessions)} тренувань нещодавно." if sessions else "Тренувань ще немає."
    last_session_notes = ""
    if sessions and sessions[0].get("notes"):
        last_session_notes = f"\nОстаннє тренування (нотатки): {sessions[0]['notes'][:500]}"

    # Weight recommendation: extract actual logged weight → structured prefix
    weight_prefix = ""
    if any(kw in text for kw in _RECOMMEND_KW) and sessions:
        all_notes = " ".join(s.get("notes", "") for s in sessions)
        for ex_kw, pattern in _EXERCISE_MAP:
            if ex_kw in text:
                m = re.search(pattern, all_notes, re.IGNORECASE)
                if m:
                    last_kg = float(m.group(1))
                    next_kg = last_kg + 2.5
                    weight_prefix = f"Останній {ex_kw}: {last_kg:.0f} кг → рекомендую {next_kg:.1f} кг (+2.5 кг прогрес)."
                break

    prompt = (
        f"Workout context: {ctx.get('workout', {})}. {ctx_line}{last_session_notes}\n"
        f"User: {message}"
    )

    response = await llm_respond(WORKOUT_SYSTEM, prompt)
    if not response:
        response = _QUESTIONNAIRE
    if weight_prefix:
        return f"{weight_prefix}\n\n{response}", []
    return response, []
