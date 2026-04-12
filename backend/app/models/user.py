from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class ProfileCreate(BaseModel):
    name: str
    age: Optional[int] = None
    timezone: str = "UTC"
    life_stage: Optional[str] = None
    declared_priorities: list[str] = []


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    timezone: Optional[str] = None
    life_stage: Optional[str] = None
    declared_priorities: Optional[list[str]] = None


class ProfileResponse(BaseModel):
    id: str
    name: str
    age: Optional[int]
    timezone: str
    life_stage: Optional[str]
    declared_priorities: list[str]
    onboarding_completed: bool
    subscription_tier: str
    created_at: datetime
