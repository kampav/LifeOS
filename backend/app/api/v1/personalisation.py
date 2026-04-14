"""
Personalisation API — user coach style, domain weights, accent colour.
GET/PATCH /users/me/personalisation
POST      /users/me/personalisation/reset
GET       /users/me/personalisation/learning
POST      /users/me/personalisation/undo
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Any
from app.security.auth import get_current_user, User
from app.db.client import get_supabase

router = APIRouter(prefix="/users/me/personalisation", tags=["personalisation"])

DEFAULTS = {
    "coach_tone": 2,
    "detail_level": 3,
    "domain_weights": {
        "health": 5, "finance": 5, "family": 5, "social": 5, "career": 5,
        "growth": 5, "property": 5, "holiday": 5, "community": 5, "education": 5,
    },
    "alert_cadence": "normal",
    "accent_colour": "#6366F1",
    "layout_density": "comfortable",
    "font_size": "medium",
}


class PersonalisationUpdate(BaseModel):
    coach_tone: Optional[int] = Field(None, ge=1, le=5)
    detail_level: Optional[int] = Field(None, ge=1, le=5)
    domain_weights: Optional[dict[str, int]] = None
    alert_cadence: Optional[str] = None
    accent_colour: Optional[str] = None
    layout_density: Optional[str] = None
    font_size: Optional[str] = None


def _get_or_create_prefs(user_id: str, sb) -> dict:
    result = sb.table("user_personalisation").select("*").eq("user_id", user_id).single().execute()
    if result.data:
        return result.data
    # Auto-create with defaults
    row = {"user_id": user_id, **DEFAULTS}
    sb.table("user_personalisation").insert(row).execute()
    return row


@router.get("")
async def get_personalisation(user: User = Depends(get_current_user)):
    sb = get_supabase()
    return _get_or_create_prefs(user.id, sb)


@router.patch("")
async def update_personalisation(payload: PersonalisationUpdate, user: User = Depends(get_current_user)):
    sb = get_supabase()
    prefs = _get_or_create_prefs(user.id, sb)
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        return prefs
    # Save snapshot to undo stack (last 5)
    undo_stack = prefs.get("undo_stack", [])
    undo_stack.append({k: prefs.get(k) for k in updates})
    updates["undo_stack"] = undo_stack[-5:]
    result = sb.table("user_personalisation").update(updates).eq("user_id", user.id).execute()
    return result.data[0] if result.data else prefs


@router.post("/reset")
async def reset_personalisation(user: User = Depends(get_current_user)):
    sb = get_supabase()
    row = {"user_id": user.id, **DEFAULTS, "undo_stack": []}
    sb.table("user_personalisation").upsert(row).execute()
    return row


@router.get("/learning")
async def get_learning_insights(user: User = Depends(get_current_user)):
    """Return AI-derived insights about user patterns (placeholder for v1.2 ML)."""
    sb = get_supabase()
    prefs = _get_or_create_prefs(user.id, sb)
    return {
        "most_engaged_domain": max(
            prefs.get("domain_weights", DEFAULTS["domain_weights"]),
            key=lambda d: prefs.get("domain_weights", DEFAULTS["domain_weights"]).get(d, 5),
        ),
        "suggested_tone": prefs.get("coach_tone", 2),
        "insights": [],
    }


@router.post("/undo")
async def undo_personalisation(user: User = Depends(get_current_user)):
    sb = get_supabase()
    prefs = _get_or_create_prefs(user.id, sb)
    undo_stack = prefs.get("undo_stack", [])
    if not undo_stack:
        raise HTTPException(400, "Nothing to undo")
    prev = undo_stack.pop()
    prev["undo_stack"] = undo_stack
    result = sb.table("user_personalisation").update(prev).eq("user_id", user.id).execute()
    return result.data[0] if result.data else prev
