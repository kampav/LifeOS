from pydantic import BaseModel
from typing import Literal, Optional
from datetime import date, datetime

GOAL_TYPES = Literal["outcome", "habit", "project", "learning"]
GOAL_STATUS = Literal["active", "completed", "paused", "abandoned"]


class GoalCreate(BaseModel):
    domain: str
    title: str
    description: Optional[str] = None
    goal_type: GOAL_TYPES = "outcome"
    target_value: Optional[float] = None
    unit: Optional[str] = None
    start_date: Optional[date] = None
    target_date: Optional[date] = None


class GoalProgressUpdate(BaseModel):
    current_value: float


class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[GOAL_STATUS] = None
    target_value: Optional[float] = None
    target_date: Optional[date] = None


class GoalResponse(BaseModel):
    id: str
    user_id: str
    domain: str
    title: str
    description: Optional[str]
    goal_type: str
    target_value: Optional[float]
    current_value: float
    unit: Optional[str]
    start_date: Optional[date]
    target_date: Optional[date]
    status: str
    created_at: datetime
