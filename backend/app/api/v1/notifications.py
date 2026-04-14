from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from app.security.auth import get_current_user, User
from app.db.client import get_supabase

router = APIRouter(prefix="/notifications", tags=["notifications"])


class NotificationPreferences(BaseModel):
    daily_brief: bool = True
    weekly_review: bool = True
    goal_reminders: bool = True
    relationship_check_ins: bool = True
    evening_reflection: bool = True
    email_daily_brief: bool = False
    email_weekly_review: bool = True


@router.get("")
async def list_notifications(limit: int = 20, user: User = Depends(get_current_user)):
    sb = get_supabase()
    result = sb.table("notifications").select("*").eq("user_id", user.id).order("created_at", desc=True).limit(limit).execute()
    return result.data or []


@router.put("/read-all")
async def mark_all_read(user: User = Depends(get_current_user)):
    sb = get_supabase()
    result = sb.table("notifications").update({"read": True}).eq("user_id", user.id).eq("read", False).execute()
    return {"status": "ok", "updated": len(result.data or [])}


@router.put("/{notification_id}/read")
async def mark_read(notification_id: str, user: User = Depends(get_current_user)):
    sb = get_supabase()
    sb.table("notifications").update({"read": True}).eq("id", notification_id).eq("user_id", user.id).execute()
    return {"status": "ok"}


@router.delete("/{notification_id}", status_code=204)
async def delete_notification(notification_id: str, user: User = Depends(get_current_user)):
    sb = get_supabase()
    sb.table("notifications").delete().eq("id", notification_id).eq("user_id", user.id).execute()


@router.post("/preferences")
async def set_notification_preferences(prefs: NotificationPreferences, user: User = Depends(get_current_user)):
    sb = get_supabase()
    sb.table("profiles").update({"notification_preferences": prefs.model_dump()}).eq("id", user.id).execute()
    return {"status": "ok", "preferences": prefs.model_dump()}


@router.get("/preferences")
async def get_notification_preferences(user: User = Depends(get_current_user)):
    sb = get_supabase()
    result = sb.table("profiles").select("notification_preferences").eq("id", user.id).single().execute()
    prefs = (result.data or {}).get("notification_preferences") or {}
    return NotificationPreferences(**prefs).model_dump()
