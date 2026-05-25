from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import date
from graph import queries as q

router = APIRouter(prefix="/api/relationships", tags=["relationships"])


def _user_exists(user_id: str) -> bool:
    return bool(q.get_user(user_id))


class ContactRequest(BaseModel):
    name: str
    relationship_type: Optional[str] = "friend"
    birthday: Optional[str] = ""
    notes: Optional[str] = ""
    tags: Optional[str] = ""


class InteractionRequest(BaseModel):
    contact_id: str
    note: str
    interaction_type: Optional[str] = "general"


@router.post("/contact/{user_id}")
def add_contact(user_id: str, req: ContactRequest):
    if not _user_exists(user_id):
        raise HTTPException(404, "User not found")
    contact_id = q.add_contact(
        user_id, req.name, req.relationship_type,
        req.birthday, req.notes, req.tags
    )
    return {"id": contact_id, "status": "created"}


@router.get("/contacts/{user_id}")
def get_contacts(user_id: str):
    if not _user_exists(user_id):
        raise HTTPException(404, "User not found")
    contacts = q.get_contacts(user_id)
    # Annotate upcoming birthdays
    today = date.today()
    for c in contacts:
        bd = c.get("birthday", "")
        c["days_until_birthday"] = None
        if bd:
            try:
                parts = bd.split("-")
                bday = date(today.year, int(parts[1]), int(parts[2]))
                if bday < today:
                    bday = date(today.year + 1, int(parts[1]), int(parts[2]))
                c["days_until_birthday"] = (bday - today).days
            except Exception:
                pass
    return {"contacts": contacts}


@router.post("/interaction/{user_id}")
def add_interaction(user_id: str, req: InteractionRequest):
    if not _user_exists(user_id):
        raise HTTPException(404, "User not found")
    iid = q.add_interaction(user_id, req.contact_id, req.note, req.interaction_type)
    return {"id": iid, "status": "created"}


@router.get("/interactions/{user_id}/{contact_id}")
def get_interactions(user_id: str, contact_id: str, limit: int = 5):
    if not _user_exists(user_id):
        raise HTTPException(404, "User not found")
    return {"interactions": q.get_interactions(user_id, contact_id, limit)}


@router.delete("/contact/{contact_id}")
def delete_contact(contact_id: str):
    q.delete_contact(contact_id)
    return {"status": "deleted"}


@router.get("/summary/{user_id}")
def get_summary(user_id: str):
    if not _user_exists(user_id):
        raise HTTPException(404, "User not found")
    contacts = q.get_contacts(user_id)
    today = date.today()
    upcoming = []
    for c in contacts:
        bd = c.get("birthday", "")
        if bd:
            try:
                parts = bd.split("-")
                bday = date(today.year, int(parts[1]), int(parts[2]))
                if bday < today:
                    bday = date(today.year + 1, int(parts[1]), int(parts[2]))
                days = (bday - today).days
                if days <= 30:
                    upcoming.append({"name": c["name"], "days": days, "birthday": bd})
            except Exception:
                pass
    upcoming.sort(key=lambda x: x["days"])
    return {
        "total_contacts": len(contacts),
        "upcoming_birthdays": upcoming[:5],
    }
