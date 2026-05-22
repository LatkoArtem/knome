from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from graph.queries import get_recent_checkins, add_checkin, add_food_entry, user_exists

router = APIRouter()


class CheckInRequest(BaseModel):
    sleep_hours: float
    mood: int
    energy: int
    notes: str = ""


class FoodEntryRequest(BaseModel):
    name: str
    calories: float = 0.0


@router.get("/health-domain/summary/{user_id}")
async def health_summary(user_id: str):
    if not user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    checkins = get_recent_checkins(user_id, limit=7)
    avg_mood = sum(c["mood"] for c in checkins) / len(checkins) if checkins else 0
    avg_sleep = sum(c["sleep_hours"] for c in checkins) / len(checkins) if checkins else 0
    return {
        "recent_checkins": checkins,
        "avg_mood_7d": round(avg_mood, 1),
        "avg_sleep_7d": round(avg_sleep, 1),
        "checkin_count": len(checkins),
    }


@router.post("/health-domain/checkin/{user_id}")
async def log_checkin(user_id: str, body: CheckInRequest):
    if not user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    cid = add_checkin(user_id, body.sleep_hours, body.mood, body.energy, body.notes)
    return {"checkin_id": cid}


@router.post("/health-domain/food/{user_id}")
async def log_food(user_id: str, body: FoodEntryRequest):
    if not user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    fid = add_food_entry(user_id, body.name, body.calories)
    return {"food_entry_id": fid}
