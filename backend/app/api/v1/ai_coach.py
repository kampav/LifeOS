from fastapi import APIRouter, Depends, HTTPException
from app.security.auth import get_current_user, User
from app.security.rate_limiter import check_rate_limit
from app.models.conversation import ChatRequest, ChatResponse, ConversationResponse
from app.db.client import get_supabase
from app.services.ai_service import ai_complete, LIFE_COACH_SYSTEM
from app.memory.compressor import build_domain_context, build_full_context
from app.memory.mem0_client import get_memories, store_memory
from app.observability.logging import get_logger
from app.agents.context import detect_domain
from app.agents.supervisor import run_supervisor
from datetime import datetime, timezone
import uuid
import json

router = APIRouter(prefix="/ai", tags=["ai-coach"])
log = get_logger()


def _get_personalisation(user_id: str, sb) -> dict:
    """Fetch user personalisation prefs; return defaults on any error."""
    try:
        result = sb.table("user_personalisation").select("*").eq("user_id", user_id).single().execute()
        return result.data or {}
    except Exception:
        return {}


@router.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest, user: User = Depends(get_current_user)):
    await check_rate_limit(user.id, user.tier, "ai_messages")
    sb = get_supabase()

    # Get or create conversation
    conv_id = payload.conversation_id
    if conv_id:
        conv_result = sb.table("conversations").select("*").eq("id", conv_id).eq("user_id", user.id).single().execute()
        if not conv_result.data:
            raise HTTPException(404, "Conversation not found")
        messages = conv_result.data.get("messages", [])
    else:
        conv_id = str(uuid.uuid4())
        messages = []

    # Build context (Karpathy compression)
    domain = payload.domain
    if domain:
        context = await build_domain_context(user.id, domain)
    else:
        context = await build_full_context(user.id)

    memories = await get_memories(user.id, payload.message)
    full_context = f"{context}\n\nMEMORIES:\n{memories}"

    messages.append({"role": "user", "content": payload.message, "timestamp": datetime.now(timezone.utc).isoformat()})

    # Detect domain + fetch personalisation prefs
    last_3 = [m["content"] for m in messages[-4:-1] if m.get("role") == "user"]
    active_domain = domain or detect_domain(payload.message, last_3)
    prefs = _get_personalisation(user.id, sb)

    # Route through supervisor (multi-agent orchestration)
    coach_response = await run_supervisor(
        user_id=user.id,
        message=payload.message,
        domain=active_domain,
        conv_history=messages[:-1],   # exclude the message we just appended
        context=full_context,
        prefs=prefs,
    )

    # Serialise CoachResponse as JSON string (backwards-compatible — frontend parses if JSON)
    response_text = coach_response.model_dump_json()
    model_used = coach_response.model_used or "claude-sonnet-4-6"

    messages.append({"role": "assistant", "content": response_text, "timestamp": datetime.now(timezone.utc).isoformat()})

    # Save conversation
    conv_data = {
        "id": conv_id,
        "user_id": user.id,
        "domain": active_domain,
        "title": payload.message[:60] if not payload.conversation_id else None,
        "messages": messages,
        "model_used": model_used,
        "tokens_used": len(str(messages)),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    sb.table("conversations").upsert(conv_data).execute()

    # Store insight in Mem0
    summary = coach_response.sections[0].content[:200] if coach_response.sections else ""
    await store_memory(user.id, f"User asked about {active_domain}: {payload.message[:100]}. Key insight: {summary}")

    log.info("ai_chat", user_id=user.id, domain=active_domain, model=model_used)
    return ChatResponse(conversation_id=conv_id, message=response_text, model_used=model_used, domain=active_domain)


@router.get("/conversations", response_model=list[ConversationResponse])
async def list_conversations(limit: int = 20, user: User = Depends(get_current_user)):
    sb = get_supabase()
    result = sb.table("conversations").select("*").eq("user_id", user.id).order("updated_at", desc=True).limit(limit).execute()
    return result.data


@router.get("/conversations/{conv_id}", response_model=ConversationResponse)
async def get_conversation(conv_id: str, user: User = Depends(get_current_user)):
    sb = get_supabase()
    result = sb.table("conversations").select("*").eq("id", conv_id).eq("user_id", user.id).single().execute()
    if not result.data:
        raise HTTPException(404, "Conversation not found")
    return result.data


@router.get("/daily-brief")
async def daily_brief(user: User = Depends(get_current_user)):
    from app.services.review_service import generate_daily_brief
    brief = await generate_daily_brief(user.id)
    return {"brief": brief, "generated_at": datetime.now(timezone.utc).isoformat()}


@router.post("/weekly-review")
async def trigger_weekly_review(user: User = Depends(get_current_user)):
    await check_rate_limit(user.id, user.tier, "ai_reviews")
    from app.services.review_service import generate_weekly_review
    review = await generate_weekly_review(user.id)
    return review


@router.get("/memory")
async def get_ai_memory(user: User = Depends(get_current_user)):
    from app.memory.mem0_client import get_mem0
    try:
        mem0 = get_mem0()
        memories = mem0.get_all(user_id=user.id)
        return {"memories": memories}
    except Exception:
        return {"memories": []}


@router.delete("/memory/{memory_id}", status_code=204)
async def delete_memory(memory_id: str, user: User = Depends(get_current_user)):
    from app.memory.mem0_client import get_mem0
    try:
        get_mem0().delete(memory_id)
    except Exception:
        pass
