"""
Finance domain agent — uses Haiku for general finance, Ollama for sensitive data.
Sensitive = mentions of account numbers, specific balances, tax records.
"""
from __future__ import annotations
import re
from app.agents.context import build_system_prompt
from app.models.conversation import CoachResponse, CoachSection

_SENSITIVE_PATTERNS = re.compile(
    r"\b(\d{8,}|sort\s*code|account\s*number|national\s*insurance|ni\s*number|tax\s*return)\b",
    re.IGNORECASE,
)


def _is_sensitive(message: str) -> bool:
    return bool(_SENSITIVE_PATTERNS.search(message))


async def run_finance_agent(
    message: str,
    context: str,
    prefs: dict,
    conv_history: list[dict],
) -> CoachResponse:
    from app.services.ai_service import ai_complete

    system = build_system_prompt("finance", prefs)
    messages = [{"role": m["role"], "content": m["content"]} for m in conv_history[-4:]]
    messages.append({"role": "user", "content": f"CONTEXT:\n{context}\n\nUSER: {message}"})

    intent = "health_sensitive" if _is_sensitive(message) else "quick_response"
    response, model_used = await ai_complete(
        intent, messages, system=system, domain="finance", max_tokens=400
    )

    from app.security.disclaimers import FINANCIAL_DISCLAIMER
    return CoachResponse(
        sections=[
            CoachSection(type="insight", content=response),
            CoachSection(type="warning", title="Disclaimer", content=FINANCIAL_DISCLAIMER),
        ],
        domain="finance",
        model_used=model_used,
    )
