from fastapi import APIRouter, Depends, HTTPException, Query
from app.security.auth import get_current_user, User
from app.models.goal import GoalCreate, GoalUpdate, GoalProgressUpdate, GoalResponse
from app.db.client import get_supabase
from app.observability.logging import get_logger
from app.observability.metrics import GOALS_COMPLETED
from typing import Optional

router = APIRouter(prefix="/goals", tags=["goals"])
log = get_logger()


@router.post("", response_model=GoalResponse, status_code=201)
async def create_goal(payload: GoalCreate, user: User = Depends(get_current_user)):
    sb = get_supabase()
    data = payload.model_dump(exclude_none=True)
    data["user_id"] = user.id
    result = sb.table("goals").insert(data).execute()
    log.info("goal_created", user_id=user.id, domain=payload.domain)
    return result.data[0]


@router.get("", response_model=list[GoalResponse])
async def list_goals(
    domain: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(20, le=100),
    user: User = Depends(get_current_user),
):
    sb = get_supabase()
    q = sb.table("goals").select("*").eq("user_id", user.id).order("created_at", desc=True).limit(limit)
    if domain:
        q = q.eq("domain", domain)
    if status:
        q = q.eq("status", status)
    result = q.execute()
    return result.data


@router.put("/{goal_id}", response_model=GoalResponse)
async def update_goal(goal_id: str, payload: GoalUpdate, user: User = Depends(get_current_user)):
    sb = get_supabase()
    data = payload.model_dump(exclude_none=True)
    result = sb.table("goals").update(data).eq("id", goal_id).eq("user_id", user.id).execute()
    if not result.data:
        raise HTTPException(404, "Goal not found")
    if data.get("status") == "completed":
        GOALS_COMPLETED.labels(domain=result.data[0]["domain"]).inc()
    return result.data[0]


@router.post("/{goal_id}/progress", response_model=GoalResponse)
async def update_goal_progress(goal_id: str, payload: GoalProgressUpdate, user: User = Depends(get_current_user)):
    sb = get_supabase()
    result = sb.table("goals").update({"current_value": payload.current_value}).eq("id", goal_id).eq("user_id", user.id).execute()
    if not result.data:
        raise HTTPException(404, "Goal not found")
    goal = result.data[0]
    if goal["target_value"] and payload.current_value >= goal["target_value"]:
        sb.table("goals").update({"status": "completed"}).eq("id", goal_id).execute()
        GOALS_COMPLETED.labels(domain=goal["domain"]).inc()
    return goal


@router.delete("/{goal_id}", status_code=204)
async def delete_goal(goal_id: str, user: User = Depends(get_current_user)):
    sb = get_supabase()
    sb.table("goals").delete().eq("id", goal_id).eq("user_id", user.id).execute()
