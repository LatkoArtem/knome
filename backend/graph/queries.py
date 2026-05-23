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


def get_all_users() -> list[dict]:
    conn = get_connection()
    rows = _query_all(conn, "MATCH (u:User) RETURN u.id, u.name")
    return [{"id": r[0], "name": r[1]} for r in rows]


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
    food_entries = get_recent_food_entries(user_id, limit=10)

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

    nutrition_ctx: dict = {}
    if food_entries:
        total_kcal = sum(f["calories"] for f in food_entries if f["calories"])
        nutrition_ctx["entries_today"] = len(food_entries)
        nutrition_ctx["total_calories"] = round(total_kcal, 1)

    workout_ctx = get_workout_context(user_id)
    productivity_ctx = get_productivity_context(user_id)
    patterns = _detect_patterns(health_ctx, learning_ctx, finance_ctx)

    return {
        "user": user,
        "goals": goals,
        "health": health_ctx,
        "nutrition": nutrition_ctx,
        "learning": learning_ctx,
        "finance": finance_ctx,
        "workout": workout_ctx,
        "productivity": productivity_ctx,
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


def add_food_entry(
    user_id: str,
    name: str,
    calories: float = 0.0,
    protein: float = 0.0,
    fat: float = 0.0,
    carbs: float = 0.0,
    method: str = "manual",
) -> str:
    conn = get_connection()
    fid = str(uuid.uuid4())
    conn.execute(
        "CREATE (:FoodEntry {id: $id, date: $date, name: $name, calories: $cal, "
        "protein: $prot, fat: $fat, carbs: $carbs, method: $method})",
        {
            "id": fid, "date": _now(), "name": name,
            "cal": calories, "prot": protein, "fat": fat, "carbs": carbs,
            "method": method,
        },
    )
    conn.execute(
        "MATCH (u:User {id: $uid}), (f:FoodEntry {id: $fid}) CREATE (u)-[:LOGGED_FOOD]->(f)",
        {"uid": user_id, "fid": fid},
    )
    return fid


# --- SM-2 Spaced Repetition ---

def get_topic_review(user_id: str, topic_name: str) -> dict | None:
    conn = get_connection()
    rows = _query_all(
        conn,
        "MATCH (u:User {id: $uid})-[:HAS_REVIEW]->(r:TopicReview {topic_name: $topic}) "
        "RETURN r.id, r.topic_name, r.ease_factor, r.interval_days, r.repetitions, "
        "r.next_review_date, r.last_review_date",
        {"uid": user_id, "topic": topic_name.lower()},
    )
    if not rows:
        return None
    r = rows[0]
    return {
        "id": r[0], "topic_name": r[1], "ease_factor": r[2],
        "interval_days": r[3], "repetitions": r[4],
        "next_review_date": r[5], "last_review_date": r[6],
    }


def upsert_topic_review(user_id: str, topic_name: str, quality: int) -> dict:
    """Create or update SM-2 schedule for a topic after a study session."""
    from ml.sm2 import sm2_next, next_review_date as _next_date
    from datetime import date

    topic_key = topic_name.lower().strip()
    existing = get_topic_review(user_id, topic_key)
    today = date.today().isoformat()
    conn = get_connection()

    if existing:
        ef, interval, reps = sm2_next(
            existing["ease_factor"], existing["interval_days"],
            existing["repetitions"], quality,
        )
        nrd = _next_date(interval)
        conn.execute(
            "MATCH (r:TopicReview {id: $id}) SET r.ease_factor = $ef, "
            "r.interval_days = $iv, r.repetitions = $reps, "
            "r.next_review_date = $nrd, r.last_review_date = $today",
            {"id": existing["id"], "ef": ef, "iv": interval, "reps": reps,
             "nrd": nrd, "today": today},
        )
        return {**existing, "ease_factor": ef, "interval_days": interval,
                "repetitions": reps, "next_review_date": nrd, "last_review_date": today}
    else:
        ef, interval, reps = sm2_next(2.5, 0, 0, quality)
        nrd = _next_date(interval)
        rid = str(uuid.uuid4())
        conn.execute(
            "CREATE (:TopicReview {id: $id, topic_name: $topic, ease_factor: $ef, "
            "interval_days: $iv, repetitions: $reps, next_review_date: $nrd, last_review_date: $today})",
            {"id": rid, "topic": topic_key, "ef": ef, "iv": interval, "reps": reps,
             "nrd": nrd, "today": today},
        )
        conn.execute(
            "MATCH (u:User {id: $uid}), (r:TopicReview {id: $rid}) CREATE (u)-[:HAS_REVIEW]->(r)",
            {"uid": user_id, "rid": rid},
        )
        return {"id": rid, "topic_name": topic_key, "ease_factor": ef,
                "interval_days": interval, "repetitions": reps,
                "next_review_date": nrd, "last_review_date": today}


def get_due_reviews(user_id: str) -> list[dict]:
    """Return topics due for review today or overdue."""
    from datetime import date
    from ml.sm2 import days_until_review

    conn = get_connection()
    today = date.today().isoformat()
    rows = _query_all(
        conn,
        "MATCH (u:User {id: $uid})-[:HAS_REVIEW]->(r:TopicReview) "
        "WHERE r.next_review_date <= $today "
        "RETURN r.topic_name, r.next_review_date, r.interval_days, r.repetitions "
        "ORDER BY r.next_review_date ASC",
        {"uid": user_id, "today": today},
    )
    return [
        {
            "topic_name": r[0],
            "next_review_date": r[1],
            "interval_days": r[2],
            "repetitions": r[3],
            "days_overdue": -days_until_review(r[1]),
        }
        for r in rows
    ]


def get_all_topic_reviews(user_id: str) -> list[dict]:
    """All topics with their SM-2 schedule."""
    conn = get_connection()
    rows = _query_all(
        conn,
        "MATCH (u:User {id: $uid})-[:HAS_REVIEW]->(r:TopicReview) "
        "RETURN r.topic_name, r.ease_factor, r.interval_days, r.repetitions, "
        "r.next_review_date, r.last_review_date "
        "ORDER BY r.next_review_date ASC",
        {"uid": user_id},
    )
    from ml.sm2 import days_until_review
    return [
        {
            "topic_name": r[0], "ease_factor": r[1], "interval_days": r[2],
            "repetitions": r[3], "next_review_date": r[4], "last_review_date": r[5],
            "days_until": days_until_review(r[4]),
        }
        for r in rows
    ]


def set_budget(user_id: str, category: str, limit_amount: float, period: str = "monthly") -> str:
    conn = get_connection()
    # Remove existing budget for this category
    existing = _query_all(conn,
        "MATCH (u:User {id: $uid})-[:HAS_BUDGET]->(b:Budget {category: $cat}) RETURN b.id",
        {"uid": user_id, "cat": category})
    for row in existing:
        conn.execute("MATCH (b:Budget {id: $id}) DETACH DELETE b", {"id": row[0]})

    bid = str(uuid.uuid4())
    conn.execute(
        "CREATE (:Budget {id: $id, category: $cat, limit_amount: $lim, period: $period})",
        {"id": bid, "cat": category, "lim": limit_amount, "period": period},
    )
    conn.execute(
        "MATCH (u:User {id: $uid}), (b:Budget {id: $bid}) CREATE (u)-[:HAS_BUDGET]->(b)",
        {"uid": user_id, "bid": bid},
    )
    return bid


def get_budgets(user_id: str) -> list[dict]:
    conn = get_connection()
    rows = _query_all(conn,
        "MATCH (u:User {id: $uid})-[:HAS_BUDGET]->(b:Budget) RETURN b.category, b.limit_amount, b.period",
        {"uid": user_id})
    return [{"category": r[0], "limit_amount": r[1], "period": r[2]} for r in rows]


def delete_budget(user_id: str, category: str) -> None:
    conn = get_connection()
    rows = _query_all(conn,
        "MATCH (u:User {id: $uid})-[:HAS_BUDGET]->(b:Budget {category: $cat}) RETURN b.id",
        {"uid": user_id, "cat": category})
    for row in rows:
        conn.execute("MATCH (b:Budget {id: $id}) DETACH DELETE b", {"id": row[0]})


def get_workout_context(user_id: str) -> dict:
    sessions = get_recent_workout_sessions(user_id, limit=7)
    programs = get_workout_programs(user_id)
    active = next((p for p in programs if p.get("is_active")), None)
    ctx: dict = {}
    if sessions:
        ctx["session_count"] = len(sessions)
        ctx["last_session_date"] = sessions[0]["date"]
        ctx["total_duration"] = sum(s["duration"] for s in sessions)
    if active:
        ctx["active_program"] = active["name"]
        ctx["program_goal"] = active["goal"]
    return ctx


def get_productivity_context(user_id: str) -> dict:
    tasks = get_tasks(user_id, status="active")
    pomodoros = get_pomodoros_today(user_id)
    ctx: dict = {}
    if tasks:
        ctx["active_tasks"] = len(tasks)
        high = [t for t in tasks if t["priority"] >= 4]
        ctx["high_priority_tasks"] = len(high)
    if pomodoros:
        ctx["pomodoros_today"] = len(pomodoros)
        ctx["focus_minutes_today"] = sum(p["duration"] for p in pomodoros if p["completed"])
    return ctx


def get_recent_food_entries(user_id: str, limit: int = 10) -> list[dict]:
    conn = get_connection()
    rows = _query_all(
        conn,
        f"MATCH (u:User {{id: $uid}})-[:LOGGED_FOOD]->(f:FoodEntry) "
        f"RETURN f.name, f.calories, f.protein, f.fat, f.carbs, f.date "
        f"ORDER BY f.date DESC LIMIT {limit}",
        {"uid": user_id},
    )
    return [
        {"name": r[0], "calories": r[1], "protein": r[2], "fat": r[3], "carbs": r[4], "date": r[5]}
        for r in rows
    ]


# --- Workout ---

def create_workout_program(
    user_id: str,
    name: str,
    goal: str,
    days_per_week: int,
    equipment: str,
    level: str,
    duration_min: int = 60,
) -> str:
    conn = get_connection()
    # Deactivate existing programs
    existing = _query_all(conn,
        "MATCH (u:User {id: $uid})-[:HAS_PROGRAM]->(p:WorkoutProgram) RETURN p.id",
        {"uid": user_id})
    for row in existing:
        conn.execute("MATCH (p:WorkoutProgram {id: $id}) SET p.is_active = false", {"id": row[0]})

    pid = str(uuid.uuid4())
    conn.execute(
        "CREATE (:WorkoutProgram {id: $id, name: $name, goal: $goal, days_per_week: $days, "
        "equipment: $eq, level: $level, duration_min: $dur, created_at: $ts, is_active: true})",
        {"id": pid, "name": name, "goal": goal, "days": days_per_week,
         "eq": equipment, "level": level, "dur": duration_min, "ts": _now()},
    )
    conn.execute(
        "MATCH (u:User {id: $uid}), (p:WorkoutProgram {id: $pid}) CREATE (u)-[:HAS_PROGRAM]->(p)",
        {"uid": user_id, "pid": pid},
    )
    return pid


def get_workout_programs(user_id: str) -> list[dict]:
    conn = get_connection()
    rows = _query_all(conn,
        "MATCH (u:User {id: $uid})-[:HAS_PROGRAM]->(p:WorkoutProgram) "
        "RETURN p.id, p.name, p.goal, p.days_per_week, p.equipment, p.level, p.duration_min, p.is_active, p.created_at "
        "ORDER BY p.created_at DESC",
        {"uid": user_id})
    return [
        {"id": r[0], "name": r[1], "goal": r[2], "days_per_week": r[3],
         "equipment": r[4], "level": r[5], "duration_min": r[6], "is_active": r[7], "created_at": r[8]}
        for r in rows
    ]


def get_active_workout_program(user_id: str) -> Optional[dict]:
    programs = get_workout_programs(user_id)
    return next((p for p in programs if p.get("is_active")), None)


def add_workout_session(
    user_id: str,
    duration: int = 60,
    notes: str = "",
    rating: int = 0,
    program_id: str = "",
) -> str:
    conn = get_connection()
    sid = str(uuid.uuid4())
    conn.execute(
        "CREATE (:WorkoutSession {id: $id, date: $date, program_id: $pid, duration: $dur, notes: $notes, rating: $rating})",
        {"id": sid, "date": _now(), "pid": program_id, "dur": duration, "notes": notes, "rating": rating},
    )
    conn.execute(
        "MATCH (u:User {id: $uid}), (s:WorkoutSession {id: $sid}) CREATE (u)-[:DID_SESSION]->(s)",
        {"uid": user_id, "sid": sid},
    )
    return sid


def add_exercise_log(
    session_id: str,
    exercise_name: str,
    sets: int = 0,
    reps: str = "",
    weight: str = "0",
    rpe: float = 0.0,
) -> str:
    conn = get_connection()
    eid = str(uuid.uuid4())
    conn.execute(
        "CREATE (:ExerciseLog {id: $id, session_id: $sid, exercise_name: $name, "
        "sets: $sets, reps: $reps, weight: $weight, rpe: $rpe})",
        {"id": eid, "sid": session_id, "name": exercise_name,
         "sets": sets, "reps": reps, "weight": weight, "rpe": rpe},
    )
    conn.execute(
        "MATCH (s:WorkoutSession {id: $sid}), (e:ExerciseLog {id: $eid}) CREATE (s)-[:LOGGED_EXERCISE]->(e)",
        {"sid": session_id, "eid": eid},
    )
    return eid


def get_recent_workout_sessions(user_id: str, limit: int = 10) -> list[dict]:
    conn = get_connection()
    rows = _query_all(conn,
        f"MATCH (u:User {{id: $uid}})-[:DID_SESSION]->(s:WorkoutSession) "
        f"RETURN s.id, s.date, s.duration, s.notes, s.rating "
        f"ORDER BY s.date DESC LIMIT {limit}",
        {"uid": user_id})
    return [{"id": r[0], "date": r[1], "duration": r[2], "notes": r[3], "rating": r[4]} for r in rows]


def get_session_exercises(session_id: str) -> list[dict]:
    conn = get_connection()
    rows = _query_all(conn,
        "MATCH (s:WorkoutSession {id: $sid})-[:LOGGED_EXERCISE]->(e:ExerciseLog) "
        "RETURN e.exercise_name, e.sets, e.reps, e.weight, e.rpe",
        {"sid": session_id})
    return [{"name": r[0], "sets": r[1], "reps": r[2], "weight": r[3], "rpe": r[4]} for r in rows]


# --- Productivity ---

def add_task(
    user_id: str,
    title: str,
    priority: int = 3,
    due_date: str = "",
    project: str = "",
    domain: str = "general",
) -> str:
    conn = get_connection()
    tid = str(uuid.uuid4())
    conn.execute(
        "CREATE (:Task {id: $id, title: $title, priority: $priority, status: 'active', "
        "due_date: $due, project: $project, domain: $domain, created_at: $ts})",
        {"id": tid, "title": title, "priority": priority, "due": due_date,
         "project": project, "domain": domain, "ts": _now()},
    )
    conn.execute(
        "MATCH (u:User {id: $uid}), (t:Task {id: $tid}) CREATE (u)-[:HAS_TASK]->(t)",
        {"uid": user_id, "tid": tid},
    )
    return tid


def get_tasks(user_id: str, status: str = "active") -> list[dict]:
    conn = get_connection()
    rows = _query_all(conn,
        "MATCH (u:User {id: $uid})-[:HAS_TASK]->(t:Task {status: $status}) "
        "RETURN t.id, t.title, t.priority, t.status, t.due_date, t.project, t.domain, t.created_at "
        "ORDER BY t.priority DESC, t.created_at ASC",
        {"uid": user_id, "status": status})
    return [
        {"id": r[0], "title": r[1], "priority": r[2], "status": r[3],
         "due_date": r[4], "project": r[5], "domain": r[6], "created_at": r[7]}
        for r in rows
    ]


def update_task_status(task_id: str, status: str) -> None:
    conn = get_connection()
    conn.execute("MATCH (t:Task {id: $id}) SET t.status = $status", {"id": task_id, "status": status})


def add_project(user_id: str, name: str, description: str = "", deadline: str = "") -> str:
    conn = get_connection()
    pid = str(uuid.uuid4())
    conn.execute(
        "CREATE (:Project {id: $id, name: $name, description: $desc, status: 'active', "
        "deadline: $dl, created_at: $ts})",
        {"id": pid, "name": name, "desc": description, "dl": deadline, "ts": _now()},
    )
    conn.execute(
        "MATCH (u:User {id: $uid}), (p:Project {id: $pid}) CREATE (u)-[:HAS_PROJECT]->(p)",
        {"uid": user_id, "pid": pid},
    )
    return pid


def get_projects(user_id: str) -> list[dict]:
    conn = get_connection()
    rows = _query_all(conn,
        "MATCH (u:User {id: $uid})-[:HAS_PROJECT]->(p:Project) "
        "RETURN p.id, p.name, p.description, p.status, p.deadline, p.created_at "
        "ORDER BY p.created_at DESC",
        {"uid": user_id})
    return [{"id": r[0], "name": r[1], "description": r[2], "status": r[3], "deadline": r[4], "created_at": r[5]}
            for r in rows]


def add_pomodoro(user_id: str, task_id: str = "", duration: int = 25, completed: bool = True) -> str:
    conn = get_connection()
    pid = str(uuid.uuid4())
    conn.execute(
        "CREATE (:PomodoroSession {id: $id, date: $date, task_id: $tid, duration: $dur, completed: $done})",
        {"id": pid, "date": _now(), "tid": task_id, "dur": duration, "done": completed},
    )
    conn.execute(
        "MATCH (u:User {id: $uid}), (ps:PomodoroSession {id: $pid}) CREATE (u)-[:DID_POMODORO]->(ps)",
        {"uid": user_id, "pid": pid},
    )
    return pid


def get_pomodoros_today(user_id: str) -> list[dict]:
    from datetime import date
    today = date.today().isoformat()
    conn = get_connection()
    rows = _query_all(conn,
        "MATCH (u:User {id: $uid})-[:DID_POMODORO]->(ps:PomodoroSession) "
        "WHERE ps.date STARTS WITH $today "
        "RETURN ps.id, ps.task_id, ps.duration, ps.completed, ps.date",
        {"uid": user_id, "today": today})
    return [{"id": r[0], "task_id": r[1], "duration": r[2], "completed": r[3], "date": r[4]} for r in rows]


# --- Reflection ---

def add_journal_entry(user_id: str, text: str, mood: int = 5, energy: int = 5, tags: str = "") -> str:
    conn = get_connection()
    eid = str(uuid.uuid4())
    conn.execute(
        "CREATE (:JournalEntry {id: $id, date: $date, text: $text, mood: $mood, energy: $energy, tags: $tags})",
        {"id": eid, "date": _now(), "text": text, "mood": mood, "energy": energy, "tags": tags},
    )
    conn.execute(
        "MATCH (u:User {id: $uid}), (j:JournalEntry {id: $eid}) CREATE (u)-[:WROTE]->(j)",
        {"uid": user_id, "eid": eid},
    )
    return eid


def get_journal_entries(user_id: str, limit: int = 10) -> list[dict]:
    conn = get_connection()
    rows = _query_all(conn,
        f"MATCH (u:User {{id: $uid}})-[:WROTE]->(j:JournalEntry) "
        f"RETURN j.id, j.date, j.text, j.mood, j.energy, j.tags "
        f"ORDER BY j.date DESC LIMIT {limit}",
        {"uid": user_id})
    return [{"id": r[0], "date": r[1], "text": r[2], "mood": r[3], "energy": r[4], "tags": r[5]} for r in rows]


def add_gratitude_entry(user_id: str, item1: str, item2: str = "", item3: str = "") -> str:
    conn = get_connection()
    gid = str(uuid.uuid4())
    conn.execute(
        "CREATE (:GratitudeEntry {id: $id, date: $date, item1: $i1, item2: $i2, item3: $i3})",
        {"id": gid, "date": _now(), "i1": item1, "i2": item2, "i3": item3},
    )
    conn.execute(
        "MATCH (u:User {id: $uid}), (g:GratitudeEntry {id: $gid}) CREATE (u)-[:GRATEFUL]->(g)",
        {"uid": user_id, "gid": gid},
    )
    return gid


def get_gratitude_entries(user_id: str, limit: int = 7) -> list[dict]:
    conn = get_connection()
    rows = _query_all(conn,
        f"MATCH (u:User {{id: $uid}})-[:GRATEFUL]->(g:GratitudeEntry) "
        f"RETURN g.id, g.date, g.item1, g.item2, g.item3 "
        f"ORDER BY g.date DESC LIMIT {limit}",
        {"uid": user_id})
    return [{"id": r[0], "date": r[1], "item1": r[2], "item2": r[3], "item3": r[4]} for r in rows]


def add_weekly_review(
    user_id: str, week: str, wins: str, challenges: str, focus: str, ai_summary: str = ""
) -> str:
    conn = get_connection()
    rid = str(uuid.uuid4())
    conn.execute(
        "CREATE (:WeeklyReview {id: $id, week: $week, wins: $wins, challenges: $ch, focus: $focus, ai_summary: $ai, created_at: $ts})",
        {"id": rid, "week": week, "wins": wins, "ch": challenges, "focus": focus, "ai": ai_summary, "ts": _now()},
    )
    conn.execute(
        "MATCH (u:User {id: $uid}), (r:WeeklyReview {id: $rid}) CREATE (u)-[:REVIEWED]->(r)",
        {"uid": user_id, "rid": rid},
    )
    return rid


def get_weekly_reviews(user_id: str, limit: int = 5) -> list[dict]:
    conn = get_connection()
    rows = _query_all(conn,
        f"MATCH (u:User {{id: $uid}})-[:REVIEWED]->(r:WeeklyReview) "
        f"RETURN r.id, r.week, r.wins, r.challenges, r.focus, r.ai_summary, r.created_at "
        f"ORDER BY r.created_at DESC LIMIT {limit}",
        {"uid": user_id})
    return [{"id": r[0], "week": r[1], "wins": r[2], "challenges": r[3],
             "focus": r[4], "ai_summary": r[5], "created_at": r[6]} for r in rows]


# --- Relationships ---

def add_contact(
    user_id: str, name: str, relationship_type: str = "friend",
    birthday: str = "", notes: str = "", tags: str = "",
) -> str:
    conn = get_connection()
    cid = str(uuid.uuid4())
    conn.execute(
        "CREATE (:Contact {id: $id, name: $name, relationship_type: $rtype, "
        "birthday: $bday, notes: $notes, tags: $tags, created_at: $ts})",
        {"id": cid, "name": name, "rtype": relationship_type,
         "bday": birthday, "notes": notes, "tags": tags, "ts": _now()},
    )
    conn.execute(
        "MATCH (u:User {id: $uid}), (c:Contact {id: $cid}) CREATE (u)-[:KNOWS]->(c)",
        {"uid": user_id, "cid": cid},
    )
    return cid


def get_contacts(user_id: str) -> list[dict]:
    conn = get_connection()
    rows = _query_all(conn,
        "MATCH (u:User {id: $uid})-[:KNOWS]->(c:Contact) "
        "RETURN c.id, c.name, c.relationship_type, c.birthday, c.notes, c.tags, c.created_at "
        "ORDER BY c.name ASC",
        {"uid": user_id})
    return [{"id": r[0], "name": r[1], "relationship_type": r[2],
             "birthday": r[3], "notes": r[4], "tags": r[5], "created_at": r[6]} for r in rows]


def delete_contact(contact_id: str) -> None:
    conn = get_connection()
    conn.execute("MATCH (c:Contact {id: $id}) DETACH DELETE c", {"id": contact_id})


# --- Career ---

def add_career_skill(user_id: str, name: str, level: int = 5, category: str = "general") -> str:
    conn = get_connection()
    from datetime import date
    sid = str(uuid.uuid4())
    conn.execute(
        "CREATE (:CareerSkill {id: $id, name: $name, level: $level, category: $cat, last_used: $lu})",
        {"id": sid, "name": name, "level": level, "cat": category, "lu": date.today().isoformat()},
    )
    conn.execute(
        "MATCH (u:User {id: $uid}), (s:CareerSkill {id: $sid}) CREATE (u)-[:HAS_CAREER_SKILL]->(s)",
        {"uid": user_id, "sid": sid},
    )
    return sid


def get_career_skills(user_id: str) -> list[dict]:
    conn = get_connection()
    rows = _query_all(conn,
        "MATCH (u:User {id: $uid})-[:HAS_CAREER_SKILL]->(s:CareerSkill) "
        "RETURN s.id, s.name, s.level, s.category, s.last_used "
        "ORDER BY s.level DESC, s.name ASC",
        {"uid": user_id})
    return [{"id": r[0], "name": r[1], "level": r[2], "category": r[3], "last_used": r[4]} for r in rows]


def update_career_skill_level(skill_id: str, level: int) -> None:
    conn = get_connection()
    from datetime import date
    conn.execute(
        "MATCH (s:CareerSkill {id: $id}) SET s.level = $level, s.last_used = $lu",
        {"id": skill_id, "level": level, "lu": date.today().isoformat()},
    )


def add_achievement(
    user_id: str, title: str, description: str = "", impact: str = "", skills_used: str = ""
) -> str:
    conn = get_connection()
    from datetime import date
    aid = str(uuid.uuid4())
    conn.execute(
        "CREATE (:Achievement {id: $id, title: $title, description: $desc, "
        "date: $date, impact: $impact, skills_used: $skills})",
        {"id": aid, "title": title, "desc": description,
         "date": date.today().isoformat(), "impact": impact, "skills": skills_used},
    )
    conn.execute(
        "MATCH (u:User {id: $uid}), (a:Achievement {id: $aid}) CREATE (u)-[:HAS_ACHIEVEMENT]->(a)",
        {"uid": user_id, "aid": aid},
    )
    return aid


def get_achievements(user_id: str, limit: int = 20) -> list[dict]:
    conn = get_connection()
    rows = _query_all(conn,
        f"MATCH (u:User {{id: $uid}})-[:HAS_ACHIEVEMENT]->(a:Achievement) "
        f"RETURN a.id, a.title, a.description, a.date, a.impact, a.skills_used "
        f"ORDER BY a.date DESC LIMIT {limit}",
        {"uid": user_id})
    return [{"id": r[0], "title": r[1], "description": r[2],
             "date": r[3], "impact": r[4], "skills_used": r[5]} for r in rows]


# --- Subscriptions ---

def add_subscription(
    user_id: str, name: str, amount: float, currency: str = "UAH",
    billing_cycle: str = "monthly", category: str = "entertainment",
    next_billing: str = "",
) -> str:
    conn = get_connection()
    sid = str(uuid.uuid4())
    conn.execute(
        "CREATE (:Subscription {id: $id, name: $name, amount: $amount, currency: $cur, "
        "billing_cycle: $cycle, category: $cat, next_billing: $nb, is_active: true})",
        {"id": sid, "name": name, "amount": amount, "cur": currency,
         "cycle": billing_cycle, "cat": category, "nb": next_billing},
    )
    conn.execute(
        "MATCH (u:User {id: $uid}), (s:Subscription {id: $sid}) CREATE (u)-[:HAS_SUBSCRIPTION]->(s)",
        {"uid": user_id, "sid": sid},
    )
    return sid


def get_subscriptions(user_id: str, active_only: bool = True) -> list[dict]:
    conn = get_connection()
    where = "WHERE s.is_active = true" if active_only else ""
    rows = _query_all(conn,
        f"MATCH (u:User {{id: $uid}})-[:HAS_SUBSCRIPTION]->(s:Subscription) {where} "
        f"RETURN s.id, s.name, s.amount, s.currency, s.billing_cycle, s.category, s.next_billing, s.is_active "
        f"ORDER BY s.amount DESC",
        {"uid": user_id})
    return [{"id": r[0], "name": r[1], "amount": r[2], "currency": r[3],
             "billing_cycle": r[4], "category": r[5], "next_billing": r[6], "is_active": r[7]}
            for r in rows]


def deactivate_subscription(sub_id: str) -> None:
    conn = get_connection()
    conn.execute("MATCH (s:Subscription {id: $id}) SET s.is_active = false", {"id": sub_id})


# --- Goals ---

def add_life_goal(
    user_id: str, title: str, description: str = "",
    category: str = "personal", target_date: str = ""
) -> str:
    conn = get_connection()
    gid = str(uuid.uuid4())
    conn.execute(
        "CREATE (:LifeGoal {id: $id, title: $title, description: $desc, "
        "category: $cat, status: $status, target_date: $td, created_at: $ts})",
        {"id": gid, "title": title, "desc": description, "cat": category,
         "status": "active", "td": target_date, "ts": _now()},
    )
    conn.execute(
        "MATCH (u:User {id: $uid}), (g:LifeGoal {id: $gid}) CREATE (u)-[:HAS_LIFE_GOAL]->(g)",
        {"uid": user_id, "gid": gid},
    )
    return gid


def get_life_goals(user_id: str) -> list[dict]:
    conn = get_connection()
    rows = _query_all(conn,
        "MATCH (u:User {id: $uid})-[:HAS_LIFE_GOAL]->(g:LifeGoal) "
        "RETURN g.id, g.title, g.description, g.category, g.status, g.target_date, g.created_at "
        "ORDER BY g.created_at DESC",
        {"uid": user_id})
    return [{"id": r[0], "title": r[1], "description": r[2],
             "category": r[3], "status": r[4], "target_date": r[5], "created_at": r[6]} for r in rows]


def update_life_goal_status(goal_id: str, status: str) -> None:
    conn = get_connection()
    conn.execute("MATCH (g:LifeGoal {id: $id}) SET g.status = $status", {"id": goal_id, "status": status})


def add_bucket_item(
    user_id: str, title: str, category: str = "adventure", notes: str = ""
) -> str:
    conn = get_connection()
    bid = str(uuid.uuid4())
    conn.execute(
        "CREATE (:BucketItem {id: $id, title: $title, category: $cat, "
        "status: $status, completed_date: $cd, notes: $notes, created_at: $ts})",
        {"id": bid, "title": title, "cat": category,
         "status": "pending", "cd": "", "notes": notes, "ts": _now()},
    )
    conn.execute(
        "MATCH (u:User {id: $uid}), (b:BucketItem {id: $bid}) CREATE (u)-[:HAS_BUCKET_ITEM]->(b)",
        {"uid": user_id, "bid": bid},
    )
    return bid


def get_bucket_items(user_id: str) -> list[dict]:
    conn = get_connection()
    rows = _query_all(conn,
        "MATCH (u:User {id: $uid})-[:HAS_BUCKET_ITEM]->(b:BucketItem) "
        "RETURN b.id, b.title, b.category, b.status, b.completed_date, b.notes, b.created_at "
        "ORDER BY b.created_at DESC",
        {"uid": user_id})
    return [{"id": r[0], "title": r[1], "category": r[2],
             "status": r[3], "completed_date": r[4], "notes": r[5], "created_at": r[6]} for r in rows]


def complete_bucket_item(item_id: str) -> None:
    conn = get_connection()
    from datetime import date
    conn.execute(
        "MATCH (b:BucketItem {id: $id}) SET b.status = $status, b.completed_date = $cd",
        {"id": item_id, "status": "done", "cd": date.today().isoformat()},
    )
