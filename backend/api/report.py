"""On-demand AI report generation."""
from fastapi import APIRouter, HTTPException
from graph.queries import user_exists, get_user_context
from llm.client import llm_respond
from llm.context import format_context

router = APIRouter(prefix="/report", tags=["report"])

_WEEKLY_SYSTEM = """You are Knome, a personal AI agent. Generate a warm, insightful weekly summary for the user.
Structure it as:
1. One encouraging opening line about their week
2. 2-3 key observations about learning, health, or finance
3. One actionable suggestion for next week

Keep it to 4-6 sentences total. Write in Ukrainian. Use their name if provided."""


@router.post("/weekly/{user_id}")
async def generate_weekly_report(user_id: str):
    if not user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")

    ctx = get_user_context(user_id)
    name = ctx.get("user", {}).get("name", "")
    ctx_str = format_context(ctx)

    prompt = f"User name: {name}\n\nWeek data:\n{ctx_str}"
    report = await llm_respond(_WEEKLY_SYSTEM, prompt)

    if not report:
        # Rule-based fallback
        h = ctx.get("health", {})
        f = ctx.get("finance", {})
        l = ctx.get("learning", {})
        parts = [f"Привіт{', ' + name if name else ''}! Ось твій тижневий підсумок."]
        if h.get("avg_mood"):
            parts.append(f"Середній настрій: {h['avg_mood']}/10, сон: {h.get('avg_sleep', '—')}г.")
        if f.get("total_spent"):
            parts.append(f"Витрати за тиждень: {f['total_spent']:.0f} {f.get('currency', 'UAH')}.")
        if l.get("total_minutes"):
            parts.append(f"Навчання: {l['total_minutes']} хвилин у {l.get('session_count', 0)} сесіях.")
        parts.append("Продовжуй в тому ж темпі — ти молодець!")
        report = " ".join(parts)

    return {"report": report, "user_name": name}
