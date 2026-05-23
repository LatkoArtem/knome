from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from graph.queries import (
    user_exists,
    create_workout_program,
    get_workout_programs,
    get_active_workout_program,
    add_workout_session,
    add_exercise_log,
    get_recent_workout_sessions,
    get_session_exercises,
)

router = APIRouter()


class WorkoutProgramRequest(BaseModel):
    name: str
    goal: str
    days_per_week: int
    equipment: str
    level: str
    duration_min: int = 60


class WorkoutSessionRequest(BaseModel):
    duration: int = 60
    notes: str = ""
    rating: int = 0
    program_id: str = ""
    exercises: list[dict] = []


class ExerciseLogRequest(BaseModel):
    exercise_name: str
    sets: int
    reps: str
    weight: str = "0"
    rpe: float = 0.0


@router.get("/workout/programs/{user_id}")
async def get_programs(user_id: str):
    if not user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    programs = get_workout_programs(user_id)
    active = get_active_workout_program(user_id)
    return {"programs": programs, "active": active}


@router.post("/workout/program/{user_id}")
async def create_program(user_id: str, body: WorkoutProgramRequest):
    if not user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    program_id = create_workout_program(
        user_id,
        name=body.name,
        goal=body.goal,
        days_per_week=body.days_per_week,
        equipment=body.equipment,
        level=body.level,
        duration_min=body.duration_min,
    )
    return {"program_id": program_id, "message": "Program created and set as active"}


@router.post("/workout/session/{user_id}")
async def log_session(user_id: str, body: WorkoutSessionRequest):
    if not user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    session_id = add_workout_session(
        user_id,
        duration=body.duration,
        notes=body.notes,
        rating=body.rating,
        program_id=body.program_id,
    )
    for ex in body.exercises:
        add_exercise_log(
            session_id,
            exercise_name=ex.get("exercise_name", ex.get("name", "")),
            sets=ex.get("sets", 0),
            reps=str(ex.get("reps", "")),
            weight=str(ex.get("weight", "0")),
            rpe=float(ex.get("rpe", 0.0)),
        )
    return {"session_id": session_id, "exercises_logged": len(body.exercises)}


@router.get("/workout/sessions/{user_id}")
async def get_sessions(user_id: str, limit: int = 10):
    if not user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    sessions = get_recent_workout_sessions(user_id, limit=limit)
    return {"sessions": sessions, "count": len(sessions)}


@router.get("/workout/session/{session_id}/exercises")
async def get_exercises(session_id: str):
    exercises = get_session_exercises(session_id)
    return {"exercises": exercises}


@router.get("/workout/summary/{user_id}")
async def workout_summary(user_id: str):
    if not user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    sessions = get_recent_workout_sessions(user_id, limit=30)
    active = get_active_workout_program(user_id)

    total = len(sessions)
    total_min = sum(s["duration"] for s in sessions)
    last_date = sessions[0]["date"] if sessions else None

    weekly = [s for s in sessions if s["date"] >= _days_ago(7)]

    return {
        "total_sessions": total,
        "total_minutes": total_min,
        "sessions_this_week": len(weekly),
        "last_session_date": last_date,
        "active_program": active,
    }


def _days_ago(n: int) -> str:
    from datetime import datetime, timedelta, timezone
    return (datetime.now(timezone.utc) - timedelta(days=n)).isoformat()
