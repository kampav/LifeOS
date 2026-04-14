from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    domain: Optional[str] = None
    conversation_id: Optional[str] = None


class ChatResponse(BaseModel):
    conversation_id: str
    message: str
    model_used: str
    domain: Optional[str]


# ── Structured coach response (PRD §4.4) ────────────────────────────────────

class MetricTile(BaseModel):
    label: str
    value: str
    trend: Optional[str] = None   # "up" | "down" | "flat"
    unit: Optional[str] = None


class CoachSection(BaseModel):
    type: str   # "insight" | "data" | "list" | "question" | "warning" | "success"
    title: Optional[str] = None
    content: str
    items: Optional[list[str]] = None
    metrics: Optional[list[MetricTile]] = None


class QuickAction(BaseModel):
    label: str
    action: str   # "create_task" | "log_entry" | "open_page" | etc.
    payload: Optional[dict[str, Any]] = None


class CoachResponse(BaseModel):
    sections: list[CoachSection]
    quick_actions: Optional[list[QuickAction]] = None
    created_items: Optional[list[dict[str, Any]]] = None   # tasks/goals created this turn
    domain: Optional[str] = None
    model_used: Optional[str] = None


class ConversationResponse(BaseModel):
    id: str
    domain: Optional[str]
    title: Optional[str]
    messages: list[dict]
    model_used: Optional[str]
    tokens_used: Optional[int]
    created_at: datetime
    updated_at: datetime
