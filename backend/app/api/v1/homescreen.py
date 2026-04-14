"""
Home screen API — pre-computed daily panels with Redis/DB cache.
GET  /homescreen              — served from cache, falls back to live
POST /homescreen/refresh      — force regenerate
POST /homescreen/items/{id}/complete
POST /homescreen/items/{id}/snooze
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta

from app.security.auth import get_current_user, User
from app.db.client import get_supabase
from app.services.prioritiser import today_items, week_items, month_items, year_items

router = APIRouter(prefix="/homescreen", tags=["homescreen"])


async def _build_homescreen(user_id: str, sb) -> dict:
    """Build the 4-panel home screen payload from live DB data."""
    # Fetch personalisation weights
    prefs_result = sb.table("user_personalisation").select("domain_weights").eq("user_id", user_id).single().execute()
    weights = (prefs_result.data or {}).get("domain_weights") if prefs_result.data else None

    # Fetch tasks
    tasks_result = sb.table("tasks").select("*").eq("user_id", user_id).neq("status", "archived").execute()
    tasks = tasks_result.data or []

    # Fetch habits due today
    habits_result = sb.table("habits").select("*").eq("user_id", user_id).eq("is_active", True).execute()
    habits_today = habits_result.data or []

    # Fetch active goals
    goals_result = sb.table("goals").select("title,domain,current_value,target_value,status").eq("user_id", user_id).eq("status", "active").limit(10).execute()
    goals = goals_result.data or []

    # Fetch planner non-movable items today
    now = datetime.now(timezone.utc)
    tomorrow = now + timedelta(days=1)
    non_movable_result = sb.table("planner_items").select("*").eq("user_id", user_id).eq("is_non_movable", True).gte("start_at", now.isoformat()).lte("start_at", tomorrow.isoformat()).execute()
    non_movable = non_movable_result.data or []

    # Score tasks for each time window
    return {
        "today": {
            "non_movable": non_movable,
            "tasks": today_items(tasks, weights),
            "habits": habits_today[:5],
            "coaching_question": "What's the one thing that would make today a win?",
        },
        "this_week": {
            "tasks": week_items(tasks, weights),
            "goals": [g for g in goals if g.get("domain") in ("health", "career", "growth")],
        },
        "this_month": {
            "tasks": month_items(tasks, weights),
            "goals": goals,
        },
        "this_year": {
            "tasks": year_items(tasks, weights),
            "goals": goals,
            "life_score_note": "Visit your dashboard for the full Life Score trend.",
        },
        "generated_at": now.isoformat(),
    }


@router.get("")
async def get_homescreen(user: User = Depends(get_current_user)):
    sb = get_supabase()

    # Check cache
    try:
        cache_result = sb.table("homescreen_cache").select("*").eq("user_id", user.id).single().execute()
        if cache_result.data:
            stale_after = cache_result.data.get("stale_after", "")
            if stale_after and datetime.fromisoformat(stale_after.replace("Z", "+00:00")) > datetime.now(timezone.utc):
                # Cache is fresh
                return {
                    "today": cache_result.data.get("today", {}),
                    "this_week": cache_result.data.get("this_week", {}),
                    "this_month": cache_result.data.get("this_month", {}),
                    "this_year": cache_result.data.get("this_year", {}),
                    "generated_at": cache_result.data.get("generated_at"),
                    "from_cache": True,
                }
    except Exception:
        pass

    # Build live
    data = await _build_homescreen(user.id, sb)
    return data


@router.post("/refresh")
async def refresh_homescreen(user: User = Depends(get_current_user)):
    sb = get_supabase()
    data = await _build_homescreen(user.id, sb)

    # Write to cache
    try:
        now = datetime.now(timezone.utc)
        sb.table("homescreen_cache").upsert({
            "user_id": user.id,
            "today": data["today"],
            "this_week": data["this_week"],
            "this_month": data["this_month"],
            "this_year": data["this_year"],
            "generated_at": now.isoformat(),
            "stale_after": (now + timedelta(hours=6)).isoformat(),
        }).execute()
    except Exception:
        pass

    return {**data, "refreshed": True}


@router.post("/items/{item_id}/complete")
async def complete_homescreen_item(item_id: str, user: User = Depends(get_current_user)):
    sb = get_supabase()
    # Try tasks first
    result = sb.table("tasks").update({"status": "done", "updated_at": datetime.now(timezone.utc).isoformat()}).eq("id", item_id).eq("user_id", user.id).execute()
    if result.data:
        return {"completed": True, "type": "task"}
    # Try planner items
    result = sb.table("planner_items").update({"completed": True, "completed_at": datetime.now(timezone.utc).isoformat()}).eq("id", item_id).eq("user_id", user.id).execute()
    if result.data:
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
    return {"snoozed": True, "new_due_date": new_due}
