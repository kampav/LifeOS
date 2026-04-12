from fastapi import APIRouter, Depends
from app.security.auth import get_current_user, User
from app.db.client import get_supabase

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
async def list_notifications(limit: int = 20, user: User = Depends(get_current_user)):
    sb = get_supabase()
    result = sb.table("notifications").select("*").eq("user_id", user.id).order("created_at", desc=True).limit(limit).execute()
    return result.data


@router.put("/{notification_id}/read")
async def mark_read(notification_id: str, user: User = Depends(get_current_user)):
    sb = get_supabase()
    sb.table("notifications").update({"read": True}).eq("id", notification_id).eq("user_id", user.id).execute()
    return {"status": "ok"}


@router.delete("/{notification_id}", status_code=204)
async def delete_notification(notification_id: str, user: User = Depends(get_current_user)):
    sb = get_supabase()
    sb.table("notifications").delete().eq("id", notification_id).eq("user_id", user.id).execute()
