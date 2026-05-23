from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from graph import queries as q

router = APIRouter(prefix="/api/goals", tags=["goals"])


def _user_exists(user_id: str) -> bool:
    return bool(q.get_user(user_id))


class LifeGoalRequest(BaseModel):
    title: str
    description: Optional[str] = ""
    category: Optional[str] = "personal"
    target_date: Optional[str] = ""


class GoalStatusRequest(BaseModel):
    status: str


class BucketItemRequest(BaseModel):
    title: str
    category: Optional[str] = "adventure"
    notes: Optional[str] = ""


# ─── Life Goals ─────────────────────────────────────────────────
@router.post("/life/{user_id}")
def add_life_goal(user_id: str, req: LifeGoalRequest):
    if not _user_exists(user_id):
        raise HTTPException(404, "User not found")
    gid = q.add_life_goal(user_id, req.title, req.description, req.category, req.target_date)
    return {"id": gid, "status": "created"}


@router.get("/life/{user_id}")
def get_life_goals(user_id: str):
    if not _user_exists(user_id):
        raise HTTPException(404, "User not found")
    return {"goals": q.get_life_goals(user_id)}


@router.patch("/life/{goal_id}/status")
def update_goal_status(goal_id: str, req: GoalStatusRequest):
    q.update_life_goal_status(goal_id, req.status)
    return {"status": "updated"}


# ─── Bucket List ─────────────────────────────────────────────────
@router.post("/bucket/{user_id}")
def add_bucket_item(user_id: str, req: BucketItemRequest):
    if not _user_exists(user_id):
        raise HTTPException(404, "User not found")
    bid = q.add_bucket_item(user_id, req.title, req.category, req.notes)
    return {"id": bid, "status": "created"}


@router.get("/bucket/{user_id}")
def get_bucket_items(user_id: str):
    if not _user_exists(user_id):
        raise HTTPException(404, "User not found")
    return {"items": q.get_bucket_items(user_id)}


@router.patch("/bucket/{item_id}/complete")
def complete_bucket_item(item_id: str):
    q.complete_bucket_item(item_id)
    return {"status": "completed"}


@router.get("/summary/{user_id}")
def get_summary(user_id: str):
    if not _user_exists(user_id):
        raise HTTPException(404, "User not found")
    goals = q.get_life_goals(user_id)
    items = q.get_bucket_items(user_id)
    active = [g for g in goals if g["status"] == "active"]
    done_goals = [g for g in goals if g["status"] == "done"]
    done_items = [i for i in items if i["status"] == "done"]
    by_category: dict[str, int] = {}
    for i in items:
        cat = i.get("category", "other")
        by_category[cat] = by_category.get(cat, 0) + 1
    return {
        "active_goals": len(active),
        "done_goals": len(done_goals),
        "bucket_total": len(items),
        "bucket_done": len(done_items),
        "bucket_by_category": by_category,
    }
