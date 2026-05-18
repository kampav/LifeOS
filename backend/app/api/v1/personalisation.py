"""
Personalisation API — user coach style, domain weights, accent colour.
GET/PATCH /users/me/personalisation
POST      /users/me/personalisation/reset
GET       /users/me/personalisation/learning
POST      /users/me/personalisation/undo
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Any
from app.security.auth import get_current_user, User
from app.db.client import get_supabase

router = APIRouter(prefix="/users/me/personalisation", tags=["personalisation"])

DEFAULTS = {
    "coach_tone": 2,
    "detail_level": 3,
    "domain_weights": {
        "health": 5, "finance": 5, "family": 5, "social": 5, "career": 5,
        "growth": 5, "property": 5, "holiday": 5, "community": 5, "education": 5,
    },
    "alert_cadence": "normal",
    "accent_colour": "#6366F1",
    "layout_density": "comfortable",
    "font_size": "medium",
    "domain_config": {},
    "nudge_preferences": {
        "enabled": True,
        "quiet_hours": {"start": "21:30", "end": "07:00"},
        "max_per_day": 3,
        "channels": ["in_app"],
    },
}

DOMAINS = tuple(DEFAULTS["domain_weights"].keys())


class PersonalisationUpdate(BaseModel):
    coach_tone: Optional[int] = Field(None, ge=1, le=5)
    detail_level: Optional[int] = Field(None, ge=1, le=5)
    domain_weights: Optional[dict[str, int]] = None
    alert_cadence: Optional[str] = None
    accent_colour: Optional[str] = None
    layout_density: Optional[str] = None
    font_size: Optional[str] = None
    domain_config: Optional[dict[str, Any]] = None
    nudge_preferences: Optional[dict[str, Any]] = None


class DomainCustomisationUpdate(BaseModel):
    enabled: Optional[bool] = None
    label: Optional[str] = None
    outcome: Optional[str] = None
    widgets: Optional[list[str]] = None
    quick_captures: Optional[list[str]] = None
    nudge: Optional[str] = None


def _get_or_create_prefs(user_id: str, sb) -> dict:
    result = sb.table("user_personalisation").select("*").eq("user_id", user_id).single().execute()
    if result.data:
        return result.data
    # Auto-create with defaults
    row = {"user_id": user_id, **DEFAULTS}
    sb.table("user_personalisation").insert(row).execute()
    return row


def _safe_rows(sb, table_name: str, user_id: str, limit: int = 250) -> list[dict[str, Any]]:
    """Read optional behavioural data without making preferences depend on every table."""
    try:
        result = (
            sb.table(table_name)
            .select("*")
            .eq("user_id", user_id)
            .limit(limit)
            .execute()
        )
        return result.data or []
    except Exception:
        return []


def _domain_counts(rows: list[dict[str, Any]], predicate=None) -> dict[str, int]:
    counts = {domain: 0 for domain in DOMAINS}
    for row in rows:
        domain = row.get("domain")
        if domain not in counts:
            continue
        if predicate and not predicate(row):
            continue
        counts[domain] += 1
    return counts


def _clamp_weight(value: int) -> int:
    return max(1, min(10, value))


def _build_learning_insights(prefs: dict, activity: dict[str, dict[str, Any]]) -> dict[str, Any]:
    weights = prefs.get("domain_weights") or DEFAULTS["domain_weights"]
    sorted_domains = sorted(activity.items(), key=lambda item: item[1]["activity_score"], reverse=True)
    most_domain, most_stats = sorted_domains[0]
    least_domain, least_stats = sorted_domains[-1]
    sample_size = sum(stats["sample_count"] for stats in activity.values())

    suggested_weights: dict[str, int] = {}
    max_score = max((stats["activity_score"] for stats in activity.values()), default=0)
    for domain, stats in activity.items():
        current = int(weights.get(domain, 5))
        if sample_size < 5:
            suggested_weights[domain] = current
            continue
        if stats["activity_score"] == max_score and max_score > 0:
            suggested_weights[domain] = _clamp_weight(current + 1)
        elif stats["activity_score"] == 0 and current > 3:
            suggested_weights[domain] = _clamp_weight(current - 1)
        else:
            suggested_weights[domain] = current

    insights = []
    if sample_size < 5:
        insights.append({
            "type": "data_quality",
            "severity": "info",
            "title": "Not enough behavioural signal yet",
            "message": "Log a few more entries, goals, tasks, or planner items before Life OS tunes your focus automatically.",
            "domain": None,
            "action": "Keep capturing normally",
        })
    else:
        insights.append({
            "type": "engagement",
            "severity": "positive",
            "title": f"{most_domain.title()} is your strongest signal",
            "message": (
                f"Recent activity is concentrated in {most_domain}. "
                "Life OS can give that domain slightly more influence in coaching and life score weighting."
            ),
            "domain": most_domain,
            "action": f"Raise {most_domain} focus by 1",
        })
        if least_stats["activity_score"] == 0:
            insights.append({
                "type": "blind_spot",
                "severity": "warning",
                "title": f"{least_domain.title()} has no recent signal",
                "message": (
                    f"No recent activity was found for {least_domain}. "
                    "This may be fine, but it is worth checking whether the domain should stay highly weighted."
                ),
                "domain": least_domain,
                "action": f"Review {least_domain} priority",
            })

    suggested_tone = prefs.get("coach_tone", 2)
    open_tasks = sum(stats["open_tasks"] for stats in activity.values())
    active_goals = sum(stats["active_goals"] for stats in activity.values())
    if open_tasks >= 8:
        suggested_tone = 3
        insights.append({
            "type": "coach_style",
            "severity": "info",
            "title": "Direct coaching may help execution",
            "message": "You have a meaningful number of open tasks, so a more direct coach tone may reduce noise.",
            "domain": None,
            "action": "Try Direct tone",
        })

    suggested_detail = prefs.get("detail_level", 3)
    if active_goals >= 6:
        suggested_detail = max(suggested_detail, 4)

    confidence = "low" if sample_size < 5 else "medium" if sample_size < 25 else "high"
    return {
        "most_engaged_domain": most_domain,
        "least_engaged_domain": least_domain,
        "suggested_tone": suggested_tone,
        "suggested_detail_level": suggested_detail,
        "suggested_domain_weights": suggested_weights,
        "confidence": confidence,
        "sample_size": sample_size,
        "domain_activity": activity,
        "insights": insights,
    }


@router.get("")
async def get_personalisation(user: User = Depends(get_current_user)):
    sb = get_supabase()
    return _get_or_create_prefs(user.id, sb)


@router.patch("")
async def update_personalisation(payload: PersonalisationUpdate, user: User = Depends(get_current_user)):
    sb = get_supabase()
    prefs = _get_or_create_prefs(user.id, sb)
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        return prefs
    # Save snapshot to undo stack (last 5)
    undo_stack = prefs.get("undo_stack", [])
    undo_stack.append({k: prefs.get(k) for k in updates})
    updates["undo_stack"] = undo_stack[-5:]
    result = sb.table("user_personalisation").update(updates).eq("user_id", user.id).execute()
    return result.data[0] if result.data else prefs


@router.post("/reset")
async def reset_personalisation(user: User = Depends(get_current_user)):
    sb = get_supabase()
    row = {"user_id": user.id, **DEFAULTS, "undo_stack": []}
    sb.table("user_personalisation").upsert(row).execute()
    return row


@router.get("/learning")
async def get_learning_insights(user: User = Depends(get_current_user)):
    """Return rule-based learning insights from the user's recent behavioural data."""
    sb = get_supabase()
    prefs = _get_or_create_prefs(user.id, sb)

    entries = _safe_rows(sb, "entries", user.id)
    goals = _safe_rows(sb, "goals", user.id)
    habits = _safe_rows(sb, "habits", user.id)
    tasks = _safe_rows(sb, "tasks", user.id)
    planner = _safe_rows(sb, "planner_items", user.id)

    entry_counts = _domain_counts(entries)
    active_goal_counts = _domain_counts(goals, lambda row: row.get("status", "active") == "active")
    active_habit_counts = _domain_counts(habits, lambda row: row.get("is_active", True) is True)
    open_task_counts = _domain_counts(tasks, lambda row: row.get("status") not in ("done", "archived"))
    planner_counts = _domain_counts(planner)

    weights = prefs.get("domain_weights") or DEFAULTS["domain_weights"]
    activity = {}
    for domain in DOMAINS:
        activity_score = (
            entry_counts[domain]
            + (active_goal_counts[domain] * 2)
            + active_habit_counts[domain]
            + open_task_counts[domain]
            + planner_counts[domain]
        )
        activity[domain] = {
            "entries": entry_counts[domain],
            "active_goals": active_goal_counts[domain],
            "active_habits": active_habit_counts[domain],
            "open_tasks": open_task_counts[domain],
            "planner_items": planner_counts[domain],
            "activity_score": activity_score,
            "sample_count": (
                entry_counts[domain]
                + active_goal_counts[domain]
                + active_habit_counts[domain]
                + open_task_counts[domain]
                + planner_counts[domain]
            ),
            "current_weight": int(weights.get(domain, 5)),
        }

    return _build_learning_insights(prefs, activity)


