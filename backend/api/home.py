from fastapi import APIRouter
from pydantic import BaseModel
from datetime import date, timedelta

import graph.queries as q

router = APIRouter(prefix="/api/home", tags=["home"])


# ── Home Tasks ────────────────────────────────────────────────────

class HomeTaskIn(BaseModel):
    name: str
    category: str = "other"
    frequency: str = "monthly"


@router.post("/task/{user_id}")
def add_task(user_id: str, body: HomeTaskIn):
    tid = q.add_home_task(user_id, body.name, body.category, body.frequency)
    return {"id": tid}


@router.get("/tasks/{user_id}")
def get_tasks(user_id: str):
    tasks = q.get_home_tasks(user_id)
    today = date.today().isoformat()
    overdue = sum(1 for t in tasks if t["next_due"] and t["next_due"] < today)
    return {"tasks": tasks, "total": len(tasks), "overdue": overdue}


@router.patch("/task/{task_id}/done")
def mark_done(task_id: str, frequency: str = "monthly"):
    q.mark_home_task_done(task_id, frequency)
    return {"ok": True}


@router.delete("/task/{task_id}")
def delete_task(task_id: str):
    q.delete_home_task(task_id)
    return {"ok": True}


# ── Shopping ──────────────────────────────────────────────────────

class ShoppingItemIn(BaseModel):
    name: str
    category: str = "other"
    quantity: str = "1"
    regular: bool = False


@router.post("/shopping/{user_id}")
def add_item(user_id: str, body: ShoppingItemIn):
    iid = q.add_shopping_item(user_id, body.name, body.category, body.quantity, body.regular)
    return {"id": iid}


@router.get("/shopping/{user_id}")
def get_items(user_id: str):
    items = q.get_shopping_items(user_id)
    to_buy = [i for i in items if not i["is_bought"]]
    bought = [i for i in items if i["is_bought"]]
    return {"to_buy": to_buy, "bought": bought, "total": len(items)}


@router.patch("/shopping/{item_id}/bought")
def mark_bought(item_id: str):
    q.mark_shopping_item_bought(item_id)
    return {"ok": True}


@router.patch("/shopping/{item_id}/unmark")
def unmark_item(item_id: str):
    q.unmark_shopping_item(item_id)
    return {"ok": True}


@router.delete("/shopping/{item_id}")
def delete_item(item_id: str):
    q.delete_shopping_item(item_id)
    return {"ok": True}


@router.delete("/shopping/{user_id}/clear-bought")
def clear_bought(user_id: str):
    q.clear_bought_items(user_id)
    return {"ok": True}


# ── Meal Plan ─────────────────────────────────────────────────────

class MealPlanIn(BaseModel):
    week_start: str
    monday: str = ""
    tuesday: str = ""
    wednesday: str = ""
    thursday: str = ""
    friday: str = ""
    saturday: str = ""
    sunday: str = ""
    prep_notes: str = ""


@router.put("/meal-plan/{user_id}")
def save_plan(user_id: str, body: MealPlanIn):
    mid = q.save_meal_plan(
        user_id, body.week_start,
        body.monday, body.tuesday, body.wednesday,
        body.thursday, body.friday, body.saturday, body.sunday,
        body.prep_notes,
    )
    return {"id": mid}


@router.get("/meal-plan/{user_id}")
def get_plan(user_id: str, week_start: str = ""):
    if not week_start:
        today = date.today()
        week_start = (today - timedelta(days=today.weekday())).isoformat()
    plan = q.get_meal_plan(user_id, week_start)
    return plan or {
        "id": None, "week_start": week_start,
        "monday": "", "tuesday": "", "wednesday": "", "thursday": "",
        "friday": "", "saturday": "", "sunday": "", "prep_notes": "",
    }
