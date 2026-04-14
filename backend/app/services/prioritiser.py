"""
Priority scorer — rule-based, zero LLM tokens (PRD §6.3).
Scores tasks/planner items for today/week/month/year panels.
"""
from __future__ import annotations
from datetime import datetime, date, timezone, timedelta
from typing import Any

# Priority label → numeric score
PRIORITY_SCORES = {"critical": 40, "high": 25, "medium": 10, "low": 3}

# Domain weights (fallback if no personalisation row)
DEFAULT_DOMAIN_WEIGHTS = {
    "health": 5, "finance": 5, "family": 5, "social": 5, "career": 5,
    "growth": 5, "property": 5, "holiday": 5, "community": 5, "education": 5,
}


def priority_score(item: dict[str, Any], weights: dict[str, int] | None = None) -> float:
    """
    Rule-based score for a single task/planner item.
    Higher = more important.
    Factors: priority label, due date urgency, domain weight, goal linkage, non-movable.
    """
    score = 0.0
    domain_weights = weights or DEFAULT_DOMAIN_WEIGHTS

    # Priority label
    score += PRIORITY_SCORES.get(item.get("priority", "medium"), 10)

    # Non-movable event (fixed appointment) → always near top
    if item.get("is_non_movable"):
        score += 50

    # Due date urgency
    due = item.get("due_date") or item.get("start_at")
    if due:
        try:
            if isinstance(due, str):
                due_dt = datetime.fromisoformat(due.replace("Z", "+00:00")).date()
            elif isinstance(due, datetime):
                due_dt = due.date()
            elif isinstance(due, date):
                due_dt = due
            else:
                due_dt = None

            if due_dt:
                today = datetime.now(timezone.utc).date()
                days_until = (due_dt - today).days
                if days_until < 0:
                    score += 60   # overdue
                elif days_until == 0:
                    score += 40   # due today
                elif days_until <= 2:
                    score += 25   # due in 2 days
                elif days_until <= 7:
                    score += 15   # this week
        except (ValueError, TypeError):
            pass

    # Domain weight (1-10 scale, normalised to 0-15 pts)
    domain = item.get("domain", "")
    w = domain_weights.get(domain, 5)
    score += (w / 10) * 15

    # Goal linkage bonus
    if item.get("goal_id"):
        score += 10

    return score


def _filter_by_window(items: list[dict], start: date, end: date) -> list[dict]:
    result = []
    for item in items:
        due = item.get("due_date") or item.get("start_at")
        if not due:
            continue
        try:
            if isinstance(due, str):
                due_dt = datetime.fromisoformat(due.replace("Z", "+00:00")).date()
            elif isinstance(due, datetime):
                due_dt = due.date()
            elif isinstance(due, date):
                due_dt = due
            else:
                continue
            if start <= due_dt <= end:
                result.append(item)
        except (ValueError, TypeError):
            continue
    return result


def today_items(all_items: list[dict], weights: dict[str, int] | None = None, budget: int = 7) -> list[dict]:
    """Top items for today's panel — includes overdue."""
    today = datetime.now(timezone.utc).date()
    candidates = _filter_by_window(all_items, today - timedelta(days=30), today)
    scored = sorted(candidates, key=lambda i: priority_score(i, weights), reverse=True)
    return scored[:budget]


def week_items(all_items: list[dict], weights: dict[str, int] | None = None) -> list[dict]:
    """Items due this week."""
    today = datetime.now(timezone.utc).date()
    week_end = today + timedelta(days=7)
    candidates = _filter_by_window(all_items, today, week_end)
    return sorted(candidates, key=lambda i: priority_score(i, weights), reverse=True)


def month_items(all_items: list[dict], weights: dict[str, int] | None = None) -> list[dict]:
    """Items due this month."""
    today = datetime.now(timezone.utc).date()
    month_end = today + timedelta(days=30)
    candidates = _filter_by_window(all_items, today, month_end)
    return sorted(candidates, key=lambda i: priority_score(i, weights), reverse=True)


def year_items(all_items: list[dict], weights: dict[str, int] | None = None) -> list[dict]:
    """Items due this year."""
    today = datetime.now(timezone.utc).date()
    year_end = today + timedelta(days=365)
    candidates = _filter_by_window(all_items, today, year_end)
    return sorted(candidates, key=lambda i: priority_score(i, weights), reverse=True)
