import kuzu
import os
from pathlib import Path

DB_PATH = os.getenv("KUZU_DB_PATH", "./data/knome.db")

_db: kuzu.Database | None = None
_conn: kuzu.Connection | None = None


def get_connection() -> kuzu.Connection:
    global _db, _conn
    if _conn is None:
        Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
        _db = kuzu.Database(DB_PATH)
        _conn = kuzu.Connection(_db)
    return _conn


def init_schema() -> None:
    conn = get_connection()

    # Node tables
    conn.execute("""
        CREATE NODE TABLE IF NOT EXISTS User (
            id STRING,
            name STRING,
            age INT64,
            language STRING,
            created_at STRING,
            PRIMARY KEY (id)
        )
    """)

    conn.execute("""
        CREATE NODE TABLE IF NOT EXISTS Goal (
            id STRING,
            domain STRING,
            description STRING,
            deadline STRING,
            status STRING,
            PRIMARY KEY (id)
        )
    """)

    conn.execute("""
        CREATE NODE TABLE IF NOT EXISTS Skill (
            id STRING,
            name STRING,
            domain STRING,
            level DOUBLE,
            PRIMARY KEY (id)
        )
    """)

    conn.execute("""
        CREATE NODE TABLE IF NOT EXISTS Topic (
            id STRING,
            name STRING,
            domain STRING,
            difficulty DOUBLE,
            parent_topic STRING,
            PRIMARY KEY (id)
        )
    """)

    conn.execute("""
        CREATE NODE TABLE IF NOT EXISTS Resource (
            id STRING,
            url STRING,
            type STRING,
            topic_id STRING,
            PRIMARY KEY (id)
        )
    """)

    conn.execute("""
        CREATE NODE TABLE IF NOT EXISTS LearningSession (
            id STRING,
            date STRING,
            topic_id STRING,
            duration INT64,
            result DOUBLE,
            PRIMARY KEY (id)
        )
    """)

    conn.execute("""
        CREATE NODE TABLE IF NOT EXISTS Habit (
            id STRING,
            name STRING,
            frequency STRING,
            streak INT64,
            status STRING,
            PRIMARY KEY (id)
        )
    """)

    conn.execute("""
        CREATE NODE TABLE IF NOT EXISTS CheckIn (
            id STRING,
            date STRING,
            sleep_hours DOUBLE,
            mood INT64,
            energy INT64,
            notes STRING,
            PRIMARY KEY (id)
        )
    """)

    conn.execute("""
        CREATE NODE TABLE IF NOT EXISTS FoodEntry (
            id STRING,
            date STRING,
            name STRING,
            calories DOUBLE,
            protein DOUBLE,
            fat DOUBLE,
            carbs DOUBLE,
            method STRING,
            PRIMARY KEY (id)
        )
    """)

    conn.execute("""
        CREATE NODE TABLE IF NOT EXISTS Transaction (
            id STRING,
            date STRING,
            amount DOUBLE,
            currency STRING,
            category STRING,
            description STRING,
            PRIMARY KEY (id)
        )
    """)

    conn.execute("""
        CREATE NODE TABLE IF NOT EXISTS Budget (
            id STRING,
            category STRING,
            limit_amount DOUBLE,
            period STRING,
            PRIMARY KEY (id)
        )
    """)

    conn.execute("""
        CREATE NODE TABLE IF NOT EXISTS FinancialGoal (
            id STRING,
            name STRING,
            target_amount DOUBLE,
            current_amount DOUBLE,
            deadline STRING,
            PRIMARY KEY (id)
        )
    """)

    conn.execute("""
        CREATE NODE TABLE IF NOT EXISTS Pattern (
            id STRING,
            type STRING,
            description STRING,
            confidence DOUBLE,
            domains STRING,
            PRIMARY KEY (id)
        )
    """)

    conn.execute("""
        CREATE NODE TABLE IF NOT EXISTS Insight (
            id STRING,
            date STRING,
            text STRING,
            domains STRING,
            priority INT64,
            PRIMARY KEY (id)
        )
    """)

    conn.execute("""
        CREATE NODE TABLE IF NOT EXISTS TopicReview (
            id STRING,
            topic_name STRING,
            ease_factor DOUBLE,
            interval_days INT64,
            repetitions INT64,
            next_review_date STRING,
            last_review_date STRING,
            PRIMARY KEY (id)
        )
    """)

    # Edge tables
    conn.execute("CREATE REL TABLE IF NOT EXISTS HAS_GOAL (FROM User TO Goal)")
    conn.execute("CREATE REL TABLE IF NOT EXISTS HAS_REVIEW (FROM User TO TopicReview)")
    conn.execute("CREATE REL TABLE IF NOT EXISTS HAS_SKILL (FROM User TO Skill)")
    conn.execute("CREATE REL TABLE IF NOT EXISTS HAS_HABIT (FROM User TO Habit)")
    conn.execute("CREATE REL TABLE IF NOT EXISTS COMPLETED (FROM User TO LearningSession)")
    conn.execute("CREATE REL TABLE IF NOT EXISTS LOGGED_CHECKIN (FROM User TO CheckIn)")
    conn.execute("CREATE REL TABLE IF NOT EXISTS LOGGED_FOOD (FROM User TO FoodEntry)")
    conn.execute("CREATE REL TABLE IF NOT EXISTS MADE (FROM User TO Transaction)")
    conn.execute("CREATE REL TABLE IF NOT EXISTS REQUIRES (FROM Goal TO Skill)")
    conn.execute("CREATE REL TABLE IF NOT EXISTS MEASURED_BY (FROM Skill TO Topic)")
    conn.execute("CREATE REL TABLE IF NOT EXISTS HAS_RESOURCE (FROM Topic TO Resource)")
    conn.execute("CREATE REL TABLE IF NOT EXISTS COVERED (FROM LearningSession TO Topic)")
    conn.execute("CREATE REL TABLE IF NOT EXISTS CONNECTS_CHECKIN (FROM Pattern TO CheckIn)")
    conn.execute("CREATE REL TABLE IF NOT EXISTS CONNECTS_TRANSACTION (FROM Pattern TO Transaction)")
    conn.execute("CREATE REL TABLE IF NOT EXISTS BASED_ON (FROM Insight TO Pattern)")
