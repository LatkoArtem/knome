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
    conn.execute("CREATE REL TABLE IF NOT EXISTS HAS_BUDGET (FROM User TO Budget)")
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

    # --- Workout nodes ---
    conn.execute("""
        CREATE NODE TABLE IF NOT EXISTS WorkoutProgram (
            id STRING,
            name STRING,
            goal STRING,
            days_per_week INT64,
            equipment STRING,
            level STRING,
            duration_min INT64,
            created_at STRING,
            is_active BOOLEAN,
            PRIMARY KEY (id)
        )
    """)

    conn.execute("""
        CREATE NODE TABLE IF NOT EXISTS WorkoutDay (
            id STRING,
            program_id STRING,
            day_number INT64,
            name STRING,
            muscle_groups STRING,
            exercises STRING,
            PRIMARY KEY (id)
        )
    """)

    conn.execute("""
        CREATE NODE TABLE IF NOT EXISTS WorkoutSession (
            id STRING,
            date STRING,
            program_id STRING,
            duration INT64,
            notes STRING,
            rating INT64,
            PRIMARY KEY (id)
        )
    """)

    conn.execute("""
        CREATE NODE TABLE IF NOT EXISTS ExerciseLog (
            id STRING,
            session_id STRING,
            exercise_name STRING,
            sets INT64,
            reps STRING,
            weight STRING,
            rpe DOUBLE,
            PRIMARY KEY (id)
        )
    """)

    # --- Productivity nodes ---
    conn.execute("""
        CREATE NODE TABLE IF NOT EXISTS Task (
            id STRING,
            title STRING,
            priority INT64,
            status STRING,
            due_date STRING,
            project STRING,
            domain STRING,
            created_at STRING,
            PRIMARY KEY (id)
        )
    """)

    conn.execute("""
        CREATE NODE TABLE IF NOT EXISTS Project (
            id STRING,
            name STRING,
            description STRING,
            status STRING,
            deadline STRING,
            created_at STRING,
            PRIMARY KEY (id)
        )
    """)

    conn.execute("""
        CREATE NODE TABLE IF NOT EXISTS PomodoroSession (
            id STRING,
            date STRING,
            task_id STRING,
            duration INT64,
            completed BOOLEAN,
            PRIMARY KEY (id)
        )
    """)

    # Workout edges
    conn.execute("CREATE REL TABLE IF NOT EXISTS HAS_PROGRAM (FROM User TO WorkoutProgram)")
    conn.execute("CREATE REL TABLE IF NOT EXISTS HAS_DAY (FROM WorkoutProgram TO WorkoutDay)")
    conn.execute("CREATE REL TABLE IF NOT EXISTS DID_SESSION (FROM User TO WorkoutSession)")
    conn.execute("CREATE REL TABLE IF NOT EXISTS LOGGED_EXERCISE (FROM WorkoutSession TO ExerciseLog)")

    # Productivity edges
    conn.execute("CREATE REL TABLE IF NOT EXISTS HAS_TASK (FROM User TO Task)")
    conn.execute("CREATE REL TABLE IF NOT EXISTS HAS_PROJECT (FROM User TO Project)")
    conn.execute("CREATE REL TABLE IF NOT EXISTS TASK_IN_PROJECT (FROM Task TO Project)")
    conn.execute("CREATE REL TABLE IF NOT EXISTS DID_POMODORO (FROM User TO PomodoroSession)")

    # --- Reflection nodes ---
    conn.execute("""
        CREATE NODE TABLE IF NOT EXISTS JournalEntry (
            id STRING,
            date STRING,
            text STRING,
            mood INT64,
            energy INT64,
            tags STRING,
            PRIMARY KEY (id)
        )
    """)

    conn.execute("""
        CREATE NODE TABLE IF NOT EXISTS GratitudeEntry (
            id STRING,
            date STRING,
            item1 STRING,
            item2 STRING,
            item3 STRING,
            PRIMARY KEY (id)
        )
    """)

    conn.execute("""
        CREATE NODE TABLE IF NOT EXISTS WeeklyReview (
            id STRING,
            week STRING,
            wins STRING,
            challenges STRING,
            focus STRING,
            ai_summary STRING,
            created_at STRING,
            PRIMARY KEY (id)
        )
    """)

    # --- Relationships nodes ---
    conn.execute("""
        CREATE NODE TABLE IF NOT EXISTS Contact (
            id STRING,
            name STRING,
            relationship_type STRING,
            birthday STRING,
            notes STRING,
            tags STRING,
            created_at STRING,
            PRIMARY KEY (id)
        )
    """)

    # --- Career nodes ---
    conn.execute("""
        CREATE NODE TABLE IF NOT EXISTS CareerSkill (
            id STRING,
            name STRING,
            level INT64,
            category STRING,
            last_used STRING,
            PRIMARY KEY (id)
        )
    """)

    conn.execute("""
        CREATE NODE TABLE IF NOT EXISTS Achievement (
            id STRING,
            title STRING,
            description STRING,
            date STRING,
            impact STRING,
            skills_used STRING,
            PRIMARY KEY (id)
        )
    """)

    # --- Finance subscriptions ---
    conn.execute("""
        CREATE NODE TABLE IF NOT EXISTS Subscription (
            id STRING,
            name STRING,
            amount DOUBLE,
            currency STRING,
            billing_cycle STRING,
            category STRING,
            next_billing STRING,
            is_active BOOLEAN,
            PRIMARY KEY (id)
        )
    """)

    # Reflection edges
    conn.execute("CREATE REL TABLE IF NOT EXISTS WROTE (FROM User TO JournalEntry)")
    conn.execute("CREATE REL TABLE IF NOT EXISTS GRATEFUL (FROM User TO GratitudeEntry)")
    conn.execute("CREATE REL TABLE IF NOT EXISTS REVIEWED (FROM User TO WeeklyReview)")

    conn.execute("""
        CREATE NODE TABLE IF NOT EXISTS Interaction (
            id STRING,
            contact_id STRING,
            date STRING,
            note STRING,
            interaction_type STRING,
            PRIMARY KEY (id)
        )
    """)

    # Relationships edges
    conn.execute("CREATE REL TABLE IF NOT EXISTS KNOWS (FROM User TO Contact)")
    conn.execute("CREATE REL TABLE IF NOT EXISTS HAD_INTERACTION (FROM User TO Interaction)")

    # Career edges
    conn.execute("CREATE REL TABLE IF NOT EXISTS HAS_CAREER_SKILL (FROM User TO CareerSkill)")
    conn.execute("CREATE REL TABLE IF NOT EXISTS HAS_ACHIEVEMENT (FROM User TO Achievement)")

    # Finance expansion edges
    conn.execute("CREATE REL TABLE IF NOT EXISTS HAS_SUBSCRIPTION (FROM User TO Subscription)")

    # --- Goals nodes ---
    conn.execute("""
        CREATE NODE TABLE IF NOT EXISTS LifeGoal (
            id STRING,
            title STRING,
            description STRING,
            category STRING,
            status STRING,
            target_date STRING,
            created_at STRING,
            PRIMARY KEY (id)
        )
    """)

    conn.execute("""
        CREATE NODE TABLE IF NOT EXISTS BucketItem (
            id STRING,
            title STRING,
            category STRING,
            status STRING,
            completed_date STRING,
            notes STRING,
            created_at STRING,
            PRIMARY KEY (id)
        )
    """)

    # Goals edges
    conn.execute("CREATE REL TABLE IF NOT EXISTS HAS_LIFE_GOAL (FROM User TO LifeGoal)")
    conn.execute("CREATE REL TABLE IF NOT EXISTS HAS_BUCKET_ITEM (FROM User TO BucketItem)")

    # --- Net Worth nodes ---
    conn.execute("""
        CREATE NODE TABLE IF NOT EXISTS Asset (
            id STRING,
            name STRING,
            category STRING,
            value DOUBLE,
            currency STRING,
            notes STRING,
            updated_at STRING,
            PRIMARY KEY (id)
        )
    """)

    conn.execute("""
        CREATE NODE TABLE IF NOT EXISTS Debt (
            id STRING,
            name STRING,
            category STRING,
            amount DOUBLE,
            currency STRING,
            interest_rate DOUBLE,
            due_date STRING,
            is_paid BOOLEAN,
            created_at STRING,
            PRIMARY KEY (id)
        )
    """)

    # Net Worth edges
    conn.execute("CREATE REL TABLE IF NOT EXISTS HAS_ASSET (FROM User TO Asset)")
    conn.execute("CREATE REL TABLE IF NOT EXISTS HAS_DEBT (FROM User TO Debt)")

    # --- Home domain nodes ---
    conn.execute("""
        CREATE NODE TABLE IF NOT EXISTS HomeTask (
            id STRING,
            name STRING,
            category STRING,
            frequency STRING,
            last_done STRING,
            next_due STRING,
            created_at STRING,
            PRIMARY KEY (id)
        )
    """)

    conn.execute("""
        CREATE NODE TABLE IF NOT EXISTS ShoppingItem (
            id STRING,
            name STRING,
            category STRING,
            quantity STRING,
            regular BOOLEAN,
            is_bought BOOLEAN,
            created_at STRING,
            PRIMARY KEY (id)
        )
    """)

    conn.execute("""
        CREATE NODE TABLE IF NOT EXISTS MealPlan (
            id STRING,
            week_start STRING,
            monday STRING,
            tuesday STRING,
            wednesday STRING,
            thursday STRING,
            friday STRING,
            saturday STRING,
            sunday STRING,
            prep_notes STRING,
            created_at STRING,
            PRIMARY KEY (id)
        )
    """)

    # Home domain edges
    conn.execute("CREATE REL TABLE IF NOT EXISTS HAS_HOME_TASK (FROM User TO HomeTask)")
    conn.execute("CREATE REL TABLE IF NOT EXISTS HAS_SHOPPING_ITEM (FROM User TO ShoppingItem)")
    conn.execute("CREATE REL TABLE IF NOT EXISTS HAS_MEAL_PLAN (FROM User TO MealPlan)")

    # --- Career: Job Applications ---
    conn.execute("""
        CREATE NODE TABLE IF NOT EXISTS JobApplication (
            id STRING,
            company STRING,
            position STRING,
            salary STRING,
            status STRING,
            applied_date STRING,
            notes STRING,
            PRIMARY KEY (id)
        )
    """)
    conn.execute("CREATE REL TABLE IF NOT EXISTS APPLIED_TO (FROM User TO JobApplication)")

    # --- Trips ---
    conn.execute("""
        CREATE NODE TABLE IF NOT EXISTS Trip (
            id STRING,
            destination STRING,
            date_start STRING,
            date_end STRING,
            status STRING,
            budget DOUBLE,
            currency STRING,
            notes STRING,
            created_at STRING,
            PRIMARY KEY (id)
        )
    """)
    conn.execute("CREATE REL TABLE IF NOT EXISTS HAS_TRIP (FROM User TO Trip)")
