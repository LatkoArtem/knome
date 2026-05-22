"""User data management — export and account deletion."""
import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from graph.queries import (
    get_user, user_exists,
    get_learning_goals, get_learning_sessions, get_all_topic_reviews,
    get_recent_transactions, get_recent_checkins, get_recent_food_entries,
)
from auth.db import get_auth_by_user_id, delete_integration

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/user", tags=["user"])


@router.get("/export/{user_id}")
async def export_user_data(user_id: str):
    """Export all user data as JSON (GDPR-style)."""
    if not user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")

    user = get_user(user_id)
    auth = get_auth_by_user_id(user_id)

    data = {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "user": {
            "id": user_id,
            "name": user.get("name"),
            "language": user.get("language"),
            "created_at": user.get("created_at"),
            "email": auth.get("email") if auth else None,
        },
        "learning": {
            "goals": get_learning_goals(user_id),
            "sessions": get_learning_sessions(user_id, limit=1000),
            "topic_reviews": get_all_topic_reviews(user_id),
        },
        "finance": {
            "transactions": get_recent_transactions(user_id, limit=5000),
        },
        "health": {
            "checkins": get_recent_checkins(user_id, limit=1000),
            "food_entries": get_recent_food_entries(user_id, limit=1000),
        },
    }

    return JSONResponse(
        content=data,
        headers={"Content-Disposition": f'attachment; filename="knome_export_{user_id[:8]}.json"'},
    )


@router.delete("/delete/{user_id}")
async def delete_user(user_id: str):
    """Delete all user data from Kuzu + SQLite."""
    if not user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")

    from graph.schema import get_connection
    conn = get_connection()

    # Remove all related nodes via Kuzu (cascade through relationships)
    node_types = [
        ("COMPLETED", "LearningSession"),
        ("HAS_GOAL", "Goal"),
        ("HAS_REVIEW", "TopicReview"),
        ("LOGGED_CHECKIN", "CheckIn"),
        ("LOGGED_FOOD", "FoodEntry"),
        ("MADE", "Transaction"),
        ("HAS_SKILL", "Skill"),
        ("HAS_HABIT", "Habit"),
    ]
    for rel, node in node_types:
        try:
            conn.execute(
                f"MATCH (u:User {{id: $uid}})-[:{rel}]->(n:{node}) DETACH DELETE n",
                {"uid": user_id},
            )
        except Exception as e:
            logger.warning("Delete %s for %s: %s", node, user_id, e)

    try:
        conn.execute("MATCH (u:User {id: $uid}) DETACH DELETE u", {"uid": user_id})
    except Exception as e:
        logger.warning("Delete User %s: %s", user_id, e)

    # Remove from SQLite
    from auth.db import _get_conn as _auth_conn
    db = _auth_conn()
    db.execute("DELETE FROM user_integrations WHERE user_id=?", (user_id,))
    db.execute("DELETE FROM auth_users WHERE user_id=?", (user_id,))
    db.commit()

    logger.info("User %s deleted", user_id)
    return {"ok": True, "message": "Всі дані видалено"}
