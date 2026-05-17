"""
Home screen API: integrated dashboard across Kanban, planner, habits, goals and AI.
GET  /homescreen
POST /homescreen/refresh
POST /homescreen/items/{id}/complete
POST /homescreen/items/{id}/snooze
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta

from app.security.auth import get_current_user, User
from app.db.client import get_supabase
from app.services.prioritiser import today_items, week_items, month_items, year_items, priority_score

router = APIRouter(prefix="/homescreen", tags=["homescreen"])


def _task_to_planner_item(task: dict) -> dict:
    due = task.get("due_date")
    return {
        **task,
        "item_type": "task",
        "source_type": "task",
        "source_id": task.get("id"),
        "task_id": task.get("id"),
        "start_at": due,
        "all_day": True,
        "completed": task.get("status") == "done",
    }


def _kanban_summary(tasks: list[dict]) -> dict:
    columns = {"todo": 0, "in_progress": 0, "waiting": 0, "done": 0}
    for task in tasks:
        status = task.get("status", "todo")
        if status in columns:
            columns[status] += 1
    return {
        "columns": columns,
        "open_total": columns["todo"] + columns["in_progress"] + columns["waiting"],
        "blocked_total": columns["waiting"],
        "active_total": columns["in_progress"],
    }


def _next_best_action(tasks: list[dict], planner_items: list[dict], weights: dict | None) -> dict:
    candidates = [p for p in planner_items if not p.get("completed")]
    candidates += [t for t in tasks if t.get("status") not in ("done", "archived")]
    if not candidates:
        return {
            "type": "capture",
            "title": "Capture one useful signal",
            "reason": "Life OS gets smarter when each session adds a small piece of context.",
        }
    best = sorted(candidates, key=lambda item: priority_score(item, weights), reverse=True)[0]
    return {
        "type": "planner" if best.get("start_at") else "task",
        "id": best.get("id"),
        "title": best.get("title", "Next action"),
        "domain": best.get("domain"),
        "priority": best.get("priority"),
        "reason": "Selected from planner and Kanban using urgency, priority, domain weighting, and goal linkage.",
    }


def _invalidate_cache(sb, user_id: str) -> None:
    try:
        sb.table("homescreen_cache").delete().eq("user_id", user_id).execute()
    except Exception:
        pass


async def _build_homescreen(user_id: str, sb) -> dict:
    """Build the home screen from one integrated work graph."""
    prefs_result = sb.table("user_personalisation").select("domain_weights").eq("user_id", user_id).single().execute()
    weights = (prefs_result.data or {}).get("domain_weights") if prefs_result.data else None

    now = datetime.now(timezone.utc)
    tomorrow = now + timedelta(days=1)
    year_end = now + timedelta(days=365)

    tasks_result = sb.table("tasks").select("*").eq("user_id", user_id).neq("status", "archived").execute()
    tasks = tasks_result.data or []

    planner_result = (
        sb.table("planner_items")
        .select("*")
        .eq("user_id", user_id)
        .eq("completed", False)
        .gte("start_at", now.isoformat())
        .lte("start_at", year_end.isoformat())
        .execute()
    )
    planner_items = planner_result.data or []

    task_calendar_items = [
        _task_to_planner_item(t)
        for t in tasks
        if t.get("due_date") and t.get("status") not in ("done", "archived")
    ]
    work_items = tasks + planner_items + task_calendar_items

    habits_result = sb.table("habits").select("*").eq("user_id", user_id).eq("is_active", True).execute()
    habits_today = habits_result.data or []

    goals_result = (
        sb.table("goals")
        .select("title,domain,current_value,target_value,status")
        .eq("user_id", user_id)
        .eq("status", "active")
        .limit(10)
        .execute()
    )
    goals = goals_result.data or []

    try:
        inbox_result = (
            sb.table("life_items")
            .select("id,title,source_type,source_provider,item_kind,priority,created_at")
            .eq("user_id", user_id)
            .eq("status", "inbox")
            .order("created_at", desc=True)
            .limit(8)
            .execute()
        )
        life_inbox = inbox_result.data or []
    except Exception:
        life_inbox = []

    non_movable_result = (
        sb.table("planner_items")
        .select("*")
        .eq("user_id", user_id)
        .eq("is_non_movable", True)
        .gte("start_at", now.isoformat())
        .lte("start_at", tomorrow.isoformat())
        .execute()
    )
    non_movable = non_movable_result.data or []

    upcoming_agenda = sorted(
        planner_items + task_calendar_items,
        key=lambda x: x.get("start_at") or x.get("due_date") or "",
    )[:10]

    return {
        "today": {
            "non_movable": non_movable,
            "tasks": today_items(work_items, weights),
            "habits": habits_today[:5],
            "life_inbox": life_inbox,
            "coaching_question": "What's the one thing that would make today a win?",
        },
        "this_week": {
            "tasks": week_items(work_items, weights),
            "goals": [g for g in goals if g.get("domain") in ("health", "career", "growth")],
        },
        "this_month": {
            "tasks": month_items(work_items, weights),
            "goals": goals,
        },
        "this_year": {
            "tasks": year_items(work_items, weights),
            "goals": goals,
            "life_score_note": "Visit your dashboard for the full Life Score trend.",
        },
        "agenda": upcoming_agenda,
        "kanban_summary": _kanban_summary(tasks),
        "next_best_action": _next_best_action(tasks, planner_items, weights),
        "integration_summary": {
            "task_count": len(tasks),
            "planner_count": len(planner_items),
            "agenda_count": len(upcoming_agenda),
            "life_inbox_count": len(life_inbox),
            "linked_task_count": len([p for p in planner_items if p.get("task_id")]),
        },
        "generated_at": now.isoformat(),
    }


@router.get("")
async def get_homescreen(user: User = Depends(get_current_user)):
    sb = get_supabase()

    try:
        cache_result = sb.table("homescreen_cache").select("*").eq("user_id", user.id).single().execute()
        if cache_result.data:
            stale_after = cache_result.data.get("stale_after", "")
            if stale_after and datetime.fromisoformat(stale_after.replace("Z", "+00:00")) > datetime.now(timezone.utc):
                return {
                    "today": cache_result.data.get("today", {}),
                    "this_week": cache_result.data.get("this_week", {}),
                    "this_month": cache_result.data.get("this_month", {}),
                    "this_year": cache_result.data.get("this_year", {}),
                    "agenda": cache_result.data.get("agenda", []),
                    "kanban_summary": cache_result.data.get("kanban_summary", {}),
                    "next_best_action": cache_result.data.get("next_best_action", {}),
                    "integration_summary": cache_result.data.get("integration_summary", {}),
                    "generated_at": cache_result.data.get("generated_at"),
                    "from_cache": True,
                }
    except Exception:
        pass

    return await _build_homescreen(user.id, sb)


@router.post("/refresh")
async def refresh_homescreen(user: User = Depends(get_current_user)):
    sb = get_supabase()
    data = await _build_homescreen(user.id, sb)

    try:
        now = datetime.now(timezone.utc)
        sb.table("homescreen_cache").upsert({
            "user_id": user.id,
            "today": data["today"],
            "this_week": data["this_week"],
            "this_month": data["this_month"],
            "this_year": data["this_year"],
            "agenda": data.get("agenda", []),
            "kanban_summary": data.get("kanban_summary", {}),
            "next_best_action": data.get("next_best_action", {}),
            "integration_summary": data.get("integration_summary", {}),
            "generated_at": now.isoformat(),
            "stale_after": (now + timedelta(hours=6)).isoformat(),
        }).execute()
    except Exception:
        pass

    return {**data, "refreshed": True}


@router.post("/items/{item_id}/complete")
async def complete_homescreen_item(item_id: str, user: User = Depends(get_current_user)):
    sb = get_supabase()
    result = sb.table("tasks").update({"status": "done", "updated_at": datetime.now(timezone.utc).isoformat()}).eq("id", item_id).eq("user_id", user.id).execute()
    if result.data:
        _invalidate_cache(sb, user.id)
        return {"completed": True, "type": "task"}

    result = sb.table("planner_items").update({"completed": True, "completed_at": datetime.now(timezone.utc).isoformat()}).eq("id", item_id).eq("user_id", user.id).execute()
    if result.data:
        _invalidate_cache(sb, user.id)
        return {"completed": True, "type": "planner_item"}
    raise HTTPException(404, "Item not found")


class SnoozeRequest(BaseModel):
    hours: int = 24


@router.post("/items/{item_id}/snooze")
async def snooze_homescreen_item(item_id: str, payload: SnoozeRequest, user: User = Depends(get_current_user)):
    sb = get_supabase()
    new_due = (datetime.now(timezone.utc) + timedelta(hours=payload.hours)).date().isoformat()
    result = sb.table("tasks").update({"due_date": new_due, "updated_at": datetime.now(timezone.utc).isoformat()}).eq("id", item_id).eq("user_id", user.id).execute()
    if not result.data:
        raise HTTPException(404, "Item not found")
    _invalidate_cache(sb, user.id)
    return {"snoozed": True, "new_due_date": new_due}
