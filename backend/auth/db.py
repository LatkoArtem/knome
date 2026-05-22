"""SQLite-backed auth store — credentials only (user data lives in Kuzu)."""
import sqlite3
import os
from pathlib import Path
from typing import Optional

_DB_PATH = os.getenv("AUTH_DB_PATH", "./data/auth.db")
_conn: sqlite3.Connection | None = None


def _get_conn() -> sqlite3.Connection:
    global _conn
    if _conn is None:
        Path(_DB_PATH).parent.mkdir(parents=True, exist_ok=True)
        _conn = sqlite3.connect(_DB_PATH, check_same_thread=False)
        _conn.row_factory = sqlite3.Row
        _conn.execute("""
            CREATE TABLE IF NOT EXISTS auth_users (
                user_id     TEXT PRIMARY KEY,
                email       TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at  TEXT NOT NULL
            )
        """)
        _conn.commit()
    return _conn


def create_auth_user(user_id: str, email: str, password_hash: str, created_at: str) -> None:
    db = _get_conn()
    db.execute(
        "INSERT INTO auth_users (user_id, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
        (user_id, email.lower().strip(), password_hash, created_at),
    )
    db.commit()


def get_auth_by_email(email: str) -> Optional[dict]:
    db = _get_conn()
    row = db.execute(
        "SELECT user_id, email, password_hash, created_at FROM auth_users WHERE email = ?",
        (email.lower().strip(),),
    ).fetchone()
    return dict(row) if row else None


def get_auth_by_user_id(user_id: str) -> Optional[dict]:
    db = _get_conn()
    row = db.execute(
        "SELECT user_id, email, created_at FROM auth_users WHERE user_id = ?",
        (user_id,),
    ).fetchone()
    return dict(row) if row else None


def email_exists(email: str) -> bool:
    return get_auth_by_email(email) is not None
