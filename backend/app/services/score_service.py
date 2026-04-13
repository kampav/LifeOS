"""Domain and life score computation. Redis cache optional (1 hour TTL)."""
from app.db.client import get_supabase
from app.security.rate_limiter import get_redis
from datetime import datetime, timezone, timedelta

BASE_WEIGHTS = {
    "health": 0.15, "family": 0.15, "education": 0.10,
    "social": 0.10, "finance": 0.10, "career": 0.10,
    "growth": 0.10, "property": 0.05, "holiday": 0.05, "community": 0.10,
}


async def _cache_get(key: str):
    try:
        r = get_redis()
        return await r.get(key)
    except Exception:
        return None


async def _cache_set(key: str, value: int, ttl: int = 3600):
    try:
        r = get_redis()
        await r.setex(key, ttl, value)
    except Exception:
        pass


async def compute_domain_score(user_id: str, domain: str) -> int:
    """Score 0-100. Redis cache optional."""
    cache_key = f"score:{user_id}:{domain}"
    cached = await _cache_get(cache_key)
    if cached:
        return int(cached)

    sb = get_supabase()
    since = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()

    entries = sb.table("entries").select("id").eq("user_id", user_id).eq("domain", domain).gte("logged_at", since).execute()
    goals = sb.table("goals").select("current_value,target_value,status").eq("user_id", user_id).eq("domain", domain).execute()
    habits = sb.table("habits").select("current_streak,is_active").eq("user_id", user_id).eq("domain", domain).eq("is_active", True).execute()

    # Entry frequency score (0-40): 20+ entries = 40 pts
    entry_score = min(40, len(entries.data or []) * 2)

    # Goal progress score (0-40)
    goal_score = 0
    active_goals = [g for g in (goals.data or []) if g["status"] == "active" and g["target_value"]]
    if active_goals:
        avg_progress = sum(min(1.0, (g["current_value"] or 0) / g["target_value"]) for g in active_goals) / len(active_goals)
        goal_score = int(avg_progress * 40)
    elif any(g["status"] == "completed" for g in (goals.data or [])):
        goal_score = 30

    # Habit streak score (0-20)
    habit_score = 0
    if habits.data:
        avg_streak = sum(h.get("current_streak", 0) for h in habits.data) / len(habits.data)
        habit_score = min(20, int(avg_streak * 2))

    score = entry_score + goal_score + habit_score
    await _cache_set(cache_key, score)
    return score


async def compute_life_score(user_id: str) -> int:
    """Weighted life score across all domains."""
    sb = get_supabase()
    profile = sb.table("profiles").select("declared_priorities,subscription_tier").eq("id", user_id).single().execute()
    priorities = (profile.data or {}).get("declared_priorities", [])

    weights = dict(BASE_WEIGHTS)
    for domain in priorities[:3]:
        if domain in weights:
            weights[domain] *= 1.5

    total = sum(weights.values())
    weights = {k: v / total for k, v in weights.items()}

    scores = {}
    for domain in weights:
        scores[domain] = await compute_domain_score(user_id, domain)

    return int(sum(weights[d] * scores[d] for d in weights))
