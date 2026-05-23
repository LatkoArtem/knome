from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from graph.queries import (
    user_exists,
    add_task,
    get_tasks,
    update_task_status,
    add_project,
    get_projects,
    add_pomodoro,
    get_pomodoros_today,
)

router = APIRouter()


class TaskRequest(BaseModel):
    title: str
    priority: int = 3
    due_date: str = ""
    project: str = ""
    domain: str = "general"


class TaskStatusRequest(BaseModel):
    status: str


class ProjectRequest(BaseModel):
    name: str
    description: str = ""
    deadline: str = ""


class PomodoroRequest(BaseModel):
    task_id: str = ""
    duration: int = 25
    completed: bool = True


@router.get("/productivity/tasks/{user_id}")
async def list_tasks(user_id: str, status: str = "active"):
    if not user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    tasks = get_tasks(user_id, status=status)
    return {"tasks": tasks, "count": len(tasks)}


@router.post("/productivity/task/{user_id}")
async def create_task(user_id: str, body: TaskRequest):
    if not user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    task_id = add_task(
        user_id,
        title=body.title,
        priority=body.priority,
        due_date=body.due_date,
        project=body.project,
        domain=body.domain,
    )
    return {"task_id": task_id}


@router.patch("/productivity/task/{task_id}/status")
async def set_task_status(task_id: str, body: TaskStatusRequest):
    allowed = {"active", "done", "cancelled"}
    if body.status not in allowed:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {allowed}")
    update_task_status(task_id, body.status)
    return {"task_id": task_id, "status": body.status}


@router.get("/productivity/projects/{user_id}")
async def list_projects(user_id: str):
    if not user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    projects = get_projects(user_id)
    return {"projects": projects, "count": len(projects)}


@router.post("/productivity/project/{user_id}")
async def create_project(user_id: str, body: ProjectRequest):
    if not user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    project_id = add_project(
        user_id,
        name=body.name,
        description=body.description,
        deadline=body.deadline,
    )
    return {"project_id": project_id}


@router.post("/productivity/pomodoro/{user_id}")
async def log_pomodoro(user_id: str, body: PomodoroRequest):
    if not user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    pomodoro_id = add_pomodoro(
        user_id,
        task_id=body.task_id,
        duration=body.duration,
        completed=body.completed,
    )
    return {"pomodoro_id": pomodoro_id}


@router.get("/productivity/pomodoros/{user_id}/today")
async def pomodoros_today(user_id: str):
    if not user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    sessions = get_pomodoros_today(user_id)
    completed = [s for s in sessions if s["completed"]]
    focus_minutes = sum(s["duration"] for s in completed)
    return {
        "pomodoros": sessions,
        "total_today": len(sessions),
        "completed_today": len(completed),
        "focus_minutes": focus_minutes,
    }


@router.get("/productivity/summary/{user_id}")
async def productivity_summary(user_id: str):
    if not user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    active_tasks = get_tasks(user_id, status="active")
    done_tasks = get_tasks(user_id, status="done")
    projects = get_projects(user_id)
    pomodoros = get_pomodoros_today(user_id)

    high_priority = [t for t in active_tasks if t["priority"] >= 4]
    focus_min = sum(p["duration"] for p in pomodoros if p["completed"])

    return {
        "active_tasks": len(active_tasks),
        "done_tasks": len(done_tasks),
        "high_priority_tasks": len(high_priority),
        "active_projects": len([p for p in projects if p["status"] == "active"]),
        "pomodoros_today": len(pomodoros),
        "focus_minutes_today": focus_min,
        "top_tasks": active_tasks[:5],
    }
