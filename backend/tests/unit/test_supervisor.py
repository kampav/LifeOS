"""
Sprint 5 — Supervisor and agent routing tests.
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.agents.context import detect_domain, build_personalisation_block, build_system_prompt
from app.models.conversation import CoachResponse, CoachSection


# ── test_supervisor_routes_health_to_health_agent ────────────────────────────

@pytest.mark.asyncio
async def test_supervisor_routes_health_to_health_agent():
    """Health messages must be routed to the health agent, not general."""
    called_domains = []

    async def fake_runner(message, context, prefs, conv_history):
        called_domains.append("health")
        return CoachResponse(sections=[CoachSection(type="insight", content="health response")], domain="health")

    with patch("app.agents.domain_agents.health_agent.run_health_agent", fake_runner):
        from app.agents.supervisor import run_supervisor
        result = await run_supervisor(
            user_id="u1",
            message="How are my sleep and workout goals going?",
            domain="health",
            conv_history=[],
            context="",
            prefs={},
        )
    assert result.domain == "health"
    assert "health" in called_domains


@pytest.mark.asyncio
async def test_supervisor_calls_parallel_for_cross_domain():
    """A message hitting multiple domains should trigger parallel calls."""
    from app.agents.supervisor import _detect_cross_domains
    message = "I want to improve my health and save money this month"
    domains = _detect_cross_domains(message, [])
    assert "health" in domains
    assert "finance" in domains
    assert len(domains) <= 3


# ── test_health_agent_uses_ollama_not_cloud ──────────────────────────────────

@pytest.mark.asyncio
async def test_health_agent_uses_ollama_not_cloud():
    """Health agent must call ai_complete with 'health_sensitive' intent (→ Ollama)."""
    called_intents = []

    async def fake_ai(intent, *args, **kwargs):
        called_intents.append(intent)
        return "health data", "ollama/llama3.2"

    with patch("app.services.ai_service.ai_complete", fake_ai):
        from app.agents.domain_agents.health_agent import run_health_agent
        result = await run_health_agent("My sleep score?", "", {}, [])

    assert called_intents[0] == "health_sensitive"
    assert result.model_used == "ollama/llama3.2"


# ── test_coach_response_matches_schema ───────────────────────────────────────

def test_coach_response_matches_schema():
    """CoachResponse must serialise/deserialise correctly."""
    import json
    cr = CoachResponse(
        sections=[
            CoachSection(type="insight", title="Today", content="You ran 5k!"),
            CoachSection(type="list", content="Action items", items=["Drink water", "Sleep by 10pm"]),
        ],
        quick_actions=[],
        domain="health",
        model_used="ollama/llama3.2",
    )
    raw = json.loads(cr.model_dump_json())
    assert raw["sections"][0]["type"] == "insight"
    assert raw["sections"][1]["items"] == ["Drink water", "Sleep by 10pm"]
    assert raw["domain"] == "health"


# ── test_total_input_tokens_under_2200 ───────────────────────────────────────

def test_total_input_tokens_under_2200():
    """System prompt + personalisation block must stay within token budget."""
    from app.agents.context import build_system_prompt, build_personalisation_block, TOKEN_BUDGETS
    prefs = {"coach_tone": 3, "detail_level": 4, "display_name": "Pavan"}
    system = build_system_prompt("health", prefs)
    personalisation = build_personalisation_block(prefs)
    # Rough token estimate: 4 chars ≈ 1 token
    system_tokens = len(system) // 4
    personalisation_tokens = len(personalisation) // 4
    assert system_tokens <= TOKEN_BUDGETS["system_prompt"], f"System prompt too long: {system_tokens} tokens"
    assert personalisation_tokens <= TOKEN_BUDGETS["personalisation_block"], f"Personalisation block too long: {personalisation_tokens} tokens"
