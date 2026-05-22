"""
SM-2 spaced repetition algorithm (SuperMemo 2).
Quality scale: 0-5
  5 = perfect recall
  4 = correct with slight hesitation
  3 = correct with difficulty
  2 = incorrect but remembered on seeing answer
  1 = incorrect, easy answer
  0 = complete blackout
"""
from datetime import date, timedelta


def sm2_next(
    ease_factor: float,
    interval: int,
    repetitions: int,
    quality: int,
) -> tuple[float, int, int]:
    """
    Returns (new_ease_factor, new_interval_days, new_repetitions).
    Call this after each review session.
    """
    quality = max(0, min(5, quality))

    if quality >= 3:
        if repetitions == 0:
            new_interval = 1
        elif repetitions == 1:
            new_interval = 6
        else:
            new_interval = round(interval * ease_factor)
        new_ef = ease_factor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
        new_ef = max(1.3, new_ef)
        new_reps = repetitions + 1
    else:
        # Failed recall — reset
        new_interval = 1
        new_ef = ease_factor  # EF only decreases on quality < 3 via the formula above
        new_reps = 0

    return round(new_ef, 2), new_interval, new_reps


def next_review_date(interval_days: int) -> str:
    """Returns ISO date string for the next review."""
    return (date.today() + timedelta(days=interval_days)).isoformat()


def days_until_review(next_review_date_str: str) -> int:
    """Negative = overdue, 0 = today, positive = future."""
    try:
        target = date.fromisoformat(next_review_date_str)
        return (target - date.today()).days
    except (ValueError, TypeError):
        return 0


def infer_quality(text: str, duration_min: int) -> int:
    """
    Infer SM-2 quality (0-5) from session text and duration.
    Used when user doesn't explicitly rate recall.
    """
    text_lower = text.lower()

    struggle_kw = ["важко", "не розумію", "не зрозумів", "плутаю", "забув",
                   "hard", "difficult", "confused", "forgot", "struggling"]
    review_kw = ["повторив", "повторила", "reviewed", "repeated", "revision"]
    easy_kw = ["легко", "зрозумів", "розібрався", "easy", "got it", "clear"]

    if any(k in text_lower for k in struggle_kw):
        return 2
    if any(k in text_lower for k in easy_kw):
        return 4
    if any(k in text_lower for k in review_kw):
        return 4

    # Duration heuristic: longer session = more engaged = better recall
    if duration_min >= 45:
        return 4
    if duration_min >= 20:
        return 3
    return 3  # default neutral
