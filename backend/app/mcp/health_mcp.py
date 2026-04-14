"""
Health MCP sidecar — internal only, never exposed externally.
Wraps health data queries for use by the health domain agent.
All data stays local (Tier 3).
"""
from __future__ import annotations
from typing import Any


async def get_health_context(user_id: str, supabase) -> dict[str, Any]:
    """Fetch health entries, goals, and habits for context building."""
    try:
        entries = supabase.table("entries").select("*").eq("user_id", user_id).eq("domain", "health").order("created_at", desc=True).limit(10).execute()
        goals = supabase.table("goals").select("*").eq("user_id", user_id).eq("domain", "health").eq("status", "active").limit(5).execute()
        habits = supabase.table("habits").select("*").eq("user_id", user_id).eq("domain", "health").limit(5).execute()
        return {
            "entries": entries.data or [],
            "goals": goals.data or [],
            "habits": habits.data or [],
        }
    except Exception:
        return {"entries": [], "goals": [], "habits": []}
