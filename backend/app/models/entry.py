from pydantic import BaseModel, field_validator
from typing import Literal, Optional
from datetime import datetime
from app.security.sanitisation import strip_html, sanitise_dict

DOMAINS = Literal["health", "family", "education", "social", "finance", "career", "growth", "property", "holiday", "community"]
ENTRY_TYPES = Literal["metric", "note", "event", "habit_check", "mood"]


class EntryCreate(BaseModel):
    domain: DOMAINS
    entry_type: ENTRY_TYPES
    title: Optional[str] = None
    value: Optional[float] = None
    unit: Optional[str] = None
    notes: Optional[str] = None
    data: Optional[dict] = None
    logged_at: Optional[datetime] = None

    @field_validator("notes")
    @classmethod
    def clean_notes(cls, v):
        return strip_html(v)

    @field_validator("title")
    @classmethod
    def clean_title(cls, v):
        if v:
            return strip_html(v)[:200]
        return v

    @field_validator("data")
    @classmethod
    def clean_data(cls, v):
        return sanitise_dict(v)


class EntryUpdate(BaseModel):
    title: Optional[str] = None
    value: Optional[float] = None
    notes: Optional[str] = None
    data: Optional[dict] = None

    @field_validator("notes")
    @classmethod
    def clean_notes(cls, v):
        return strip_html(v)


class EntryResponse(BaseModel):
    id: str
    user_id: str
    domain: str
    entry_type: str
    title: Optional[str]
    value: Optional[float]
    unit: Optional[str]
    notes: Optional[str]
    data: Optional[dict]
    ai_insight: Optional[str]
    logged_at: datetime
    created_at: datetime
