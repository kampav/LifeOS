"""
AI Service — model routing + calls.
Routes to cheapest model that can handle the task.
Tier-3 sensitive data always goes to local Ollama.
"""
import anthropic
from google import genai as google_genai
import httpx
from app.config import settings
from app.observability.logging import get_logger
from app.observability.metrics import AI_MESSAGES, AI_LATENCY, AI_TOKENS, AI_COST_USD
import time

log = get_logger()

# Model routing
MODEL_ROUTER = {
    "life_coaching":   "claude-sonnet-4-5",
    "data_analysis":   "gemini-1.5-pro",
    "quick_response":  "gemini-1.5-flash",
    "document_review": "gemini-1.5-pro",
    "daily_brief":     "claude-haiku-4-5-20251001",
    "weekly_review":   "claude-sonnet-4-5",
    "health_sensitive": "ollama/llama3.2",
    "insights":        "gemini-1.5-flash",
}

# Approx cost per 1M tokens (USD)
MODEL_COSTS = {
    "claude-sonnet-4-5": {"input": 3.0, "output": 15.0},
    "claude-haiku-4-5-20251001": {"input": 0.25, "output": 1.25},
    "gemini-1.5-pro": {"input": 1.25, "output": 5.0},
    "gemini-1.5-flash": {"input": 0.075, "output": 0.30},
}

LIFE_COACH_SYSTEM = """You are Life OS — a world-class personal AI life coach combining the wisdom of Tony Robbins, Brené Brown, Dr. Peter Attia, and Naval Ravikant.

Style: WARM but DIRECT. DATA-DRIVEN (anchor in user's actual data). PRACTICAL (end every insight with a specific small next action). EMOTIONALLY INTELLIGENT.

NEVER: give generic advice, shame the user, be sycophantic.

The user's compressed domain context and Mem0 memories will be provided. Always reference specific data points. Make them feel truly known."""


def route_model(intent: str, data_sensitivity: str = "tier1_public") -> str:
    if data_sensitivity == "tier3_sensitive":
        return "ollama/llama3.2"
    return MODEL_ROUTER.get(intent, "gemini-1.5-flash")


async def call_claude(model: str, system: str, messages: list[dict], max_tokens: int = 1000) -> tuple[str, int, int]:
    """Returns (content, input_tokens, output_tokens)"""
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    t0 = time.time()
    resp = client.messages.create(model=model, max_tokens=max_tokens, system=system, messages=messages)
    latency = time.time() - t0
    content = resp.content[0].text
    in_tok = resp.usage.input_tokens
    out_tok = resp.usage.output_tokens
    AI_LATENCY.labels(model=model).observe(latency)
    AI_TOKENS.labels(model=model, type="input").observe(in_tok)
    AI_TOKENS.labels(model=model, type="output").observe(out_tok)
    cost = (in_tok * MODEL_COSTS.get(model, {}).get("input", 1.0) + out_tok * MODEL_COSTS.get(model, {}).get("output", 1.0)) / 1_000_000
    AI_COST_USD.labels(model=model).inc(cost)
    log.info("ai_call", model=model, in_tokens=in_tok, out_tokens=out_tok, latency_ms=int(latency * 1000), cost_usd=round(cost, 6))
    return content, in_tok, out_tok


async def call_gemini(model: str, prompt: str, max_tokens: int = 1000) -> tuple[str, int, int]:
    client = google_genai.Client(api_key=settings.GOOGLE_AI_API_KEY)
    t0 = time.time()
    resp = client.models.generate_content(model=model, contents=prompt, config={"max_output_tokens": max_tokens})
    latency = time.time() - t0
    content = resp.text
    # Gemini doesn't always return token counts, approximate
    in_tok = len(prompt.split()) * 1.3
    out_tok = len(content.split()) * 1.3
    AI_LATENCY.labels(model=model).observe(latency)
    cost = (in_tok * MODEL_COSTS.get(model, {}).get("input", 0.1) + out_tok * MODEL_COSTS.get(model, {}).get("output", 0.3)) / 1_000_000
    AI_COST_USD.labels(model=model).inc(cost)
    log.info("ai_call", model=model, latency_ms=int(latency * 1000), cost_usd=round(cost, 6))
    return content, int(in_tok), int(out_tok)


async def call_ollama(prompt: str, model: str = "llama3.2") -> tuple[str, int, int]:
    """Local Ollama for sensitive data — never leaves device."""
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{settings.OLLAMA_BASE_URL}/api/generate",
            json={"model": model, "prompt": prompt, "stream": False},
        )
        data = resp.json()
        return data.get("response", ""), 0, 0


async def ai_complete(intent: str, messages: list[dict], system: str = "", data_sensitivity: str = "tier1_public", max_tokens: int = 1000, domain: str = "general") -> tuple[str, str]:
    """Universal completion. Returns (content, model_used)."""
    model = route_model(intent, data_sensitivity)
    AI_MESSAGES.labels(model=model, domain=domain).inc()

    if model.startswith("claude"):
        content, _, _ = await call_claude(model, system or LIFE_COACH_SYSTEM, messages, max_tokens)
    elif model.startswith("gemini"):
        prompt = f"{system}\n\n" + "\n".join(f"{m['role'].upper()}: {m['content']}" for m in messages)
        content, _, _ = await call_gemini(model, prompt, max_tokens)
    elif model.startswith("ollama"):
        prompt = "\n".join(f"{m['role'].upper()}: {m['content']}" for m in messages)
        content, _, _ = await call_ollama(prompt, model.split("/")[1])
    else:
        content = "AI service temporarily unavailable."

    return content, model


async def generate_domain_insights(user_id: str, domain: str) -> str:
    from app.memory.compressor import build_domain_context
    context = await build_domain_context(user_id, domain)
    messages = [{"role": "user", "content": f"Generate 3 specific, data-driven insights for my {domain} domain.\n\n{context}"}]
    content, _ = await ai_complete("insights", messages, domain=domain)
    return content
