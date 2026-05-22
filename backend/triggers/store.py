"""
Pending message queue with per-user daily cap.
In-memory for dev; swap with Redis/SQLite for production.
"""
from collections import defaultdict, deque
from datetime import date
from typing import Optional

MAX_PER_DAY = 2

# {user_id: deque of {text, trigger_type, ts}}
_pending: dict[str, deque] = defaultdict(deque)

# {user_id: {date_str: sent_count}}
_daily_counts: dict[str, dict[str, int]] = defaultdict(dict)


def can_send(user_id: str) -> bool:
    today = date.today().isoformat()
    return _daily_counts[user_id].get(today, 0) < MAX_PER_DAY


def enqueue(user_id: str, text: str, trigger_type: str) -> bool:
    """Queue a proactive message. Returns False if daily cap reached."""
    if not can_send(user_id):
        return False
    today = date.today().isoformat()
    _daily_counts[user_id][today] = _daily_counts[user_id].get(today, 0) + 1
    _pending[user_id].append({"text": text, "trigger_type": trigger_type})
    return True


def pop_pending(user_id: str) -> list[dict]:
    """Drain all pending messages for a user."""
    msgs = list(_pending[user_id])
    _pending[user_id].clear()
    return msgs


def pending_count(user_id: str) -> int:
    return len(_pending[user_id])
