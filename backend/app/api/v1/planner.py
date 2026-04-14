"""
Planner API — calendar view + agenda + priority list + Google sync.
GET  /planner              — ?view=week&start=DATE&domain=&q=
GET  /planner/priority     — top 25 by priority score
GET  /planner/agenda       — next 14 days chronological
POST /planner/items        — create item
PUT  /planner/items/{id}   — update item
DELETE /planner/items/{id} — delete item
POST /planner/items/{id}/complete
POST /planner/sync/google  — trigger Google Calendar sync
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid

from app.security.auth import get_current_user, User
from app.db.client import get_supabase
from app.services.prioritiser import priority_score

router = APIRouter(prefix="/planner", tags=["planner"])


class PlannerItemCreate(BaseModel):
    title: str
    domain: Optional[str] = None
    item_type: str = "task"
    start_at: str
    end_at: Optional[str] = None
    all_day: bool = False
    is_non_movable: bool = False
    priority: str = "medium"
    task_id: Optional[str] = None
    goal_id: Optional[str] = None


class PlannerItemUpdate(BaseModel):
    title: Optional[str] = None
    domain: Optional[str] = None
    start_at: Optional[str] = None
    end_at: Optional[str] = None
    all_day: Optional[bool] = None
    priority: Optional[str] = None
    completed: Optional[bool] = None


@router.get("")
async def get_planner(
    view: str = Query("week"),
    start: Optional[str] = Query(None),
    domain: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    user: User = Depends(get_current_user),
):
    sb = get_supabase()
    now = datetime.now(timezone.utc)
    start_dt = datetime.fromisoformat(start) if start else now
    if view == "day":
        end_dt = start_dt + timedelta(days=1)
    elif view == "month":
        end_dt = start_dt + timedelta(days=31)
    else:  # week
        end_dt = start_dt + timedelta(days=7)

    query = (sb.table("planner_items").select("*").eq("user_id", user.id)
             .gte("start_at", start_dt.isoformat()).lte("start_at", end_dt.isoformat()))
    if domain:
        query = query.eq("domain", domain)
    result = query.order("start_at").execute()
    items = result.data or []

    if q:
        q_lower = q.lower()
        items = [i for i in items if q_lower in i.get("title", "").lower()]

    return {"view": view, "start": start_dt.isoformat(), "end": end_dt.isoformat(), "items": items}


@router.get("/priority")
async def get_priority_view(user: User = Depends(get_current_user)):
    """Top 25 items by priority score."""
    sb = get_supabase()
    # Fetch all incomplete items
    result = (sb.table("planner_items").select("*").eq("user_id", user.id)
              .eq("completed", False).limit(200).execute())
    items = result.data or []
    # Also include tasks
    task_result = (sb.table("tasks").select("*").eq("user_id", user.id)
                   .neq("status", "done").neq("status", "archived").limit(200).execute())
    items += task_result.data or []

    scored = sorted(items, key=lambda i: priority_score(i), reverse=True)
    return scored[:25]


@router.get("/agenda")
async def get_agenda(days: int = Query(14), user: User = Depends(get_current_user)):
    """Chronological list of items in the next N days."""
    sb = get_supabase()
    now = datetime.now(timezone.utc)
    end = now + timedelta(days=days)
    result = (sb.table("planner_items").select("*").eq("user_id", user.id)
              .gte("start_at", now.isoformat()).lte("start_at", end.isoformat())
              .order("start_at").execute())
    # Also include tasks with due dates
    task_result = (sb.table("tasks").select("*").eq("user_id", user.id)
                   .neq("status", "done").neq("status", "archived").execute())
    tasks_with_due = [t for t in (task_result.data or []) if t.get("due_date")]
    all_items = (result.data or []) + tasks_with_due
    all_items.sort(key=lambda x: x.get("start_at") or x.get("due_date") or "")
    return {"days": days, "items": all_items}


@router.post("/items", status_code=201)
async def create_item(payload: PlannerItemCreate, user: User = Depends(get_current_user)):
    sb = get_supabase()
    row = {
        "id": str(uuid.uuid4()),
        "user_id": user.id,
        **payload.model_dump(),
        "completed": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    result = sb.table("planner_items").insert(row).execute()
    return result.data[0] if result.data else row


@router.put("/items/{item_id}")
async def update_item(item_id: str, payload: PlannerItemUpdate, user: User = Depends(get_current_user)):
    sb = get_supabase()
    updates = payload.model_dump(exclude_none=True)
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = sb.table("planner_items").update(updates).eq("id", item_id).eq("user_id", user.id).execute()
    if not result.data:
        raise HTTPException(404, "Item not found")
    return result.data[0]


@router.delete("/items/{item_id}", status_code=204)
async def delete_item(item_id: str, user: User = Depends(get_current_user)):
    sb = get_supabase()
    result = sb.table("planner_items").delete().eq("id", item_id).eq("user_id", user.id).execute()
    if not result.data:
        raise HTTPException(404, "Item not found")


@router.post("/items/{item_id}/complete")
async def complete_item(item_id: str, user: User = Depends(get_current_user)):
    sb = get_supabase()
    updates = {
        "completed": True,
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    result = sb.table("planner_items").update(updates).eq("id", item_id).eq("user_id", user.id).execute()
    if not result.data:
        raise HTTPException(404, "Item not found")
    return result.data[0]


@router.post("/sync/google")
async def sync_google(user: User = Depends(get_current_user)):
    """Trigger Google Calendar sync — stub, wired up in Sprint 7."""
    return {"status": "queued", "message": "Google Calendar sync queued"}