@router.post("/undo")
async def undo_personalisation(user: User = Depends(get_current_user)):
    sb = get_supabase()
    prefs = _get_or_create_prefs(user.id, sb)
    undo_stack = prefs.get("undo_stack", [])
    if not undo_stack:
        raise HTTPException(400, "Nothing to undo")
    prev = undo_stack.pop()
    prev["undo_stack"] = undo_stack
    result = sb.table("user_personalisation").update(prev).eq("user_id", user.id).execute()
    return result.data[0] if result.data else prev


@router.get("/domains")
async def get_domain_customisation(user: User = Depends(get_current_user)):
    sb = get_supabase()
    prefs = _get_or_create_prefs(user.id, sb)
    return prefs.get("domain_config") or {}


@router.patch("/domains/{domain}")
async def update_domain_customisation(domain: str, payload: DomainCustomisationUpdate, user: User = Depends(get_current_user)):
    if domain not in DOMAINS:
        raise HTTPException(400, "Unknown domain")
    sb = get_supabase()
    prefs = _get_or_create_prefs(user.id, sb)
    config = prefs.get("domain_config") or {}
    current = config.get(domain) or {}
    updates = payload.model_dump(exclude_none=True)
    config[domain] = {**current, **updates}
    result = sb.table("user_personalisation").update({"domain_config": config}).eq("user_id", user.id).execute()
    return (result.data[0] if result.data else {"domain_config": config}).get("domain_config", config)
