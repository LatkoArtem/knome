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
)

_NUMBERED_RE = re.compile(r'(?:^|\n)\s*[1-4][\.\)]', re.MULTILINE)


def _is_program_spec_answer(text: str) -> bool:
    """Detect when user is answering the 4-question program questionnaire."""
    return bool(_NUMBERED_RE.search(text)) and len(_NUMBERED_RE.findall(text)) >= 2


def _parse_days(text: str) -> int:
    for word, n in [("щодня", 7), ("сім", 7), ("шість", 6), ("п'ять", 5),
                    ("чотири", 4), ("тричі", 3), ("тріч", 3), ("двічі", 2), ("раз", 1)]:
        if word in text.lower():
            return n
    m = re.search(r'(\d)\s*дн', text.lower())
    return int(m.group(1)) if m else 3


def _build_program(message: str) -> str:
    """Adaptive rule-based program generator — works for any person/sport/goal."""
    text = message.lower()
    days = _parse_days(text)

    # ── Sport detection ──────────────────────────────────────────────
    sport_note = ""
    if any(w in text for w in ["футбол", "матч", "матчі"]):
        sport_note = "\n🏅 **Футбол:** вибухові стрибки 4×8, бічні переміщення 4×30с, ікри 4×15."
        sport_label = "для футболістів"
    elif any(w in text for w in ["баскетбол"]):
        sport_note = "\n🏀 **Баскетбол:** вертикальний стрибок 4×8, швидкі зупинки 4×20с."
        sport_label = "для баскетболістів"
    elif any(w in text for w in ["бокс", "єдиноборств", "бойов", "mma"]):
        sport_note = "\n🥊 **Єдиноборства:** тіньовий бокс 3×3хв, вибухові відтискання 4×8."
        sport_label = "для єдиноборств"
    elif any(w in text for w in ["біг", "бігати", "марафон", "пробіжк"]):
        sport_note = "\n🏃 **Біг:** акцент на ікри, стегна, кор для економії кроку."
        sport_label = "для бігунів"
    elif any(w in text for w in ["велосипед", "велоспорт"]):
        sport_note = "\n🚴 **Велоспорт:** квадрицепси, стегна, кор."
        sport_label = "для велосипедистів"
    elif any(w in text for w in ["плаван", "басейн"]):
        sport_note = "\n🏊 **Плавання:** широчайні, плечі, кор."
        sport_label = "для плавців"
    else:
        sport_label = ""

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
        squat = "Присідання";           press = "Відтискання"
        row   = "Австралійські підтяг."; rdl   = "«Добрий ранок» без ваги"
        ohp   = "Відтискання вузьким хватом"; curl = "Відтискання на трицепс"

    # ── Sets / reps by goal ──────────────────────────────────────────
    if wants_mass:
        s, r = "4", "8-12"
    elif wants_strength:
        s, r = "5", "4-6"
    else:  # tone / endurance / general
        s, r = "3", "12-15"

    # ── Level adjustments ────────────────────────────────────────────
    is_beginner = any(w in text for w in ["початківець", "початк", "beginner", "новачок", "перший раз"])
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

    # ── Program by days ──────────────────────────────────────────────
    title = f"**Програма тренувань {sport_label}— {days} {'день' if days == 1 else 'дні' if days < 5 else 'днів'}/тиждень**"

    if days >= 4:
        prog = (
            f"{title}\n\n"
            f"**День 1 — Нижня частина тіла**\n"
            f"• {squat} — {s}×{r}\n• {rdl} — {s}×{r}\n• Випади — 3×12/ногу • Ікри — 4×15\n\n"
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
_WORKOUT_KW = _LOG_KW + _PROGRAM_KW + _PROGRESS_KW + [
    "тренув", "вправ", "підхід", "жим", "присід", "підтяг", "станова",
    "gym", "workout", "exercise", "bench", "squat", "deadlift",
    "гантел", "штанг", "тренажер", "спорт", "фітнес", "м'яз",
]


def is_workout_message(text: str) -> bool:
    t = text.lower()
    return any(kw in t for kw in _WORKOUT_KW)


def _parse_exercises(text: str) -> list[dict]:
    """Parse 'жим 80кг 4x5, присід 100 3x8' from natural text."""
    exercises = []
    set_rep_re = re.compile(r"(\d+)\s*[xхX×]\s*(\d+)")
    weight_re = re.compile(r"(\d+(?:\.\d+)?)\s*кг")

    parts = re.split(r"[,;]|\bі\b|\bта\b", text)
    for part in parts:
        sr = set_rep_re.search(part)
        if not sr:
            continue

        sets = int(sr.group(1))
        reps = int(sr.group(2))

        w_match = weight_re.search(part[:sr.start()])
        weight = float(w_match.group(1)) if w_match else 0.0

        name_end = w_match.start() if w_match else sr.start()
        raw_name = part[:name_end].strip()
        # Remove service words
        name = re.sub(
            r"\b(зробив|робив|виконав|тренування|зробила|виконала|ще|також|потім)\b",
            "", raw_name, flags=re.IGNORECASE,
        ).strip(" .,;:-")

        if name:
            exercises.append({
                "name": name,
                "sets": sets,
                "reps": str(reps),
                "weight": str(weight),
            })

    return exercises


def _parse_duration(text: str) -> int:
    m = re.search(r"(\d+)\s*(хв|хвилин|min)", text.lower())
    if m:
        return int(m.group(1))
    m2 = re.search(r"(\d+(?:\.\d+)?)\s*(год|hours?)", text.lower())
    if m2:
        return int(float(m2.group(1)) * 60)
    return 60


async def process(message: str, user_id: str, context: dict = None) -> tuple[str, list]:
    ctx = context or {}
    workout_ctx = ctx.get("workout", {})
    text = message.lower()

    # --- Log a completed session ---
    if any(kw in text for kw in _LOG_KW):
        exercises = _parse_exercises(message)
        duration = _parse_duration(message)

        active = get_active_workout_program(user_id)
        program_id = active["id"] if active else ""

        session_id = add_workout_session(
            user_id, duration=duration, notes=message, program_id=program_id
        )
        for ex in exercises:
            add_exercise_log(
                session_id,
                exercise_name=ex["name"],
                sets=ex["sets"],
                reps=ex["reps"],
                weight=ex["weight"],
            )

        if exercises:
            lines = [f"• {e['name']}: {e['sets']}×{e['reps']}" + (f" @ {e['weight']}кг" if e["weight"] != "0.0" else "") for e in exercises]
            ex_text = "\n".join(lines)
            response = f"Тренування записано! {duration} хв.\n\n{ex_text}\n\nВідмінна робота! 💪"
        else:
            response = (
                f"Тренування записано! {duration} хв.\n"
                "Хочеш записати вправи? Наприклад: «жим 80кг 4×5, присід 100кг 3×8»"
            )
        return response, []

    # --- User answered the program questionnaire (1. ... 2. ... 3. ... 4. ...) ---
    if _is_program_spec_answer(message):
        prompt = (
            f"Юзер надав параметри для програми тренувань:\n{message}\n\n"
            "Склади детальну програму тренувань на тиждень з урахуванням всіх параметрів. "
            "Включи конкретні вправи, підходи, повтори, рекомендації щодо відновлення."
        )
        response = await llm_respond(WORKOUT_SYSTEM, prompt)
        if not response:
            response = _build_program(message)
        return response, []

    # --- Program / plan request ---
    if any(kw in text for kw in _PROGRAM_KW):
        active = get_active_workout_program(user_id)
        if active:
            ctx_line = f"Активна програма: {active['name']} (ціль: {active['goal']}, {active['days_per_week']} днів/тиж)."
        else:
            ctx_line = "Активної програми немає."

        prompt = (
            f"Workout context: {workout_ctx}. {ctx_line}\n\n"
            f"User: {message}\n\n"
            "Якщо юзер хоче створити програму — запитай про: ціль, дні/тиж, обладнання, рівень підготовки."
        )
        response = await llm_respond(WORKOUT_SYSTEM, prompt)
        if not response:
            if not active:
                response = (
                    "Давай складемо програму! Скажи мені:\n"
                    "1. Яка ціль? (схуднення / маса / сила / тонус / витривалість)\n"
                    "2. Скільки днів на тиждень?\n"
                    "3. Яке обладнання? (зал / гантелі / вдома)\n"
                    "4. Рівень? (початківець / середній / просунутий)"
                )
            else:
                response = f"У тебе є активна програма «{active['name']}». Хочеш переглянути або змінити?"
        return response, []

    # --- Progress / stats ---
    if any(kw in text for kw in _PROGRESS_KW):
        sessions = get_recent_workout_sessions(user_id, limit=7)
        total = len(sessions)
        total_min = sum(s["duration"] for s in sessions)
        prompt = (
            f"Workout stats: {total} тренувань за останній тиждень, {total_min} хв загалом.\n"
            f"User: {message}"
        )
        response = await llm_respond(WORKOUT_SYSTEM, prompt)
        if not response:
            if total:
                response = f"За останні 7 днів: {total} тренувань, {total_min} хвилин загалом. Продовжуй так!"
            else:
                response = "Тренувань ще не записано. Щоб почати — напиши «потренувався» після кожного тренування."
        return response, []

    # --- General workout question ---
    sessions = get_recent_workout_sessions(user_id, limit=3)
    ctx_line = f"{len(sessions)} тренувань нещодавно." if sessions else "Тренувань ще немає."
    prompt = f"Workout context: {workout_ctx}. {ctx_line}\nUser: {message}"

    response = await llm_respond(WORKOUT_SYSTEM, prompt)
    if not response:
        response = (
            "Хочеш скласти програму тренувань? Відповідай:\n"
            "1. Ціль? (сила / маса / витривалість / тонус)\n"
            "2. Скільки днів на тиждень?\n"
            "3. Обладнання? (зал / гантелі / вдома)\n"
            "4. Рівень? (початківець / середній / просунутий)"
        )
    return response, []
