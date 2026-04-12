from fastapi import APIRouter, Depends, HTTPException, Query
from app.security.auth import get_current_user, User
from app.db.client import get_supabase
from app.observability.logging import get_logger
from pydantic import BaseModel
from typing import Optional
from datetime import date, timedelta

router = APIRouter(prefix="/social", tags=["social"])
log = get_logger()


class ContactCreate(BaseModel):
    name: str
    relationship: Optional[str] = None
    desired_frequency: Optional[str] = None
    notes: Optional[str] = None
    data: Optional[dict] = None


class ContactUpdate(BaseModel):
    name: Optional[str] = None
    relationship: Optional[str] = None
    last_contact_date: Optional[date] = None
    desired_frequency: Optional[str] = None
    notes: Optional[str] = None
    data: Optional[dict] = None


class InteractionLog(BaseModel):
    notes: Optional[str] = None
    interaction_date: Optional[date] = None


@router.post("/contacts", status_code=201)
async def create_contact(payload: ContactCreate, user: User = Depends(get_current_user)):
    sb = get_supabase()
    data = payload.model_dump(exclude_none=True)
    data["user_id"] = user.id
    result = sb.table("contacts").insert(data).execute()
    return result.data[0]


@router.get("/contacts")
async def list_contacts(
    relationship: Optional[str] = None,
    limit: int = Query(50, le=200),
    user: User = Depends(get_current_user),
):
    sb = get_supabase()
    q = sb.table("contacts").select("*").eq("user_id", user.id).order("name").limit(limit)
    if relationship:
        q = q.eq("relationship", relationship)
    result = q.execute()
    return result.data


@router.put("/contacts/{contact_id}")
async def update_contact(contact_id: str, payload: ContactUpdate, user: User = Depends(get_current_user)):
    sb = get_supabase()
    data = payload.model_dump(exclude_none=True)
    result = sb.table("contacts").update(data).eq("id", contact_id).eq("user_id", user.id).execute()
    if not result.data:
        raise HTTPException(404, "Contact not found")
    return result.data[0]


@router.post("/contacts/{contact_id}/interaction")
async def log_interaction(contact_id: str, payload: InteractionLog, user: User = Depends(get_current_user)):
    sb = get_supabase()
    interaction_date = payload.interaction_date or date.today()
    # Update last_contact_date
    sb.table("contacts").update({"last_contact_date": interaction_date.isoformat()}).eq("id", contact_id).eq("user_id", user.id).execute()
    # Log as entry
    entry = {
        "user_id": user.id,
        "domain": "social",
        "entry_type": "event",
        "title": f"Contact with {contact_id}",
        "notes": payload.notes,
        "data": {"contact_id": contact_id},
        "logged_at": interaction_date.isoformat(),
    }
    result = sb.table("entries").insert(entry).execute()
    log.info("interaction_logged", user_id=user.id, contact_id=contact_id)
    return {"status": "ok"}


@router.get("/contacts/due-checkin")
async def due_checkins(user: User = Depends(get_current_user)):
    """Return contacts that are overdue for a check-in."""
    sb = get_supabase()
    contacts = sb.table("contacts").select("*").eq("user_id", user.id).not_.is_("desired_frequency", "null").execute()
    freq_days = {"weekly": 7, "monthly": 30, "quarterly": 90, "yearly": 365}
    today = date.today()
    due = []
    for c in (contacts.data or []):
        freq = c.get("desired_frequency")
        last = c.get("last_contact_date")
        if not freq:
            continue
        days = freq_days.get(freq, 30)
        if not last or (today - date.fromisoformat(last)).days >= days:
            due.append(c)
    return due
