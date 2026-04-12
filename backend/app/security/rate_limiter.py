import redis.asyncio as aioredis
from fastapi import HTTPException, Request, status
from app.config import settings
import time

RATE_LIMITS = {
    "free":       {"api_calls": 100, "ai_messages": 10,  "ai_reviews": 1},
    "pro":        {"api_calls": 1000, "ai_messages": 100, "ai_reviews": 7},
    "family":     {"api_calls": 2000, "ai_messages": 300, "ai_reviews": 30},
    "coach":      {"api_calls": 10000, "ai_messages": 1000, "ai_reviews": 999999},
    "enterprise": {"api_calls": 99999, "ai_messages": 9999, "ai_reviews": 999999},
}

_redis = None


def get_redis():
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis


async def check_rate_limit(user_id: str, tier: str, limit_type: str = "api_calls"):
    """Fail-open: if Redis is unavailable, skip rate limiting rather than blocking all requests."""
    try:
        r = get_redis()
        window = 3600 if limit_type == "api_calls" else 86400
        key = f"rl:{user_id}:{limit_type}:{int(time.time() // window)}"
        limit = RATE_LIMITS.get(tier, RATE_LIMITS["free"])[limit_type]
        count = await r.incr(key)
        if count == 1:
            await r.expire(key, window)
        if count > limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded: {limit} {limit_type} per {'hour' if window == 3600 else 'day'}",
                headers={"X-RateLimit-Limit": str(limit), "X-RateLimit-Remaining": "0"},
            )
        return limit - count
    except HTTPException:
        raise
    except Exception:
        # Redis unavailable — fail open (allow request through)
        return 999
