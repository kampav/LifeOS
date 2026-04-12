from fastapi import APIRouter, Depends, HTTPException, Query
from app.security.auth import get_current_user, User
from app.security.rate_limiter import check_rate_limit
from app.models.entry import EntryCreate, EntryUpdate, EntryResponse
from app.db.client import get_supabase
from app.observability.logging import get_logger
from app.observability.metrics import ENTRIES_CREATED
from datetime import datetime, timezone
from typing import Optional

router = APIRouter(prefix="/entries", tags=["entries"])
log = get_logger()


@router.post("", response_model=EntryResponse, status_code=201)
async def create_entry(payload: EntryCreate, user: User = Depends(get_current_user)):
    await check_rate_limit(user.id, user.tier, "api_calls")
    sb = get_supabase()
    data = payload.model_dump(exclude_none=True)
    data["user_id"] = user.id
    if "logged_at" not in data:
        data["logged_at"] = datetime.now(timezone.utc).isoformat()
    result = sb.table("entries").insert(data).execute()
    ENTRIES_CREATED.labels(domain=payload.domain, entry_type=payload.entry_type).inc()
    log.info("entry_created", user_id=user.id, domain=payload.domain, entry_type=payload.entry_type)
    return result.data[0]


@router.get("", response_model=list[EntryResponse])
async def list_entries(
    domain: Optional[str] = None,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    limit: int = Query(20, le=100),
    cursor: Optional[str] = None,
    user: User = Depends(get_current_user),
):
    sb = get_supabase()
    q = sb.table("entries").select("*").eq("user_id", user.id).order("logged_at", desc=True).limit(limit)
    if domain:
        q = q.eq("domain", domain)
    if start:
        q = q.gte("logged_at", start.isoformat())
    if end:
        q = q.lte("logged_at", end.isoformat())
    if cursor:
        q = q.lt("logged_at", cursor)
    result = q.execute()
    return result.data


@router.get("/{entry_id}", response_model=EntryResponse)
async def get_entry(entry_id: str, user: User = Depends(get_current_user)):
    sb = get_supabase()
    result = sb.table("entries").select("*").eq("id", entry_id).eq("user_id", user.id).single().execute()
    if not result.data:
        raise HTTPException(404, "Entry not found")
    return result.data


@router.put("/{entry_id}", response_model=EntryResponse)
async def update_entry(entry_id: str, payload: EntryUpdate, user: User = Depends(get_current_user)):
    sb = get_supabase()
    data = payload.model_dump(exclude_none=True)
    result = sb.table("entries").update(data).eq("id", entry_id).eq("user_id", user.id).execute()
    if not result.data:
        raise HTTPException(404, "Entry not found")
    return result.data[0]


@router.delete("/{entry_id}", status_code=204)
async def delete_entry(entry_id: str, user: User = Depends(get_current_user)):
    sb = get_supabase()
    sb.table("entries").delete().eq("id", entry_id).eq("user_id", user.id).execute()
    log.info("entry_deleted", user_id=user.id, entry_id=entry_id)
