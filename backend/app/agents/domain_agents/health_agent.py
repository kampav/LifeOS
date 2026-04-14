"""
Health domain agent — Tier 3: always uses local Ollama, never cloud.
"""
from __future__ import annotations
import json
from typing import Any
from app.agents.context import build_system_prompt, EXPERTISE_BLOCKS
from app.models.conversation import CoachResponse, CoachSection


async def run_health_agent(
    message: str,
    context: str,
    prefs: dict,
    conv_history: list[dict],
) -> CoachResponse:
    """Route to Ollama llama3.2 — health data never leaves the local model."""
    from app.services.ai_service import ai_complete

    system = build_system_prompt("health", prefs)
    messages = [{"role": m["role"], "content": m["content"]} for m in conv_history[-4:]]
    messages.append({"role": "user", "content": f"CONTEXT:\n{context}\n\nUSER: {message}"})

    # Tier 3: force ollama
    response, model_used = await ai_complete(
        "health_sensitive", messages, system=system, domain="health", max_tokens=400
    )

    return CoachResponse(
        sections=[CoachSection(type="insight", content=response)],
        domain="health",
        model_used=model_used,
    )
