from fastapi import APIRouter, Depends, HTTPException, Query
from app.security.auth import get_current_user, User
from app.models.habit import HabitCreate, HabitUpdate, HabitLogCreate, HabitResponse, HabitLogResponse
from app.db.client import get_supabase
from app.observability.logging import get_logger
from datetime import date, timedelta

router = APIRouter(prefix="/habits", tags=["habits"])
log = get_logger()


@router.post("", response_model=HabitResponse, status_code=201)
async def create_habit(payload: HabitCreate, user: User = Depends(get_current_user)):
    sb = get_supabase()
    data = payload.model_dump(exclude_none=True)
    data["user_id"] = user.id
    result = sb.table("habits").insert(data).execute()
    log.info("habit_created", user_id=user.id, domain=payload.domain)
    return result.data[0]


@router.get("", response_model=list[HabitResponse])
async def list_habits(active_only: bool = True, user: User = Depends(get_current_user)):
    sb = get_supabase()
    q = sb.table("habits").select("*").eq("user_id", user.id)
    if active_only:
        q = q.eq("is_active", True)
    result = q.execute()
    return result.data


@router.put("/{habit_id}", response_model=HabitResponse)
async def update_habit(habit_id: str, payload: HabitUpdate, user: User = Depends(get_current_user)):
    sb = get_supabase()
    data = payload.model_dump(exclude_none=True)
    result = sb.table("habits").update(data).eq("id", habit_id).eq("user_id", user.id).execute()
    if not result.data:
        raise HTTPException(404, "Habit not found")
    return result.data[0]


@router.post("/{habit_id}/log", response_model=HabitLogResponse, status_code=201)
async def log_habit(habit_id: str, payload: HabitLogCreate, user: User = Depends(get_current_user)):
    sb = get_supabase()
    logged_date = payload.logged_date or date.today()
    data = {
        "habit_id": habit_id,
        "user_id": user.id,
        "logged_date": logged_date.isoformat(),
        "completed": payload.completed,
        "notes": payload.notes,
    }
    # Upsert to handle re-logging
    result = sb.table("habit_logs").upsert(data, on_conflict="habit_id,logged_date").execute()
    # Update streak
    await _update_streak(habit_id, user.id, logged_date)
    log.info("habit_logged", user_id=user.id, habit_id=habit_id, completed=payload.completed)
    return result.data[0]


@router.get("/{habit_id}/history", response_model=list[HabitLogResponse])
async def get_habit_history(habit_id: str, days: int = Query(90, le=365), user: User = Depends(get_current_user)):
    sb = get_supabase()
    since = (date.today() - timedelta(days=days)).isoformat()
    result = sb.table("habit_logs").select("*").eq("habit_id", habit_id).eq("user_id", user.id).gte("logged_date", since).order("logged_date", desc=True).execute()
    return result.data


async def _update_streak(habit_id: str, user_id: str, logged_date: date):
    """Recalculate streak after a log."""
    sb = get_supabase()
    logs = sb.table("habit_logs").select("logged_date,completed").eq("habit_id", habit_id).eq("user_id", user_id).eq("completed", True).order("logged_date", desc=True).limit(400).execute()
    dates = {log["logged_date"] for log in (logs.data or [])}
    streak = 0
    check = logged_date
    while check.isoformat() in dates:
        streak += 1
        check -= timedelta(days=1)
    # Fetch current longest
    habit = sb.table("habits").select("longest_streak").eq("id", habit_id).single().execute()
    longest = max(habit.data.get("longest_streak", 0), streak)
    sb.table("habits").update({"current_streak": streak, "longest_streak": longest}).eq("id", habit_id).execute()
