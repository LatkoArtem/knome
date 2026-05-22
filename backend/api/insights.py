from fastapi import APIRouter
from graph.queries import get_user_context, user_exists
from llm.insights import generate_insights

router = APIRouter()


@router.get("/insights/{user_id}")
async def get_insights(user_id: str):
    if not user_exists(user_id):
        return {"insights": [], "user_name": ""}

    ctx = get_user_context(user_id)
    insights = await generate_insights(ctx)
    user_name = ctx.get("user", {}).get("name", "") if ctx else ""

    return {"insights": insights, "user_name": user_name}
