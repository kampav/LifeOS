from pydantic import BaseModel
from typing import Literal, Optional
from datetime import date, datetime


class HabitCreate(BaseModel):
    domain: str
    name: str
    description: Optional[str] = None
    frequency: str = "daily"
    target_time: Optional[Literal["morning", "afternoon", "evening", "anytime"]] = "anytime"


class HabitUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    frequency: Optional[str] = None
    target_time: Optional[str] = None
    is_active: Optional[bool] = None


class HabitLogCreate(BaseModel):
    completed: bool
    notes: Optional[str] = None
    logged_date: Optional[date] = None  # defaults to today


class HabitResponse(BaseModel):
    id: str
    user_id: str
    domain: str
    name: str
    description: Optional[str]
    frequency: str
    target_time: Optional[str]
    current_streak: int
    longest_streak: int
    is_active: bool
    created_at: datetime


class HabitLogResponse(BaseModel):
    id: str
    habit_id: str
    logged_date: date
    completed: bool
    notes: Optional[str]
