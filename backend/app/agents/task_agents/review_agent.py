"""
Review agent — wraps review_service; keeps same public API.
Uses Haiku for daily brief, Sonnet for weekly review.
"""
from __future__ import annotations


async def generate_daily_brief(user_id: str) -> str:
    from app.services.review_service import generate_daily_brief as _generate
    return await _generate(user_id)


async def generate_weekly_review(user_id: str) -> dict:
    from app.services.review_service import generate_weekly_review as _generate
    return await _generate(user_id)
