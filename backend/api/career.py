from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from graph import queries as q

router = APIRouter(prefix="/api/career", tags=["career"])


def _user_exists(user_id: str) -> bool:
    return bool(q.get_user(user_id))


class CareerSkillRequest(BaseModel):
    name: str
    level: Optional[int] = 5
    category: Optional[str] = "general"
    last_used: Optional[str] = ""


class SkillLevelRequest(BaseModel):
    level: int


class AchievementRequest(BaseModel):
    title: str
    description: Optional[str] = ""
    date: Optional[str] = ""
    impact: Optional[str] = "medium"
    skills_used: Optional[str] = ""


@router.post("/skill/{user_id}")
def add_skill(user_id: str, req: CareerSkillRequest):
    if not _user_exists(user_id):
        raise HTTPException(404, "User not found")
    skill_id = q.add_career_skill(user_id, req.name, req.level, req.category)
    return {"id": skill_id, "status": "created"}


@router.get("/skills/{user_id}")
def get_skills(user_id: str):
    if not _user_exists(user_id):
        raise HTTPException(404, "User not found")
    return {"skills": q.get_career_skills(user_id)}


@router.patch("/skill/{skill_id}/level")
def update_skill_level(skill_id: str, req: SkillLevelRequest):
    level = max(1, min(10, req.level))
    q.update_career_skill_level(skill_id, level)
    return {"status": "updated", "level": level}


@router.post("/achievement/{user_id}")
def add_achievement(user_id: str, req: AchievementRequest):
    if not _user_exists(user_id):
        raise HTTPException(404, "User not found")
    ach_id = q.add_achievement(user_id, req.title, req.description, req.impact, req.skills_used)
    return {"id": ach_id, "status": "created"}


@router.get("/achievements/{user_id}")
def get_achievements(user_id: str):
    if not _user_exists(user_id):
        raise HTTPException(404, "User not found")
    return {"achievements": q.get_achievements(user_id)}


@router.get("/summary/{user_id}")
def get_summary(user_id: str):
    if not _user_exists(user_id):
        raise HTTPException(404, "User not found")
    skills = q.get_career_skills(user_id)
    achievements = q.get_achievements(user_id)
    top_skills = sorted(skills, key=lambda s: s.get("level", 0), reverse=True)[:5]
    categories = {}
    for s in skills:
        cat = s.get("category", "general")
        categories[cat] = categories.get(cat, 0) + 1
    return {
        "total_skills": len(skills),
        "total_achievements": len(achievements),
        "top_skills": top_skills,
        "skill_categories": categories,
        "recent_achievements": achievements[:3],
    }
