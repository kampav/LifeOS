"""
Second brain, learning, decisions and life reviews.

This module gives LifeOS a knowledge layer that can be connected to
domains, goals, tasks, planner items and AI coaching.
"""
from datetime import datetime, timezone
from typing import Any, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.db.client import get_supabase
from app.security.auth import User, get_current_user

router = APIRouter(tags=["knowledge"])


class KnowledgeItemCreate(BaseModel):
    title: str
    content: Optional[str] = None
    item_type: str = "note"
    domain: Optional[str] = None
    para_area: str = "resources"
    status: str = "active"
    source_url: Optional[str] = None
    source_name: Optional[str] = None
    tags: list[str] = []
    related_goal_id: Optional[str] = None
    related_task_id: Optional[str] = None
    importance: int = Field(3, ge=1, le=5)
    confidence: int = Field(3, ge=1, le=5)


class KnowledgeItemUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    item_type: Optional[str] = None
    domain: Optional[str] = None
    para_area: Optional[str] = None
    status: Optional[str] = None
    source_url: Optional[str] = None
    source_name: Optional[str] = None
    tags: Optional[list[str]] = None
    related_goal_id: Optional[str] = None
    related_task_id: Optional[str] = None
    importance: Optional[int] = Field(None, ge=1, le=5)
    confidence: Optional[int] = Field(None, ge=1, le=5)
    last_reviewed_at: Optional[str] = None


class KnowledgeLinkCreate(BaseModel):
    to_item_id: str
    relation_type: str = "related"
    strength: int = Field(3, ge=1, le=5)
    notes: Optional[str] = None


class LearningResourceCreate(BaseModel):
    title: str
    resource_type: str = "course"
    provider: Optional[str] = None
    domain: Optional[str] = None
    status: str = "to_consume"
    url: Optional[str] = None
    notes: Optional[str] = None
    progress_percent: int = Field(0, ge=0, le=100)
    tags: list[str] = []
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    next_review_at: Optional[str] = None


class LearningResourceUpdate(BaseModel):
    title: Optional[str] = None
    resource_type: Optional[str] = None
    provider: Optional[str] = None
    domain: Optional[str] = None
    status: Optional[str] = None
    url: Optional[str] = None
    notes: Optional[str] = None
    progress_percent: Optional[int] = Field(None, ge=0, le=100)
    tags: Optional[list[str]] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    next_review_at: Optional[str] = None


class LearningSessionCreate(BaseModel):
    resource_id: Optional[str] = None
    title: str
    learned_at: Optional[str] = None
    duration_minutes: Optional[int] = None
    summary: Optional[str] = None
    takeaways: list[str] = []
    actions: list[str] = []
    confidence: int = Field(3, ge=1, le=5)


class DecisionCreate(BaseModel):
    title: str
    domain: Optional[str] = None
    decision_type: str = "personal"
    status: str = "open"
    context: Optional[str] = None
    options: list[dict[str, Any]] = []
    criteria: dict[str, Any] = {}
    decision: Optional[str] = None
    rationale: Optional[str] = None
    reversible: bool = True
    decided_at: Optional[str] = None
    review_at: Optional[str] = None
    related_goal_id: Optional[str] = None
    related_task_id: Optional[str] = None


class DecisionUpdate(BaseModel):
    title: Optional[str] = None
    domain: Optional[str] = None
    decision_type: Optional[str] = None
    status: Optional[str] = None
    context: Optional[str] = None
    options: Optional[list[dict[str, Any]]] = None
    criteria: Optional[dict[str, Any]] = None
    decision: Optional[str] = None
    rationale: Optional[str] = None
    reversible: Optional[bool] = None
    decided_at: Optional[str] = None
    review_at: Optional[str] = None
    related_goal_id: Optional[str] = None
    related_task_id: Optional[str] = None


class LifeReviewCreate(BaseModel):
    review_type: str = "weekly"
    period_start: str
    period_end: str
    status: str = "draft"
    wins: list[str] = []
    challenges: list[str] = []
    lessons: list[str] = []
    next_actions: list[str] = []
    scores: dict[str, Any] = {}
    narrative: Optional[str] = None
    completed_at: Optional[str] = None


