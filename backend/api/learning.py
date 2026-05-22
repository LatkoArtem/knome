from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from graph.queries import (
    get_learning_goals,
    get_learning_sessions,
    add_goal,
    add_learning_session,
    get_due_reviews,
    get_all_topic_reviews,
    upsert_topic_review,
    user_exists,
)
from ml.sm2 import infer_quality

router = APIRouter()


class AddSessionRequest(BaseModel):
    duration_min: int
    topic: str = ""


class AddGoalRequest(BaseModel):
    description: str


class ReviewQualityRequest(BaseModel):
    topic_name: str
    quality: int  # 0-5


@router.get("/learning/summary/{user_id}")
async def learning_summary(user_id: str):
    if not user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    goals = get_learning_goals(user_id)
    sessions = get_learning_sessions(user_id, limit=7)
    total_min = sum(s["duration"] for s in sessions)
    due = get_due_reviews(user_id)
    return {
        "goals": goals,
        "sessions_this_week": len(sessions),
        "total_minutes": total_min,
        "recent_sessions": sessions[:5],
        "due_reviews": due,
        "due_count": len(due),
    }


@router.get("/learning/due/{user_id}")
async def due_reviews(user_id: str):
    if not user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    return {"due": get_due_reviews(user_id), "all": get_all_topic_reviews(user_id)}


@router.post("/learning/session/{user_id}")
async def log_session(user_id: str, body: AddSessionRequest):
    if not user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    sid = add_learning_session(user_id, body.duration_min, body.topic)
    review = None
    if body.topic:
        quality = infer_quality(body.topic, body.duration_min)
        review = upsert_topic_review(user_id, body.topic, quality)
    return {
        "session_id": sid,
        "duration_min": body.duration_min,
        "review": review,
    }


@router.post("/learning/goal/{user_id}")
async def add_learning_goal(user_id: str, body: AddGoalRequest):
    if not user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    gid = add_goal(user_id, "learning", body.description)
    return {"goal_id": gid, "description": body.description}


@router.post("/learning/review/{user_id}")
async def mark_reviewed(user_id: str, body: ReviewQualityRequest):
    """Manually record a review result (e.g. from UI flashcard)."""
    if not user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    review = upsert_topic_review(user_id, body.topic_name, body.quality)
    return review
