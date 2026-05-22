import uuid
from datetime import datetime, timezone
from typing import Optional

from graph.schema import get_connection


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_user(name: str, language: str = "ua", age: Optional[int] = None) -> str:
    conn = get_connection()
    user_id = str(uuid.uuid4())
    conn.execute(
        "CREATE (u:User {id: $id, name: $name, age: $age, language: $lang, created_at: $ts})",
        {"id": user_id, "name": name, "age": age or 0, "lang": language, "ts": _now()},
    )
    return user_id


def get_user(user_id: str) -> Optional[dict]:
    conn = get_connection()
    result = conn.execute(
        "MATCH (u:User {id: $id}) RETURN u.id, u.name, u.age, u.language, u.created_at",
        {"id": user_id},
    )
    row = result.get_next() if result.has_next() else None
    if row is None:
        return None
    return {"id": row[0], "name": row[1], "age": row[2], "language": row[3], "created_at": row[4]}


def user_exists(user_id: str) -> bool:
    return get_user(user_id) is not None


def add_goal(user_id: str, domain: str, description: str, deadline: str = "", status: str = "active") -> str:
    conn = get_connection()
    goal_id = str(uuid.uuid4())
    conn.execute(
        "CREATE (g:Goal {id: $id, domain: $domain, description: $goal_desc, deadline: $dl, status: $st})",
        {"id": goal_id, "domain": domain, "goal_desc": description, "dl": deadline, "st": status},
    )
    conn.execute(
        "MATCH (u:User {id: $uid}), (g:Goal {id: $gid}) CREATE (u)-[:HAS_GOAL]->(g)",
        {"uid": user_id, "gid": goal_id},
    )
    return goal_id


def get_user_context(user_id: str) -> dict:
    """Full cross-domain context for LLM — health, finance, learning, goals, patterns."""
    conn = get_connection()
    user = get_user(user_id)
    if not user:
        return {}

    goals_result = conn.execute(
        "MATCH (u:User {id: $uid})-[:HAS_GOAL]->(g:Goal) RETURN g.domain, g.description, g.status",
        {"uid": user_id},
    )
    goals = []
    while goals_result.has_next():
        row = goals_result.get_next()
        goals.append({"domain": row[0], "description": row[1], "status": row[2]})

    checkins = get_recent_checkins(user_id, limit=7)
    sessions = get_learning_sessions(user_id, limit=7)
    transactions = get_recent_transactions(user_id, limit=20)

    health_ctx: dict = {}
    if checkins:
        health_ctx["recent"] = checkins
        health_ctx["avg_mood"] = round(sum(c["mood"] for c in checkins) / len(checkins), 1)
        health_ctx["avg_sleep"] = round(sum(c["sleep_hours"] for c in checkins) / len(checkins), 1)
        health_ctx["last_sleep"] = checkins[0]["sleep_hours"]
        health_ctx["last_mood"] = checkins[0]["mood"]

    learning_ctx: dict = {}
    if sessions:
        learning_ctx["recent"] = sessions
        learning_ctx["total_minutes"] = sum(s["duration"] for s in sessions)
        learning_ctx["session_count"] = len(sessions)

    finance_ctx: dict = {}
    if transactions:
        by_cat: dict[str, float] = {}
        for tx in transactions:
            by_cat[tx["category"]] = by_cat.get(tx["category"], 0) + tx["amount"]
        finance_ctx["total_spent"] = round(sum(by_cat.values()), 2)
        finance_ctx["currency"] = transactions[0]["currency"]
        finance_ctx["top_categories"] = sorted(by_cat, key=lambda k: -by_cat[k])[:3]
        finance_ctx["transaction_count"] = len(transactions)

    patterns = _detect_patterns(health_ctx, learning_ctx, finance_ctx)

    return {
        "user": user,
        "goals": goals,
        "health": health_ctx,
        "learning": learning_ctx,
        "finance": finance_ctx,
        "patterns": patterns,
    }


def _detect_patterns(health: dict, learning: dict, finance: dict) -> list[str]:
    """Simple rule-based cross-domain pattern flags."""
    patterns = []

    if health:
        last_sleep = health.get("last_sleep", 0)
        avg_sleep = health.get("avg_sleep", 0)
        last_mood = health.get("last_mood", 5)
        avg_mood = health.get("avg_mood", 5)

        if last_sleep > 0 and last_sleep < 6:
            patterns.append(f"low_sleep_last_night:{last_sleep}h")
        if avg_sleep > 0 and last_sleep > 0 and last_sleep < avg_sleep - 1:
            patterns.append("sleep_below_average")
        if last_mood < 5:
            patterns.append(f"low_mood_today:{last_mood}/10")
        if avg_mood > 0 and last_mood < avg_mood - 1.5:
            patterns.append("mood_declining")

    if learning:
        total_min = learning.get("total_minutes", 0)
        count = learning.get("session_count", 0)
        if count == 0:
            patterns.append("no_learning_this_week")
        elif total_min < 60:
            patterns.append("low_learning_this_week")

    if health and learning:
        last_sleep = health.get("last_sleep", 8)
        total_min = learning.get("total_minutes", 0)
        if last_sleep < 6 and total_min < 60:
            patterns.append("sleep_learning_risk:poor_sleep_may_reduce_focus")

    if finance and health:
        last_mood = health.get("last_mood", 5)
        if last_mood <= 4 and finance.get("transaction_count", 0) > 3:
            patterns.append("mood_spending_risk:low_mood_with_active_spending")

    return patterns


