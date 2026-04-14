"""
Audit logging for write operations (PRD §6.4).
Writes to audit_log table asynchronously — never blocks the request.
"""
from app.db.client import get_supabase
from app.observability.logging import get_logger
import asyncio

log = get_logger()

WRITE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

# Map URL path prefixes → resource type
RESOURCE_MAP = {
    "/api/v1/entries": "entry",
    "/api/v1/goals": "goal",
    "/api/v1/habits": "habit",
    "/api/v1/social/contacts": "contact",
    "/api/v1/ai/chat": "conversation",
    "/api/v1/notifications": "notification",
    "/api/v1/users": "profile",
    "/api/v1/profile": "profile",
}


def _resource_type(path: str) -> str:
    for prefix, rtype in RESOURCE_MAP.items():
        if path.startswith(prefix):
            return rtype
    return "unknown"


async def write_audit(
    user_id: str,
    action: str,
    resource_type: str,
    resource_id: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    changes: dict | None = None,
) -> None:
    """Fire-and-forget audit write. Fails silently to never block requests."""
    try:
        sb = get_supabase()
        sb.table("audit_log").insert({
            "user_id": user_id,
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "changes": changes,
        }).execute()
    except Exception as e:
        log.warning("audit_write_failed", error=str(e))


async def audit_request(request, user_id: str) -> None:
    """Called from route handlers for write operations."""
    method = request.method
    if method not in WRITE_METHODS:
        return
    action = {"POST": "create", "PUT": "update", "PATCH": "update", "DELETE": "delete"}[method]
    resource_type = _resource_type(request.url.path)
    ip = request.headers.get("x-forwarded-for", request.client.host if request.client else None)
    ua = request.headers.get("user-agent")
    # Schedule as background task so it never delays the response
    asyncio.create_task(write_audit(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        ip_address=ip,
        user_agent=ua,
    ))