class LifeReviewUpdate(BaseModel):
    review_type: Optional[str] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    status: Optional[str] = None
    wins: Optional[list[str]] = None
    challenges: Optional[list[str]] = None
    lessons: Optional[list[str]] = None
    next_actions: Optional[list[str]] = None
    scores: Optional[dict[str, Any]] = None
    narrative: Optional[str] = None
    completed_at: Optional[str] = None


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _row(payload: BaseModel, user_id: str) -> dict:
    data = payload.model_dump(exclude_none=True)
    data["id"] = str(uuid.uuid4())
    data["user_id"] = user_id
    return data


def _update_row(payload: BaseModel) -> dict:
    data = payload.model_dump(exclude_none=True)
    data["updated_at"] = _now()
    return data


@router.post("/knowledge", status_code=201)
async def create_knowledge_item(payload: KnowledgeItemCreate, user: User = Depends(get_current_user)):
    sb = get_supabase()
    row = _row(payload, user.id)
    row["captured_at"] = _now()
    result = sb.table("knowledge_items").insert(row).execute()
    return result.data[0] if result.data else row


@router.get("/knowledge")
async def list_knowledge_items(
    domain: Optional[str] = None,
    item_type: Optional[str] = None,
    para_area: Optional[str] = None,
    status: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = Query(50, le=200),
    user: User = Depends(get_current_user),
):
    sb = get_supabase()
    query = sb.table("knowledge_items").select("*").eq("user_id", user.id).order("captured_at", desc=True).limit(limit)
    if domain:
        query = query.eq("domain", domain)
    if item_type:
        query = query.eq("item_type", item_type)
    if para_area:
        query = query.eq("para_area", para_area)
    if status:
        query = query.eq("status", status)
    result = query.execute()
    rows = result.data or []
    if q:
        needle = q.lower()
        rows = [
            r for r in rows
            if needle in f"{r.get('title', '')} {r.get('content', '')} {' '.join(r.get('tags') or [])}".lower()
        ]
    return rows


@router.get("/knowledge/graph")
async def get_knowledge_graph(limit: int = Query(100, le=250), user: User = Depends(get_current_user)):
    sb = get_supabase()
    items = (
        sb.table("knowledge_items")
        .select("id,title,item_type,domain,para_area,importance,tags,captured_at")
        .eq("user_id", user.id)
        .neq("status", "archived")
        .order("captured_at", desc=True)
        .limit(limit)
        .execute()
        .data
        or []
    )
    links = (
        sb.table("knowledge_links")
        .select("*")
        .eq("user_id", user.id)
        .limit(limit * 2)
        .execute()
        .data
        or []
    )
    return {"items": items, "links": links}


@router.get("/knowledge/{item_id}")
async def get_knowledge_item(item_id: str, user: User = Depends(get_current_user)):
    sb = get_supabase()
    result = sb.table("knowledge_items").select("*").eq("id", item_id).eq("user_id", user.id).single().execute()
    if not result.data:
        raise HTTPException(404, "Knowledge item not found")
    return result.data


@router.put("/knowledge/{item_id}")
async def update_knowledge_item(item_id: str, payload: KnowledgeItemUpdate, user: User = Depends(get_current_user)):
    updates = _update_row(payload)
    if len(updates) == 1:
        raise HTTPException(400, "No updates provided")
    sb = get_supabase()
    result = sb.table("knowledge_items").update(updates).eq("id", item_id).eq("user_id", user.id).execute()
    if not result.data:
        raise HTTPException(404, "Knowledge item not found")
    return result.data[0]


@router.delete("/knowledge/{item_id}", status_code=204)
async def delete_knowledge_item(item_id: str, user: User = Depends(get_current_user)):
    sb = get_supabase()
    sb.table("knowledge_items").delete().eq("id", item_id).eq("user_id", user.id).execute()


@router.post("/knowledge/{item_id}/links", status_code=201)
async def link_knowledge_item(item_id: str, payload: KnowledgeLinkCreate, user: User = Depends(get_current_user)):
    sb = get_supabase()
    row = {
        "id": str(uuid.uuid4()),
        "user_id": user.id,
        "from_item_id": item_id,
        **payload.model_dump(exclude_none=True),
    }
    result = sb.table("knowledge_links").insert(row).execute()
    return result.data[0] if result.data else row


@router.post("/learning/resources", status_code=201)
async def create_learning_resource(payload: LearningResourceCreate, user: User = Depends(get_current_user)):
    sb = get_supabase()
    row = _row(payload, user.id)
    result = sb.table("learning_resources").insert(row).execute()
    return result.data[0] if result.data else row


