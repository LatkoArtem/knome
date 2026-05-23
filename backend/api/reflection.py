from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from graph import queries as q

router = APIRouter(prefix="/api/reflection", tags=["reflection"])


def _user_exists(user_id: str) -> bool:
    return bool(q.get_user(user_id))


class JournalRequest(BaseModel):
    text: str
    mood: Optional[int] = 5
    energy: Optional[int] = 5
    tags: Optional[str] = ""


class GratitudeRequest(BaseModel):
    item1: str
    item2: Optional[str] = ""
    item3: Optional[str] = ""


class WeeklyReviewRequest(BaseModel):
    week: str
    wins: str
    challenges: str
    focus: str


# ─── Journal ────────────────────────────────────────────────────
@router.post("/journal/{user_id}")
def add_journal(user_id: str, req: JournalRequest):
    if not _user_exists(user_id):
        raise HTTPException(404, "User not found")
    entry_id = q.add_journal_entry(user_id, req.text, req.mood, req.energy, req.tags)
    return {"id": entry_id, "status": "created"}


@router.get("/journal/{user_id}")
def get_journal(user_id: str, limit: int = 20):
    if not _user_exists(user_id):
        raise HTTPException(404, "User not found")
    return {"entries": q.get_journal_entries(user_id, limit)}


# ─── Gratitude ──────────────────────────────────────────────────
@router.post("/gratitude/{user_id}")
def add_gratitude(user_id: str, req: GratitudeRequest):
    if not _user_exists(user_id):
        raise HTTPException(404, "User not found")
    entry_id = q.add_gratitude_entry(user_id, req.item1, req.item2, req.item3)
    return {"id": entry_id, "status": "created"}


@router.get("/gratitude/{user_id}")
def get_gratitude(user_id: str, limit: int = 20):
    if not _user_exists(user_id):
        raise HTTPException(404, "User not found")
    return {"entries": q.get_gratitude_entries(user_id, limit)}


# ─── Weekly Review ──────────────────────────────────────────────
@router.post("/weekly/{user_id}")
def add_weekly(user_id: str, req: WeeklyReviewRequest):
    if not _user_exists(user_id):
        raise HTTPException(404, "User not found")
    review_id = q.add_weekly_review(user_id, req.week, req.wins, req.challenges, req.focus)
    return {"id": review_id, "status": "created"}


@router.get("/weekly/{user_id}")
def get_weekly(user_id: str, limit: int = 10):
    if not _user_exists(user_id):
        raise HTTPException(404, "User not found")
    return {"reviews": q.get_weekly_reviews(user_id, limit)}


@router.get("/summary/{user_id}")
def get_summary(user_id: str):
    if not _user_exists(user_id):
        raise HTTPException(404, "User not found")
    entries = q.get_journal_entries(user_id, 30)
    gratitude = q.get_gratitude_entries(user_id, 30)
    reviews = q.get_weekly_reviews(user_id, 4)
    return {
        "journal_count": len(entries),
        "gratitude_streak": len(gratitude),
        "last_review": reviews[0]["week"] if reviews else None,
        "recent_entries": entries[:3],
    }
