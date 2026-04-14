"""
Life OS MCP Server — exposes 5 tools to Claude Desktop and other MCP clients.
Auth: LIFE_OS_API_TOKEN header.
Run: python -m app.mcp.lifeos_server
"""
from __future__ import annotations
import json
import asyncio
from typing import Any
from app.config import settings


async def _api_call(method: str, path: str, payload: dict | None = None) -> dict:
    """Internal HTTP call to the Life OS FastAPI backend."""
    import httpx
    base = f"http://localhost:8080/api/v1"
    headers = {"Authorization": f"Bearer {settings.LIFE_OS_API_TOKEN}"}
    async with httpx.AsyncClient(timeout=30) as client:
        if method == "GET":
            r = await client.get(f"{base}{path}", headers=headers)
        elif method == "POST":
            r = await client.post(f"{base}{path}", json=payload, headers=headers)
        else:
            raise ValueError(f"Unsupported method: {method}")
    r.raise_for_status()
    return r.json()


# ── MCP tool definitions ──────────────────────────────────────────────────────

TOOLS = [
    {
        "name": "get_life_summary",
        "description": "Get the user's current Life Score, domain scores, and top 3 active goals.",
        "inputSchema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "create_task",
        "description": "Create a new task in Life OS.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "domain": {"type": "string"},
                "due_date": {"type": "string", "description": "ISO date string"},
                "priority": {"type": "string", "enum": ["low", "medium", "high", "critical"]},
            },
            "required": ["title"],
        },
    },
    {
        "name": "get_upcoming_dates",
        "description": "Get important dates and events in the next N days.",
        "inputSchema": {
            "type": "object",
            "properties": {"days": {"type": "integer", "default": 14}},
            "required": [],
        },
    },
    {
        "name": "log_entry",
        "description": "Log a life entry for a specific domain (health, finance, etc.).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "domain": {"type": "string"},
                "title": {"type": "string"},
                "value": {"type": "number"},
                "note": {"type": "string"},
            },
            "required": ["domain", "title"],
        },
    },
    {
        "name": "ask_coach",
        "description": "Ask the Life OS AI coach a question about your life data.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "message": {"type": "string"},
                "domain": {"type": "string"},
            },
            "required": ["message"],
        },
    },
]


async def handle_tool_call(tool_name: str, arguments: dict) -> str:
    """Execute a tool call and return the result as a string."""
    try:
        if tool_name == "get_life_summary":
            data = await _api_call("GET", "/scores/all")
            return json.dumps(data, indent=2)

        elif tool_name == "create_task":
            data = await _api_call("POST", "/tasks", arguments)
            return json.dumps({"created": True, "task": data}, indent=2)

        elif tool_name == "get_upcoming_dates":
            days = arguments.get("days", 14)
            data = await _api_call("GET", f"/planner/agenda?days={days}")
            return json.dumps(data, indent=2)

        elif tool_name == "log_entry":
            data = await _api_call("POST", "/entries", arguments)
            return json.dumps({"logged": True, "entry": data}, indent=2)

        elif tool_name == "ask_coach":
            payload = {"message": arguments["message"], "domain": arguments.get("domain")}
            data = await _api_call("POST", "/ai/chat", payload)
            return data.get("message", "No response")

        else:
            return f"Unknown tool: {tool_name}"

    except Exception as e:
        return f"Error: {e}"


def get_server_config() -> dict:
    """Return claude_desktop_config.json snippet for this MCP server."""
    return {
        "life-os": {
            "command": "python",
            "args": ["-m", "app.mcp.lifeos_server"],
            "env": {
                "LIFE_OS_API_TOKEN": "<your-api-token>",
                "SUPABASE_URL": "<your-supabase-url>",
                "SUPABASE_SERVICE_KEY": "<your-service-key>",
            },
        }
    }
