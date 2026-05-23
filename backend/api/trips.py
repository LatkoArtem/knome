from fastapi import APIRouter
from pydantic import BaseModel

import graph.queries as q

router = APIRouter(prefix="/api/trips", tags=["trips"])


class TripIn(BaseModel):
    destination: str
    date_start: str = ""
    date_end: str = ""
    budget: float = 0.0
    currency: str = "UAH"
    notes: str = ""


class StatusIn(BaseModel):
    status: str


@router.post("/trip/{user_id}")
def add_trip(user_id: str, body: TripIn):
    tid = q.add_trip(
        user_id, body.destination, body.date_start, body.date_end,
        body.budget, body.currency, body.notes,
    )
    return {"id": tid}


@router.get("/{user_id}")
def get_trips(user_id: str):
    trips = q.get_trips(user_id)
    today = __import__("datetime").date.today().isoformat()
    upcoming = sum(1 for t in trips if t["status"] == "planned" and t["date_start"] >= today)
    done = sum(1 for t in trips if t["status"] == "done")
    return {"trips": trips, "total": len(trips), "upcoming": upcoming, "done": done}


@router.patch("/trip/{trip_id}/status")
def update_status(trip_id: str, body: StatusIn):
    q.update_trip_status(trip_id, body.status)
    return {"ok": True}


@router.delete("/trip/{trip_id}")
def delete_trip(trip_id: str):
    q.delete_trip(trip_id)
    return {"ok": True}
