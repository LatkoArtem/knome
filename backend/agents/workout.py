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
            "Можу допомогти з:\n"
            "• Записати тренування: «потренувався, жим 80кг 4×5»\n"
            "• Скласти програму: «склади план на 3 дні»\n"
            "• Переглянути прогрес: «покажи статистику»"
        )
    return response, []
