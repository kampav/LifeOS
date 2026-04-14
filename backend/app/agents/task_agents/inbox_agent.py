"""
Inbox classification agent — Gemini Flash-Lite, classification only.
Reads Gmail subject+snippet; never full body.
"""
from __future__ import annotations
from typing import Optional


CATEGORIES = ["task", "event", "reminder", "info", "spam", "finance", "health", "social"]


async def classify_inbox_item(subject: str, snippet: str, user_id: Optional[str] = None) -> dict:
    """Classify a single inbox item into a Life OS category. Uses Gemini Flash for speed."""
    from app.services.ai_service import ai_complete

    prompt = (
        f"Classify this email into exactly one category from: {', '.join(CATEGORIES)}.\n"
        f"Subject: {subject}\nSnippet: {snippet[:200]}\n"
        "Reply with ONLY the category name, nothing else."
    )
    response, model_used = await ai_complete(
        "quick_response",
        [{"role": "user", "content": prompt}],
        system="You are an email classifier. Output only the category name.",
        domain="general",
        max_tokens=10,
    )
    category = response.strip().lower()
    if category not in CATEGORIES:
        category = "info"
    return {"category": category, "model_used": model_used}
