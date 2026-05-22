from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from graph.queries import (
    get_learning_goals,
    get_learning_sessions,
    add_goal,
    add_learning_session,
    user_exists,
)

router = APIRouter()


class AddSessionRequest(BaseModel):
    duration_min: int
    topic: str = ""


class AddGoalRequest(BaseModel):
    description: str


@router.get("/learning/summary/{user_id}")
async def learning_summary(user_id: str):
    if not user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    goals = get_learning_goals(user_id)
    sessions = get_learning_sessions(user_id, limit=7)
    total_min = sum(s["duration"] for s in sessions)
    return {
        "goals": goals,
        "sessions_this_week": len(sessions),
        "total_minutes": total_min,
        "recent_sessions": sessions[:5],
    }


@router.post("/learning/session/{user_id}")
async def log_session(user_id: str, body: AddSessionRequest):
    if not user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    sid = add_learning_session(user_id, body.duration_min, body.topic)
    return {"session_id": sid, "duration_min": body.duration_min}


@router.post("/learning/goal/{user_id}")
async def add_learning_goal(user_id: str, body: AddGoalRequest):
    if not user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    gid = add_goal(user_id, "learning", body.description)
    return {"goal_id": gid, "description": body.description}
