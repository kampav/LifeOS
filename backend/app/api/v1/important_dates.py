"""
Sprint 10 — Important Dates API.

Endpoints:
  GET    /important-dates           — list, with upcoming sorted first
  POST   /important-dates           — create
  GET    /important-dates/upcoming  — next N dates (recurring-aware)
  PUT    /important-dates/{id}      — update
  DELETE /important-dates/{id}      — delete
"""
from __future__ import annotations

from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.security.auth import get_current_user, User
from app.db.client import get_supabase

router = APIRouter(prefix="/important-dates", tags=["important-dates"])

CATEGORIES = {"birthday", "anniversary", "deadline", "appointment", "holiday", "other"}


class ImportantDateIn(BaseModel):
    title: str
    date: date
    category: str = "other"
    domain: Optional[str] = None
    recurring: bool = True
    notes: Optional[str] = None


def next_occurrence(d: date, recurring: bool) -> date:
    """For recurring dates, compute the next occurrence from today."""
    if not recurring:
        return d
    today = date.today()
    try:
        this_year = d.replace(year=today.year)
    except ValueError:
        # Feb 29 — use Mar 1 in non-leap years
        this_year = date(today.year, 3, 1)
    if this_year >= today:
        return this_year
    try:
        return d.replace(year=today.year + 1)
    except ValueError:
        return date(today.year + 1, 3, 1)


def days_until(d: date) -> int:
    return (d - date.today()).days


@router.get("")
async def list_dates(
    domain: Optional[str] = None,
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    q = supabase.table("important_dates").select("*").eq("user_id", current_user.id)
    if domain:
        q = q.eq("domain", domain)
    if category:
        q = q.eq("category", category)
    result = q.order("date").execute()

    rows = result.data or []
    for r in rows:
        d = date.fromisoformat(r["date"])
        nxt = next_occurrence(d, r.get("recurring", True))
        r["next_occurrence"] = nxt.isoformat()
        r["days_until"] = days_until(nxt)

    rows.sort(key=lambda r: r["days_until"])
    return {"dates": rows, "total": len(rows)}


@router.get("/upcoming")
async def upcoming_dates(
    days: int = Query(90, le=365),
    domain: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """Return dates with a next occurrence within the next N days."""
    q = supabase.table("important_dates").select("*").eq("user_id", current_user.id)
    if domain:
        q = q.eq("domain", domain)
    result = q.execute()

    upcoming = []
    cutoff = date.today() + timedelta(days=days)
    for r in (result.data or []):
        d = date.fromisoformat(r["date"])
        nxt = next_occurrence(d, r.get("recurring", True))
        du = days_until(nxt)
        if 0 <= du <= days:
            r["next_occurrence"] = nxt.isoformat()
            r["days_until"] = du
            upcoming.append(r)

    upcoming.sort(key=lambda r: r["days_until"])
    return {"upcoming": upcoming, "total": len(upcoming)}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_date(
    body: ImportantDateIn,
    current_user: User = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    if body.category not in CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Invalid category: {body.category}")

    payload = body.model_dump()
    payload["date"] = str(payload["date"])
    payload["user_id"] = current_user.id

    result = supabase.table("important_dates").insert(payload).execute()
    return (result.data or [{}])[0]


@router.put("/{date_id}")
async def update_date(
    date_id: str,
    body: ImportantDateIn,
    current_user: User = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    check = supabase.table("important_dates").select("id").eq("id", date_id).eq(
        "user_id", current_user.id
    ).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Date not found")

    if body.category not in CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Invalid category: {body.category}")

    payload = body.model_dump(exclude_none=True)
    payload["date"] = str(payload["date"])

    result = supabase.table("important_dates").update(payload).eq("id", date_id).execute()
    return (result.data or [{}])[0]


@router.delete("/{date_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_date(
    date_id: str,
    current_user: User = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    check = supabase.table("important_dates").select("id").eq("id", date_id).eq(
        "user_id", current_user.id
    ).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Date not found")
    supabase.table("important_dates").delete().eq("id", date_id).execute()
