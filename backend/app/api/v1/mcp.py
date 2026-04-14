"""
MCP token management + tool listing API.
GET    /mcp/tokens
POST   /mcp/tokens
DELETE /mcp/tokens/{id}
GET    /mcp/tools
GET    /mcp/server-config
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
import uuid
import secrets
from datetime import datetime, timezone

from app.security.auth import get_current_user, User
from app.db.client import get_supabase
from app.mcp.lifeos_server import TOOLS, get_server_config

router = APIRouter(prefix="/mcp", tags=["mcp"])


class TokenCreate(BaseModel):
    name: str
    scopes: list[str] = ["read", "write"]


@router.get("/tokens")
async def list_tokens(user: User = Depends(get_current_user)):
    sb = get_supabase()
    result = sb.table("mcp_tokens").select("id,name,scopes,created_at,last_used_at").eq("user_id", user.id).execute()
    return result.data or []


@router.post("/tokens", status_code=201)
async def create_token(payload: TokenCreate, user: User = Depends(get_current_user)):
    sb = get_supabase()
    token = secrets.token_urlsafe(32)
    row = {
        "id": str(uuid.uuid4()),
        "user_id": user.id,
        "name": payload.name,
        "scopes": payload.scopes,
        "token_hash": token,  # In prod: store hash, return plaintext once
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    sb.table("mcp_tokens").insert(row).execute()
    return {"id": row["id"], "name": payload.name, "token": token, "scopes": payload.scopes}


@router.delete("/tokens/{token_id}", status_code=204)
async def delete_token(token_id: str, user: User = Depends(get_current_user)):
    sb = get_supabase()
    result = sb.table("mcp_tokens").delete().eq("id", token_id).eq("user_id", user.id).execute()
    if not result.data:
        raise HTTPException(404, "Token not found")


@router.get("/tools")
async def list_tools(user: User = Depends(get_current_user)):
    return {"tools": TOOLS}


@router.get("/server-config")
async def server_config(user: User = Depends(get_current_user)):
    """Returns the claude_desktop_config.json snippet to add Life OS as an MCP server."""
    return get_server_config()
