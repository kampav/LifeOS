from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Any
import uuid

DEFAULT_MAX_NUDGES = 3


def _safe_rows(sb, table: str, user_id: str, limit: int = 100) -> list[dict[str, Any]]:
    try:
        return sb.table(table).select("*").eq("user_id", user_id).limit(limit).execute().data or []
    except Exception:
        return []


def _safe_insert_notification(sb, user_id: str, title: str, body: str, metadata: dict[str, Any] | None = None) -> dict:
    row = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": "nudge",
        "title": title,
        "body": body,
        "action_url": (metadata or {}).get("action_url"),
        "read": False,
        "metadata": metadata or {},
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = sb.table("notifications").insert(row).execute()
    return result.data[0] if result.data else row


def _domain_config(prefs: dict[str, Any]) -> dict[str, Any]:
    config = prefs.get("domain_config")
    return config if isinstance(config, dict) else {}


def _nudge_preferences(prefs: dict[str, Any]) -> dict[str, Any]:
    nudge_prefs = prefs.get("nudge_preferences")
    return nudge_prefs if isinstance(nudge_prefs, dict) else {"enabled": True, "max_per_day": DEFAULT_MAX_NUDGES}


def build_nudge_candidates(user_id: str, sb, prefs: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    prefs = prefs or {}
    domain_config = _domain_config(prefs)
    weights = prefs.get("domain_weights") or {}

    tasks = _safe_rows(sb, "tasks", user_id, 200)
    life_items = _safe_rows(sb, "life_items", user_id, 100)
    planner = _safe_rows(sb, "planner_items", user_id, 100)
    entries = _safe_rows(sb, "entries", user_id, 250)

    today = datetime.now(timezone.utc).date()
    candidates: list[dict[str, Any]] = []

    overdue = [
        t for t in tasks
        if t.get("status") not in ("done", "archived")
        and t.get("due_date")
        and str(t.get("due_date"))[:10] < today.isoformat()
    ]
    if overdue:
        task = sorted(overdue, key=lambda t: (t.get("priority") != "critical", str(t.get("due_date"))))[0]
        candidates.append({
            "title": "One overdue item needs attention",
            "body": task.get("title", "Review your overdue task"),
            "domain": task.get("domain"),
            "reason": "overdue_task",
            "priority": 90,
            "action_url": "/kanban",
        })

    inbox_open = [i for i in life_items if i.get("status") == "inbox"]
    if inbox_open:
        item = inbox_open[0]
        candidates.append({
            "title": "Clear one Life Inbox item",
            "body": item.get("title", "Decide what should happen with this capture"),
            "domain": item.get("domain"),
            "reason": "life_inbox",
            "priority": 80,
            "action_url": "/",
        })

    tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
    upcoming = [
        p for p in planner
        if p.get("start_at")
        and datetime.now(timezone.utc).isoformat() <= str(p.get("start_at")) <= tomorrow.isoformat()
        and not p.get("completed")
    ]
    if upcoming:
        event = sorted(upcoming, key=lambda p: str(p.get("start_at")))[0]
        candidates.append({
            "title": "Upcoming commitment",
            "body": event.get("title", "Review your next calendar item"),
            "domain": event.get("domain"),
            "reason": "upcoming_calendar",
            "priority": 70,
            "action_url": "/planner",
        })

    domain_counts: dict[str, int] = {}
    for entry in entries:
        domain = entry.get("domain")
        if domain:
            domain_counts[domain] = domain_counts.get(domain, 0) + 1
    for domain, weight in sorted(weights.items(), key=lambda item: item[1], reverse=True):
        enabled = domain_config.get(domain, {}).get("enabled", True)
        if enabled and int(weight or 0) >= 7 and domain_counts.get(domain, 0) == 0:
            label = domain_config.get(domain, {}).get("label") or domain.title()
            candidates.append({
                "title": f"Add one {label} signal",
                "body": domain_config.get(domain, {}).get("nudge") or "A small update keeps this area visible.",
                "domain": domain,
                "reason": "quiet_priority_domain",
                "priority": 50 + int(weight or 0),
                "action_url": f"/{domain}",
            })
            break

    return sorted(candidates, key=lambda c: c["priority"], reverse=True)


def generate_nudges_for_user(user_id: str, sb, prefs: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    prefs = prefs or {}
    nudge_prefs = _nudge_preferences(prefs)
    if nudge_prefs.get("enabled") is False:
        return []

    max_per_day = int(nudge_prefs.get("max_per_day") or DEFAULT_MAX_NUDGES)
    today_prefix = datetime.now(timezone.utc).date().isoformat()
    existing = [
        n for n in _safe_rows(sb, "notifications", user_id, 100)
        if n.get("type") == "nudge" and str(n.get("created_at", "")).startswith(today_prefix)
    ]
    remaining = max(0, max_per_day - len(existing))
    if remaining <= 0:
        return []

    created = []
    for candidate in build_nudge_candidates(user_id, sb, prefs)[:remaining]:
        created.append(_safe_insert_notification(
            sb,
            user_id,
            candidate["title"],
            candidate["body"],
            {
                "domain": candidate.get("domain"),
                "reason": candidate.get("reason"),
                "action_url": candidate.get("action_url"),
            },
        ))
    return created
