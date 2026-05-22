"""
Trigger Engine — APScheduler-based proactive messaging.
Three job types:
  - morning_checkin: daily at 09:00
  - weekly_report:   Sundays at 10:00
  - pattern_scan:    every 15 minutes (learning gap, mood streak, spending anomaly)
"""
import logging
from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from graph.queries import get_all_users
from triggers.store import enqueue
from triggers import rules

logger = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None

# WebSocket registry — filled by chat.py
# Maps user_id → active WebSocket (or None)
_active_connections: dict = {}


def register_connection(user_id: str, ws) -> None:
    _active_connections[user_id] = ws


def unregister_connection(user_id: str) -> None:
    _active_connections.pop(user_id, None)


async def _push_or_queue(user_id: str, text: str, trigger_type: str) -> None:
    """Send immediately if user is connected, otherwise queue for next connect."""
    queued = enqueue(user_id, text, trigger_type)
    if not queued:
        return  # daily cap reached

    ws = _active_connections.get(user_id)
    if ws:
        try:
            await ws.send_json({"text": text, "trigger_type": trigger_type})
            # Already delivered — remove from pending queue
            from triggers.store import pop_pending
            pop_pending(user_id)
        except Exception:
            pass  # WS closed; message stays in queue


async def _job_morning_checkin() -> None:
    users = get_all_users()
    for user in users:
        uid = user["id"]
        msg = await rules.rule_morning_checkin(uid)
        if msg:
            await _push_or_queue(uid, msg, "morning_checkin")
            logger.info("morning_checkin triggered for %s", uid)


async def _job_weekly_report() -> None:
    users = get_all_users()
    for user in users:
        uid = user["id"]
        msg = await rules.rule_weekly_report(uid)
        if msg:
            await _push_or_queue(uid, msg, "weekly_report")
            logger.info("weekly_report triggered for %s", uid)


async def _job_pattern_scan() -> None:
    users = get_all_users()
    for user in users:
        uid = user["id"]
        triggered = await rules.evaluate_all(uid)
        for trigger_type, msg in triggered:
            await _push_or_queue(uid, msg, trigger_type)
            logger.info("pattern trigger '%s' for %s", trigger_type, uid)


def start() -> None:
    global _scheduler
    _scheduler = AsyncIOScheduler(timezone="Europe/Kyiv")

    # Morning check-in nudge — daily 09:00 Kyiv time
    _scheduler.add_job(
        _job_morning_checkin,
        CronTrigger(hour=9, minute=0),
        id="morning_checkin",
        replace_existing=True,
    )

    # Weekly summary — Sundays 10:00
    _scheduler.add_job(
        _job_weekly_report,
        CronTrigger(day_of_week="sun", hour=10, minute=0),
        id="weekly_report",
        replace_existing=True,
    )

    # Pattern scan — every 15 minutes
    _scheduler.add_job(
        _job_pattern_scan,
        CronTrigger(minute="*/15"),
        id="pattern_scan",
        replace_existing=True,
    )

    _scheduler.start()
    logger.info("Trigger Engine started (3 jobs scheduled)")


def stop() -> None:
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("Trigger Engine stopped")