def _query_all(conn, query: str, params: dict = None) -> list:
    result = conn.execute(query, params or {})
    rows = []
    while result.has_next():
        rows.append(result.get_next())
    return rows


def commit_updates(updates: list[dict]) -> None:
    conn = get_connection()
    for upd in updates:
        conn.execute(upd["query"], upd.get("params", {}))


# --- Learning ---

def get_learning_goals(user_id: str) -> list[dict]:
    conn = get_connection()
    rows = _query_all(
        conn,
        "MATCH (u:User {id: $uid})-[:HAS_GOAL]->(g:Goal {domain: 'learning'}) RETURN g.description, g.status",
        {"uid": user_id},
    )
    return [{"description": r[0], "status": r[1]} for r in rows]


def get_learning_sessions(user_id: str, limit: int = 10) -> list[dict]:
    conn = get_connection()
    rows = _query_all(
        conn,
        f"MATCH (u:User {{id: $uid}})-[:COMPLETED]->(s:LearningSession) "
        f"RETURN s.duration, s.date ORDER BY s.date DESC LIMIT {limit}",
        {"uid": user_id},
    )
    return [{"duration": r[0], "date": r[1]} for r in rows]


def add_learning_session(user_id: str, duration_min: int, topic: str = "") -> str:
    conn = get_connection()
    sid = str(uuid.uuid4())
    conn.execute(
        "CREATE (:LearningSession {id: $id, date: $date, topic_id: $topic, duration: $dur, result: 0.0})",
        {"id": sid, "date": _now(), "topic": topic, "dur": duration_min},
    )
    conn.execute(
        "MATCH (u:User {id: $uid}), (s:LearningSession {id: $sid}) CREATE (u)-[:COMPLETED]->(s)",
        {"uid": user_id, "sid": sid},
    )
    return sid


# --- Finance ---

def get_recent_transactions(user_id: str, limit: int = 20) -> list[dict]:
    conn = get_connection()
    rows = _query_all(
        conn,
        f"MATCH (u:User {{id: $uid}})-[:MADE]->(t:Transaction) "
        f"RETURN t.amount, t.currency, t.category, t.description, t.date "
        f"ORDER BY t.date DESC LIMIT {limit}",
        {"uid": user_id},
    )
    return [{"amount": r[0], "currency": r[1], "category": r[2], "description": r[3], "date": r[4]} for r in rows]


def add_transaction(user_id: str, amount: float, currency: str, category: str, description: str) -> str:
    conn = get_connection()
    tid = str(uuid.uuid4())
    conn.execute(
        "CREATE (:Transaction {id: $id, date: $date, amount: $amount, currency: $cur, category: $cat, description: $tx_desc})",
        {"id": tid, "date": _now(), "amount": amount, "cur": currency, "cat": category, "tx_desc": description},
    )
    conn.execute(
        "MATCH (u:User {id: $uid}), (t:Transaction {id: $tid}) CREATE (u)-[:MADE]->(t)",
        {"uid": user_id, "tid": tid},
    )
    return tid


# --- Health ---

def get_recent_checkins(user_id: str, limit: int = 7) -> list[dict]:
    conn = get_connection()
    rows = _query_all(
        conn,
        f"MATCH (u:User {{id: $uid}})-[:LOGGED_CHECKIN]->(c:CheckIn) "
        f"RETURN c.mood, c.sleep_hours, c.energy, c.date ORDER BY c.date DESC LIMIT {limit}",
        {"uid": user_id},
    )
    return [{"mood": r[0], "sleep_hours": r[1], "energy": r[2], "date": r[3]} for r in rows]


def add_checkin(user_id: str, sleep_hours: float, mood: int, energy: int, notes: str = "") -> str:
    conn = get_connection()
    cid = str(uuid.uuid4())
    conn.execute(
        "CREATE (:CheckIn {id: $id, date: $date, sleep_hours: $sleep, mood: $mood, energy: $energy, notes: $notes})",
        {"id": cid, "date": _now(), "sleep": sleep_hours, "mood": mood, "energy": energy, "notes": notes},
    )
    conn.execute(
        "MATCH (u:User {id: $uid}), (c:CheckIn {id: $cid}) CREATE (u)-[:LOGGED_CHECKIN]->(c)",
        {"uid": user_id, "cid": cid},
    )
    return cid


def add_food_entry(user_id: str, name: str, calories: float = 0.0) -> str:
    conn = get_connection()
    fid = str(uuid.uuid4())
    conn.execute(
        "CREATE (:FoodEntry {id: $id, date: $date, name: $name, calories: $cal, protein: 0.0, fat: 0.0, carbs: 0.0, method: 'manual'})",
        {"id": fid, "date": _now(), "name": name, "cal": calories},
    )
    conn.execute(
        "MATCH (u:User {id: $uid}), (f:FoodEntry {id: $fid}) CREATE (u)-[:LOGGED_FOOD]->(f)",
        {"uid": user_id, "fid": fid},
    )
    return fid
