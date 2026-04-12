from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from fastapi import Response

ACTIVE_USERS = Gauge("life_os_active_users", "Daily active users")
AI_MESSAGES = Counter("life_os_ai_messages_total", "AI coaching messages", ["model", "domain"])
ENTRIES_CREATED = Counter("life_os_entries_total", "Life entries logged", ["domain", "entry_type"])
GOALS_COMPLETED = Counter("life_os_goals_completed", "Goals marked complete", ["domain"])
API_LATENCY = Histogram("life_os_api_duration_seconds", "API response time", ["endpoint", "method"])
AI_LATENCY = Histogram("life_os_ai_duration_seconds", "AI response time", ["model"])
AI_TOKENS = Histogram("life_os_ai_tokens_used", "Tokens per AI call", ["model", "type"])
ERROR_RATE = Counter("life_os_errors_total", "API errors", ["endpoint", "status_code"])
AI_COST_USD = Counter("life_os_ai_cost_usd", "Estimated AI API cost", ["model"])


def metrics_endpoint():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
