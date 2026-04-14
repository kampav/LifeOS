"""
Finance MCP sidecar — internal only, never exposed externally.
Wraps finance data queries for use by the finance domain agent.
Sensitive data stays with Ollama (Tier 2/3 routing in finance_agent.py).
"""
from __future__ import annotations
from typing import Any


async def get_finance_context(user_id: str, supabase) -> dict[str, Any]:
    """Fetch finance entries and goals for context building (no raw account data)."""
    try:
        entries = supabase.table("entries").select("title,value,note,created_at").eq("user_id", user_id).eq("domain", "finance").order("created_at", desc=True).limit(10).execute()
        goals = supabase.table("goals").select("title,target_value,current_value,status").eq("user_id", user_id).eq("domain", "finance").eq("status", "active").limit(5).execute()
        return {
            "entries": entries.data or [],
            "goals": goals.data or [],
        }
    except Exception:
        return {"entries": [], "goals": []}
