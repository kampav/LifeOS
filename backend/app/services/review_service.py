"""Daily brief and weekly review generation."""
from app.services.ai_service import call_claude
from app.memory.compressor import build_full_context, build_domain_context
from app.memory.mem0_client import get_memories, store_memory
from app.db.client import get_supabase
from app.observability.logging import get_logger
from datetime import datetime, timezone

log = get_logger()

DAILY_BRIEF_PROMPT = """Generate a concise daily brief (max 200 words):
1. Yesterday's wins (2-3 bullet points from data)
2. Today's top 3 priorities
3. One specific coaching nudge based on patterns

Be direct, warm, specific to this user's data. No fluff."""

WEEKLY_REVIEW_PROMPT = """Generate a comprehensive weekly review. Structure:
## This Week's Wins
## Progress on Goals
## Health & Energy Patterns
## Relationships & Connections
## What Needs Attention
## One Key Insight
## Your Focus for Next Week

Be specific, data-driven, encouraging. Max 600 words. Mention actual numbers and trends."""


async def generate_daily_brief(user_id: str) -> str:
    context = await build_full_context(user_id, domains=["health", "family", "goals", "habits"])
    memories = await get_memories(user_id, "daily brief highlights wins priorities")
    prompt = f"USER CONTEXT:\n{context}\n\nMEMORIES:\n{memories}\n\nTASK: {DAILY_BRIEF_PROMPT}"
    content, _, _ = await call_claude("claude-haiku-4-5-20251001", DAILY_BRIEF_PROMPT, [{"role": "user", "content": prompt}], max_tokens=400)
    log.info("daily_brief_generated", user_id=user_id)
    return content


async def generate_weekly_review(user_id: str) -> dict:
    """Single LLM call for full weekly review. ~3000 token budget."""
    context = await build_full_context(user_id)
    memories = await get_memories(user_id, "weekly review themes patterns", limit=5)
    prompt = f"USER CONTEXT:\n{context}\n\nMEMORIES:\n{memories}\n\nTASK: {WEEKLY_REVIEW_PROMPT}"
    content, _, _ = await call_claude("claude-sonnet-4-5", WEEKLY_REVIEW_PROMPT, [{"role": "user", "content": prompt}], max_tokens=1200)

    # Store key insights in Mem0
    await store_memory(user_id, f"Weekly review {datetime.now().strftime('%Y-%m-%d')}: {content[:300]}")

    # Save as notification
    sb = get_supabase()
    sb.table("notifications").insert({
        "user_id": user_id,
        "type": "review_ready",
        "title": f"Weekly Review — {datetime.now().strftime('%B %d')}",
        "body": content[:500],
        "action_url": "/review",
    }).execute()

    log.info("weekly_review_generated", user_id=user_id)
    return {"review": content, "generated_at": datetime.now(timezone.utc).isoformat()}
