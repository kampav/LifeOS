"""
Supervisor agent — orchestrates domain agents, enforces token budgets.
Uses Claude Sonnet for synthesis; delegates to specialist domain agents.
Max 3 tool calls per turn (enforced in system prompt).
"""
from __future__ import annotations
import asyncio
import json
from typing import Any
from datetime import datetime, timezone

from app.agents.context import detect_domain, build_system_prompt, UserCtx
from app.models.conversation import CoachResponse, CoachSection, QuickAction
from app.config import TOKEN_BUDGETS

SUPERVISOR_SYSTEM = (
    "You are the Life OS Supervisor. Your job is to:\n"
    "1. Understand the user's request across all life domains.\n"
    "2. Identify which domain(s) are most relevant.\n"
    "3. Synthesise a coherent, actionable response.\n"
    "4. You may use AT MOST 3 tool calls per turn.\n"
    "5. Return a JSON CoachResponse with sections, quick_actions, and created_items.\n"
    "6. Be specific — reference the user's actual data, not generic advice.\n"
    "7. If the question spans multiple domains, address each briefly.\n"
    "Response must be valid JSON matching CoachResponse schema."
)

# Domain agent routing table
_DOMAIN_RUNNERS = {
    "health":   "app.agents.domain_agents.health_agent.run_health_agent",
    "finance":  "app.agents.domain_agents.finance_agent.run_finance_agent",
    "family":   "app.agents.domain_agents.family_agent.run_family_agent",
    "social":   "app.agents.domain_agents.social_agent.run_social_agent",
    "growth":   "app.agents.domain_agents.growth_agent.run_growth_agent",
    "career":   "app.agents.domain_agents.career_agent.run_career_agent",
    "property": "app.agents.domain_agents.property_agent.run_property_agent",
}


def _import_runner(dotted: str):
    module_path, fn_name = dotted.rsplit(".", 1)
    import importlib
    mod = importlib.import_module(module_path)
    return getattr(mod, fn_name)


async def _call_domain_agent(
    domain: str,
    message: str,
    context: str,
    prefs: dict,
    conv_history: list[dict],
) -> CoachResponse:
    runner_path = _DOMAIN_RUNNERS.get(domain)
    if not runner_path:
        # Fallback — use general life_coaching
        from app.services.ai_service import ai_complete
        system = build_system_prompt("general", prefs)
        msgs = [{"role": m["role"], "content": m["content"]} for m in conv_history[-4:]]
        msgs.append({"role": "user", "content": f"CONTEXT:\n{context}\n\nUSER: {message}"})
        response, model_used = await ai_complete(
            "life_coaching", msgs, system=system, domain="general", max_tokens=500
        )
        return CoachResponse(
            sections=[CoachSection(type="insight", content=response)],
            domain="general",
            model_used=model_used,
        )
    runner = _import_runner(runner_path)
    return await runner(message, context, prefs, conv_history)


async def run_supervisor(
    user_id: str,
    message: str,
    domain: str | None,
    conv_history: list[dict],
    context: str = "",
    prefs: dict | None = None,
) -> CoachResponse:
    """
    Entry point called by ai_coach.py.
    1. Detect domain if not provided.
    2. Route to specialist agent.
    3. Return CoachResponse (JSON-serialisable).
    """
    if prefs is None:
        prefs = {}

    # Detect domain from message + last 3 turns
    last_3 = [m["content"] for m in conv_history[-3:] if m.get("role") == "user"]
    active_domain = domain or detect_domain(message, last_3)

    # Cross-domain: if message scores >1 domain, call in parallel (max 2 agents)
    cross_domains = _detect_cross_domains(message, last_3)
    if len(cross_domains) > 1 and len(cross_domains) <= 3:
        results = await asyncio.gather(
            *[_call_domain_agent(d, message, context, prefs, conv_history) for d in cross_domains[:2]],
            return_exceptions=True,
        )
        # Merge sections from non-error results
        merged_sections = []
        model_used = None
        for r in results:
            if isinstance(r, Exception):
                continue
            merged_sections.extend(r.sections)
            model_used = model_used or r.model_used
        if merged_sections:
            return CoachResponse(
                sections=merged_sections,
                domain=active_domain,
                model_used=model_used,
            )

    # Single domain
    return await _call_domain_agent(active_domain, message, context, prefs, conv_history)


def _detect_cross_domains(message: str, last_3: list[str]) -> list[str]:
    """Return list of domains with score >= 1 (keyword hit). Max 3 returned."""
    from app.agents.context import _DOMAIN_KEYWORDS
    text = (message + " " + " ".join(last_3)).lower()
    scored = []
    for domain, kws in _DOMAIN_KEYWORDS.items():
        score = sum(1 for kw in kws if kw in text)
        if score >= 1:
            scored.append((score, domain))
    scored.sort(reverse=True)
    return [d for _, d in scored[:3]]
