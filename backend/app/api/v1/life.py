"""
Unified LifeOS flow.

The user should not think in modules. Everything lands in one inbox, then
becomes one of four simple outcomes: do, schedule, remember, or archive.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional
from urllib.parse import urlencode
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.config import settings
from app.db.client import get_supabase
from app.security.auth import User, get_current_user

router = APIRouter(prefix="/life", tags=["life"])

GOOGLE_SCOPES = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/calendar.events.readonly",
    "https://www.googleapis.com/auth/gmail.readonly",
]

SIMPLE_FLOW = {
    "loop": ["capture", "decide", "act"],
    "decisions": ["do", "schedule", "remember", "archive", "snooze"],
    "promise": "One inbox. One next action. Everything else is background intelligence.",
}


class LifeCapture(BaseModel):
    title: str
    summary: Optional[str] = None
    content_preview: Optional[str] = None
    source_type: str = "manual"
    source_provider: str = "lifeos"
    external_id: Optional[str] = None
    item_kind: str = "capture"
    domain: Optional[str] = None
    priority: str = "medium"
    due_at: Optional[str] = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class LifeDecision(BaseModel):
    decision: str
    title: Optional[str] = None
    domain: Optional[str] = None
    priority: Optional[str] = None
    due_at: Optional[str] = None
    start_at: Optional[str] = None
    end_at: Optional[str] = None
    all_day: bool = False
    content: Optional[str] = None
    snoozed_until: Optional[str] = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class IntegrationRegister(BaseModel):
    provider: str = "google"
    status: str = "active"
    scopes: list[str] = Field(default_factory=lambda: GOOGLE_SCOPES)
    metadata: dict[str, Any] = Field(default_factory=dict)


class EmailMessage(BaseModel):
    provider: str = "gmail"
    external_id: str
    subject: str
    snippet: Optional[str] = None
    from_email: Optional[str] = None
    received_at: Optional[str] = None
    labels: list[str] = Field(default_factory=list)
    priority: str = "medium"


class EmailIngest(BaseModel):
    messages: list[EmailMessage]


class CalendarEvent(BaseModel):
    provider: str = "google_calendar"
    external_id: str
    title: str
    description: Optional[str] = None
    start_at: str
    end_at: Optional[str] = None
    all_day: bool = False
    location: Optional[str] = None
    html_link: Optional[str] = None
    raw: dict[str, Any] = Field(default_factory=dict)


class CalendarIngest(BaseModel):
    events: list[CalendarEvent]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _life_row(payload: LifeCapture, user_id: str) -> dict:
    data = payload.model_dump(exclude_none=True)
    data["id"] = str(uuid.uuid4())
    data["user_id"] = user_id
    data["status"] = "inbox"
    data["created_at"] = _now()
    data["updated_at"] = _now()
    return data


def _upsert_life_item(sb, row: dict) -> dict:
    result = (
        sb.table("life_items")
        .upsert(row, on_conflict="user_id,source_provider,external_id")
        .execute()
    )
    return result.data[0] if result.data else row


def _safe_insert(sb, table: str, row: dict) -> None:
    try:
        sb.table(table).insert(row).execute()
    except Exception:
        pass


@router.get("/flow")
async def get_simple_flow(user: User = Depends(get_current_user)):
    return SIMPLE_FLOW


@router.get("/inbox")
async def get_life_inbox(
    status: str = "inbox",
    source_provider: Optional[str] = None,
    limit: int = 50,
    user: User = Depends(get_current_user),
):
    sb = get_supabase()
    query = (
        sb.table("life_items")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", status)
        .order("created_at", desc=True)
        .limit(min(limit, 100))
    )
    if source_provider:
        query = query.eq("source_provider", source_provider)
    return query.execute().data or []


@router.post("/capture", status_code=201)
async def capture_item(payload: LifeCapture, user: User = Depends(get_current_user)):
    sb = get_supabase()
    row = _life_row(payload, user.id)
    return _upsert_life_item(sb, row)


@router.post("/items/{item_id}/decide")
async def decide_life_item(item_id: str, payload: LifeDecision, user: User = Depends(get_current_user)):
    sb = get_supabase()
    item_result = sb.table("life_items").select("*").eq("id", item_id).eq("user_id", user.id).single().execute()
    item = item_result.data
    if not item:
        raise HTTPException(404, "Life item not found")

    decision = payload.decision
    if decision not in SIMPLE_FLOW["decisions"]:
        raise HTTPException(400, "Decision must be do, schedule, remember, archive, or snooze")

    updates = {
        "decision": decision,
        "status": "decided",
        "updated_at": _now(),
    }

    title = payload.title or item.get("title") or "Untitled"
    domain = payload.domain if payload.domain is not None else item.get("domain")
    priority = payload.priority or item.get("priority") or "medium"

    if decision == "do":
        task = {
            "id": str(uuid.uuid4()),
            "user_id": user.id,
            "title": title,
            "description": payload.content or item.get("summary") or item.get("content_preview"),
            "domain": domain,
            "status": "todo",
            "priority": priority,
            "due_date": (payload.due_at or item.get("due_at") or "")[:10] or None,
            "created_at": _now(),
            "updated_at": _now(),
        }
        result = sb.table("tasks").insert(task).execute()
        task_row = result.data[0] if result.data else task
        updates.update({"status": "done", "linked_task_id": task_row["id"]})
    elif decision == "schedule":
        start_at = payload.start_at or payload.due_at or item.get("due_at")
        if not start_at:
            raise HTTPException(400, "schedule requires start_at or due_at")
        event = {
            "id": str(uuid.uuid4()),
            "user_id": user.id,
            "title": title,
            "description": payload.content or item.get("summary") or item.get("content_preview"),
            "domain": domain,
            "item_type": "event",
            "start_at": start_at,
            "end_at": payload.end_at,
            "all_day": payload.all_day,
            "is_non_movable": item.get("source_type") == "calendar",
            "priority": priority,
            "completed": False,
            "source_provider": item.get("source_provider"),
            "external_id": item.get("external_id"),
            "raw_payload": payload.metadata or item.get("metadata") or {},
            "created_at": _now(),
            "updated_at": _now(),
        }
        result = (
            sb.table("planner_items")
            .upsert(event, on_conflict="user_id,source_provider,external_id")
            .execute()
        )
        event_row = result.data[0] if result.data else event
        updates.update({"status": "scheduled", "linked_planner_item_id": event_row["id"]})
    elif decision == "remember":
        note = {
            "id": str(uuid.uuid4()),
            "user_id": user.id,
            "title": title,
            "content": payload.content or item.get("summary") or item.get("content_preview"),
            "item_type": "note",
            "domain": domain,
            "para_area": "resources",
            "status": "active",
            "source_name": item.get("source_provider"),
            "tags": ["life-inbox"],
            "importance": 3,
            "confidence": 3,
            "captured_at": _now(),
        }
        result = sb.table("knowledge_items").insert(note).execute()
        note_row = result.data[0] if result.data else note
        updates.update({"status": "done", "linked_knowledge_item_id": note_row["id"]})
    elif decision == "archive":
        updates["status"] = "archived"
    elif decision == "snooze":
        if not payload.snoozed_until:
            raise HTTPException(400, "snooze requires snoozed_until")
        updates.update({"status": "snoozed", "snoozed_until": payload.snoozed_until})

    result = sb.table("life_items").update(updates).eq("id", item_id).eq("user_id", user.id).execute()
    return result.data[0] if result.data else {**item, **updates}


@router.get("/integrations/status")
async def integration_status(user: User = Depends(get_current_user)):
    sb = get_supabase()
    integrations = sb.table("integrations").select("id,provider,status,scopes,last_synced_at,metadata").eq("user_id", user.id).execute().data or []
    logs = sb.table("sync_logs").select("sync_type,status,items_synced,error_message,started_at,finished_at").eq("user_id", user.id).order("started_at", desc=True).limit(10).execute().data or []
    return {
        "integrations": integrations,
        "sync_logs": logs,
        "available": {
            "google": {
                "capabilities": ["email", "calendar"],
                "scopes": GOOGLE_SCOPES,
                "privacy_note": "LifeOS stores only metadata/snippets needed for triage, not full mailbox history.",
            }
        },
    }


@router.get("/integrations/google/connect")
async def google_connect(user: User = Depends(get_current_user)):
    client_id = getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "")
    redirect_uri = getattr(settings, "GOOGLE_OAUTH_REDIRECT_URI", "")
    if not client_id or not redirect_uri:
        return {
            "status": "config_missing",
            "message": "Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_REDIRECT_URI to enable Google OAuth.",
            "scopes": GOOGLE_SCOPES,
        }
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": " ".join(GOOGLE_SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "state": user.id,
        "include_granted_scopes": "true",
    }
    return {
        "status": "ready",
        "provider": "google",
        "auth_url": f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}",
        "scopes": GOOGLE_SCOPES,
    }


@router.post("/integrations/register", status_code=201)
async def register_integration(payload: IntegrationRegister, user: User = Depends(get_current_user)):
    sb = get_supabase()
    row = {
        "id": str(uuid.uuid4()),
        "user_id": user.id,
        "provider": payload.provider,
        "status": payload.status,
        "scopes": payload.scopes,
        "metadata": payload.metadata,
        "created_at": _now(),
    }
    result = sb.table("integrations").upsert(row, on_conflict="user_id,provider").execute()
    return result.data[0] if result.data else row


@router.post("/integrations/email/ingest")
async def ingest_email(payload: EmailIngest, user: User = Depends(get_current_user)):
    sb = get_supabase()
    count = 0
    for message in payload.messages:
        life_row = _life_row(
            LifeCapture(
                title=message.subject,
                summary=message.snippet,
                content_preview=message.snippet,
                source_type="email",
                source_provider=message.provider,
                external_id=message.external_id,
                item_kind="capture",
                priority=message.priority,
                metadata={
                    "from_email": message.from_email,
                    "received_at": message.received_at,
                    "labels": message.labels,
                },
            ),
            user.id,
        )
        _upsert_life_item(sb, life_row)
        _safe_insert(
            sb,
            "inbox_items",
            {
                "id": str(uuid.uuid4()),
                "user_id": user.id,
                "source": "gmail" if message.provider == "gmail" else "outlook",
                "external_id": message.external_id,
                "subject": message.subject,
                "snippet": message.snippet,
                "category": "unknown",
                "priority": message.priority,
                "is_read": False,
                "created_at": _now(),
            },
        )
        count += 1
    return {"ingested": count, "source": "email"}


@router.post("/integrations/calendar/ingest")
async def ingest_calendar(payload: CalendarIngest, user: User = Depends(get_current_user)):
    sb = get_supabase()
    count = 0
    for event in payload.events:
        planner_row = {
            "id": str(uuid.uuid4()),
            "user_id": user.id,
            "title": event.title,
            "description": event.description,
            "item_type": "event",
            "start_at": event.start_at,
            "end_at": event.end_at,
            "all_day": event.all_day,
            "is_non_movable": True,
            "priority": "medium",
            "completed": False,
            "source_provider": event.provider,
            "external_id": event.external_id,
            "external_url": event.html_link,
            "raw_payload": {**event.raw, "location": event.location},
            "created_at": _now(),
            "updated_at": _now(),
        }
        result = (
            sb.table("planner_items")
            .upsert(planner_row, on_conflict="user_id,source_provider,external_id")
            .execute()
        )
        planner_item = result.data[0] if result.data else planner_row
        life_row = _life_row(
            LifeCapture(
                title=event.title,
                summary=event.description,
                source_type="calendar",
                source_provider=event.provider,
                external_id=event.external_id,
                item_kind="event",
                priority="medium",
                due_at=event.start_at,
                metadata={"location": event.location, "html_link": event.html_link},
            ),
            user.id,
        )
        life_row["status"] = "scheduled"
        life_row["linked_planner_item_id"] = planner_item["id"]
        _upsert_life_item(sb, life_row)
        count += 1
    return {"ingested": count, "source": "calendar"}
