from __future__ import annotations
from app.agents.context import build_system_prompt
from app.models.conversation import CoachResponse, CoachSection


async def run_family_agent(message: str, context: str, prefs: dict, conv_history: list[dict]) -> CoachResponse:
    from app.services.ai_service import ai_complete
    system = build_system_prompt("family", prefs)
    messages = [{"role": m["role"], "content": m["content"]} for m in conv_history[-4:]]
    messages.append({"role": "user", "content": f"CONTEXT:\n{context}\n\nUSER: {message}"})
    response, model_used = await ai_complete("quick_response", messages, system=system, domain="family", max_tokens=400)
    return CoachResponse(sections=[CoachSection(type="insight", content=response)], domain="family", model_used=model_used)
