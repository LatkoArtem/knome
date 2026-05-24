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
    """Rule-based fallback program generator without LLM."""
    text = message.lower()
    days = _parse_days(text)

    is_football = any(w in text for w in ["футбол", "матч", "матчі", "бігати", "ноги не забивалися"])
    is_endurance = any(w in text for w in ["витривалість", "кардіо", "бігати"])
    is_strength = any(w in text for w in ["сила", "силу", "жим", "штанга"])
    has_home_gym = any(w in text for w in ["гантел", "штанг", "лавк", "вдома", "диски"])

    if is_football:
        if days >= 3:
            return (
                "**Програма для футболістів — 3 дні/тиждень** ⚽\n\n"
                "**День 1 — Сила ніг + вибухова швидкість**\n"
                "• Присідання зі штангою — 4×6 (важка вага)\n"
                "• Румунська тяга — 3×8\n"
                "• Випади з гантелями — 3×10 на ногу\n"
                "• Стрибки на місці (вибухові) — 4×8\n"
                "• Ікри стоячи зі штангою — 4×15\n\n"
                "**День 2 — Кардіо + витривалість**\n"
                "• Інтервальний біг: 8×(30с швидко / 90с повільно)\n"
                "• Планка — 3×60с\n"
                "• Бічні переміщення — 4×30с\n"
                "• Берпі — 3×10\n"
                "• Прес: скручування + підйоми ніг — 3×15\n\n"
                "**День 3 — Верх тіла + стабільність**\n"
                "• Жим лежачи — 4×8\n"
                "• Тяга гантелей в нахилі — 3×10\n"
                "• Жим гантелей сидячи — 3×10\n"
                "• Відтискання — 3×12\n"
                "• Планка бічна — 3×45с на бік\n\n"
                f"**Розклад:** Пн/Ср/Пт — тренування, Сб/Нд — матчі 🏟️\n"
                "**Відновлення:** 10 хв розминка + 10 хв стретчинг після кожного тренування.\n"
                "Програму збережено в розділі Тренування."
            )
        else:
            return (
                "**Програма для футболістів — 2 дні/тиждень** ⚽\n\n"
                "**День 1 — Сила + вибухова робота**\n"
                "• Присідання — 4×6, Румунська тяга — 3×8\n"
                "• Стрибки — 4×8, Ікри — 4×15\n\n"
                "**День 2 — Витривалість + кор**\n"
                "• Інтервали 8×(30с/90с), Планка 3×60с, Берпі 3×10\n\n"
                "Програму збережено в розділі Тренування."
            )

    # Generic fallback
    eq = "зі штангою та гантелями" if has_home_gym else "з гантелями"
    return (
        f"**Індивідуальна програма — {days} дні/тиждень**\n\n"
        "**День 1 — Нижня частина тіла**\n"
        f"• Присідання {eq} — 4×8\n"
        "• Румунська тяга — 3×10\n"
        "• Випади — 3×12, Ікри — 4×15\n\n"
        "**День 2 — Верхня частина тіла**\n"
        "• Жим лежачи — 4×8\n"
        "• Тяга у нахилі — 3×10, Жим плечей — 3×10\n\n"
        "**День 3 — Кардіо + кор**\n"
        "• Інтервальний біг 20 хв, Планка, Прес\n\n"
        "Програму збережено в розділі Тренування."
    )

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
