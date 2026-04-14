"""
MCP client builder — constructs list of MCP servers for a user
based on their active integrations. Only attaches servers the user
has explicitly authorised.
"""
from __future__ import annotations
from typing import Any
from app.config import settings


def build_mcp_servers(user_id: str, active_integrations: list[str]) -> list[dict[str, Any]]:
    """
    Return MCP server configs to attach to an agent based on user integrations.
    active_integrations: list of integration slugs e.g. ["google", "notion"]
    """
    servers = []

    if "google" in active_integrations:
        # Google Workspace MCP — Calendar + Gmail read access
        servers.append({
            "type": "google_workspace",
            "user_id": user_id,
            "scopes": ["calendar.readonly", "gmail.readonly"],
            "tools": ["gcal_list_events", "gcal_create_event", "gmail_search_threads"],
        })
        # Gmail inbox triage sidecar
        servers.append({
            "type": "gmail_triage",
            "user_id": user_id,
            "scopes": ["gmail.readonly"],
        })

    if settings.MEM0_MCP_URL:
        servers.append({
            "type": "mem0",
            "url": settings.MEM0_MCP_URL,
            "user_id": user_id,
        })

    return servers


async def get_user_integrations(user_id: str, supabase) -> list[str]:
    """Fetch the user's active integration slugs from the DB."""
    try:
        result = supabase.table("integrations").select("provider").eq("user_id", user_id).eq("status", "active").execute()
        return [r["provider"] for r in (result.data or [])]
    except Exception:
        return []
