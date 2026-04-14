"""
Tasks API — Kanban CRUD + move + bulk operations.
GET  /kanban              — filtered tasks view
POST /tasks               — create
GET  /tasks/{id}          — get one
PUT  /tasks/{id}          — update
DELETE /tasks/{id}        — delete
POST /tasks/{id}/move     — move to new status/position
POST /tasks/bulk          — bulk action
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime, timezone
import uuid

from app.security.auth import get_current_user, User
from app.db.client import get_supabase

router = APIRouter(tags=["tasks"])

STATUSES = ("todo", "in_progress", "waiting", "done", "archived")


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    domain: Optional[str] = None
    priority: str = "medium"
    due_date: Optional[str] = None
    goal_id: Optional[str] = None
    tags: list[str] = []
    is_non_movable: bool = False


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    domain: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None
    goal_id: Optional[str] = None
    tags: Optional[list[str]] = None


class TaskMove(BaseModel):
    status: str
    position: int = 0


class BulkAction(BaseModel):
    action: str   # "complete" | "archive" | "delete" | "set_priority" | "set_domain"
    ids: list[str]
    payload: Optional[dict[str, Any]] = None


@router.get("/kanban")
async def get_kanban(
    domain: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    user: User = Depends(get_current_user),
):
    """Return tasks grouped by status column."""
    sb = get_supabase()
    query = sb.table("tasks").select("*").eq("user_id", user.id).neq("status", "archived")
    if domain:
        query = query.eq("domain", domain)
    if priority:
        query = query.eq("priority", priority)
    result = query.order("position").execute()
    tasks = result.data or []

    if q:
        q_lower = q.lower()
        tasks = [t for t in tasks if q_lower in (t.get("title", "") + t.get("description", "")).lower()]

    # Group by status
    columns: dict[str, list] = {s: [] for s in STATUSES if s != "archived"}
    for task in tasks:
        status = task.get("status", "todo")
        if status in columns:
            columns[status].append(task)

    return columns


@router.post("/tasks", status_code=201)
async def create_task(payload: TaskCreate, user: User = Depends(get_current_user)):
    sb = get_supabase()
    # Get max position in todo column
    pos_result = sb.table("tasks").select("position").eq("user_id", user.id).eq("status", "todo").order("position", desc=True).limit(1).execute()
    max_pos = (pos_result.data[0]["position"] + 1) if pos_result.data else 0
    row = {
        "id": str(uuid.uuid4()),
        "user_id": user.id,
        "title": payload.title,
        "description": payload.description,
        "domain": payload.domain,
        "priority": payload.priority,
        "due_date": payload.due_date,
        "goal_id": payload.goal_id,
        "tags": payload.tags,
        "is_non_movable": payload.is_non_movable,
        "status": "todo",
        "position": max_pos,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    result = sb.table("tasks").insert(row).execute()
    return result.data[0] if result.data else row


@router.get("/tasks/{task_id}")
async def get_task(task_id: str, user: User = Depends(get_current_user)):
    sb = get_supabase()
    result = sb.table("tasks").select("*").eq("id", task_id).eq("user_id", user.id).single().execute()
    if not result.data:
        raise HTTPException(404, "Task not found")
    return result.data


@router.put("/tasks/{task_id}")
async def update_task(task_id: str, payload: TaskUpdate, user: User = Depends(get_current_user)):
    sb = get_supabase()
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(400, "No updates provided")
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = sb.table("tasks").update(updates).eq("id", task_id).eq("user_id", user.id).execute()
    if not result.data:
        raise HTTPException(404, "Task not found")
    return result.data[0]


@router.delete("/tasks/{task_id}", status_code=204)
async def delete_task(task_id: str, user: User = Depends(get_current_user)):
    sb = get_supabase()
    result = sb.table("tasks").delete().eq("id", task_id).eq("user_id", user.id).execute()
    if not result.data:
        raise HTTPException(404, "Task not found")


@router.post("/tasks/{task_id}/move")
async def move_task(task_id: str, payload: TaskMove, user: User = Depends(get_current_user)):
    if payload.status not in STATUSES:
        raise HTTPException(400, f"Invalid status. Must be one of {STATUSES}")
    sb = get_supabase()
    updates = {
        "status": payload.status,
        "position": payload.position,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    result = sb.table("tasks").update(updates).eq("id", task_id).eq("user_id", user.id).execute()
    if not result.data:
        raise HTTPException(404, "Task not found")
    return result.data[0]


@router.post("/tasks/bulk")
async def bulk_action(payload: BulkAction, user: User = Depends(get_current_user)):
    if not payload.ids:
        raise HTTPException(400, "No task IDs provided")
    sb = get_supabase()

    if payload.action == "complete":
        updates = {"status": "done", "updated_at": datetime.now(timezone.utc).isoformat()}
    elif payload.action == "archive":
        updates = {"status": "archived", "updated_at": datetime.now(timezone.utc).isoformat()}
    elif payload.action == "delete":
        for task_id in payload.ids:
            sb.table("tasks").delete().eq("id", task_id).eq("user_id", user.id).execute()
        return {"deleted": len(payload.ids)}
    elif payload.action == "set_priority":
        priority = (payload.payload or {}).get("priority", "medium")
        updates = {"priority": priority, "updated_at": datetime.now(timezone.utc).isoformat()}
    elif payload.action == "set_domain":
        domain = (payload.payload or {}).get("domain")
        updates = {"domain": domain, "updated_at": datetime.now(timezone.utc).isoformat()}
    else:
        raise HTTPException(400, f"Unknown action: {payload.action}")

    # Apply update to all IDs (Supabase doesn't support IN filter directly — loop)
    updated = 0
    for task_id in payload.ids:
        result = sb.table("tasks").update(updates).eq("id", task_id).eq("user_id", user.id).execute()
        if result.data:
            updated += 1
    return {"updated": updated}
