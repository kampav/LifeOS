from pydantic import BaseModel
from typing import Optional
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


class ConversationResponse(BaseModel):
    id: str
    domain: Optional[str]
    title: Optional[str]
    messages: list[dict]
    model_used: Optional[str]
    tokens_used: Optional[int]
    created_at: datetime
    updated_at: datetime