@router.get("/learning/resources")
async def list_learning_resources(
    domain: Optional[str] = None,
    status: Optional[str] = None,
    resource_type: Optional[str] = None,
    limit: int = Query(50, le=200),
    user: User = Depends(get_current_user),
):
    sb = get_supabase()
    query = sb.table("learning_resources").select("*").eq("user_id", user.id).order("created_at", desc=True).limit(limit)
    if domain:
        query = query.eq("domain", domain)
    if status:
        query = query.eq("status", status)
    if resource_type:
        query = query.eq("resource_type", resource_type)
    return query.execute().data or []


@router.put("/learning/resources/{resource_id}")
async def update_learning_resource(resource_id: str, payload: LearningResourceUpdate, user: User = Depends(get_current_user)):
    updates = _update_row(payload)
    if len(updates) == 1:
        raise HTTPException(400, "No updates provided")
    sb = get_supabase()
    result = sb.table("learning_resources").update(updates).eq("id", resource_id).eq("user_id", user.id).execute()
    if not result.data:
        raise HTTPException(404, "Learning resource not found")
    return result.data[0]


@router.post("/learning/sessions", status_code=201)
async def create_learning_session(payload: LearningSessionCreate, user: User = Depends(get_current_user)):
    sb = get_supabase()
    row = _row(payload, user.id)
    row["learned_at"] = row.get("learned_at") or _now()
    result = sb.table("learning_sessions").insert(row).execute()
    return result.data[0] if result.data else row


@router.get("/learning/review-queue")
async def get_learning_review_queue(limit: int = Query(25, le=100), user: User = Depends(get_current_user)):
    sb = get_supabase()
    return (
        sb.table("learning_resources")
        .select("*")
        .eq("user_id", user.id)
        .neq("status", "archived")
        .order("next_review_at")
        .limit(limit)
        .execute()
        .data
        or []
    )


@router.post("/decisions", status_code=201)
async def create_decision(payload: DecisionCreate, user: User = Depends(get_current_user)):
    sb = get_supabase()
    row = _row(payload, user.id)
    result = sb.table("decision_records").insert(row).execute()
    return result.data[0] if result.data else row


@router.get("/decisions")
async def list_decisions(
    domain: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(50, le=200),
    user: User = Depends(get_current_user),
):
    sb = get_supabase()
    query = sb.table("decision_records").select("*").eq("user_id", user.id).order("created_at", desc=True).limit(limit)
    if domain:
        query = query.eq("domain", domain)
    if status:
        query = query.eq("status", status)
    return query.execute().data or []


@router.put("/decisions/{decision_id}")
async def update_decision(decision_id: str, payload: DecisionUpdate, user: User = Depends(get_current_user)):
    updates = _update_row(payload)
    if len(updates) == 1:
        raise HTTPException(400, "No updates provided")
    sb = get_supabase()
    result = sb.table("decision_records").update(updates).eq("id", decision_id).eq("user_id", user.id).execute()
    if not result.data:
        raise HTTPException(404, "Decision not found")
    return result.data[0]


@router.post("/life-reviews", status_code=201)
async def create_life_review(payload: LifeReviewCreate, user: User = Depends(get_current_user)):
    sb = get_supabase()
    row = _row(payload, user.id)
    result = sb.table("life_reviews").insert(row).execute()
    return result.data[0] if result.data else row


@router.get("/life-reviews")
async def list_life_reviews(
    review_type: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(25, le=100),
    user: User = Depends(get_current_user),
):
    sb = get_supabase()
    query = sb.table("life_reviews").select("*").eq("user_id", user.id).order("period_start", desc=True).limit(limit)
    if review_type:
        query = query.eq("review_type", review_type)
    if status:
        query = query.eq("status", status)
    return query.execute().data or []


@router.put("/life-reviews/{review_id}")
async def update_life_review(review_id: str, payload: LifeReviewUpdate, user: User = Depends(get_current_user)):
    updates = _update_row(payload)
    if len(updates) == 1:
        raise HTTPException(400, "No updates provided")
    sb = get_supabase()
    result = sb.table("life_reviews").update(updates).eq("id", review_id).eq("user_id", user.id).execute()
    if not result.data:
        raise HTTPException(404, "Life review not found")
    return result.data[0]
