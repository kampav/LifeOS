from fastapi import APIRouter, Depends
from app.security.auth import get_current_user, User
from app.db.client import get_supabase
from app.services.score_service import compute_domain_score
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/domains", tags=["domains"])

VALID_DOMAINS = ["health", "family", "education", "social", "finance", "career", "growth", "property", "holiday", "community"]


@router.get("/{domain}/dashboard")
async def domain_dashboard(domain: str, user: User = Depends(get_current_user)):
    sb = get_supabase()
    since = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    entries = sb.table("entries").select("*").eq("user_id", user.id).eq("domain", domain).gte("logged_at", since).order("logged_at", desc=True).limit(50).execute()
    goals = sb.table("goals").select("*").eq("user_id", user.id).eq("domain", domain).eq("status", "active").execute()
    habits = sb.table("habits").select("*").eq("user_id", user.id).eq("domain", domain).eq("is_active", True).execute()
    score = await compute_domain_score(user.id, domain)
    return {
        "domain": domain,
        "score": score,
        "recent_entries": entries.data[:10],
        "active_goals": goals.data,
        "habits": habits.data,
        "entry_count_30d": len(entries.data),
    }


@router.get("/{domain}/score")
async def domain_score(domain: str, user: User = Depends(get_current_user)):
    score = await compute_domain_score(user.id, domain)
    return {"domain": domain, "score": score}


@router.get("/{domain}/insights")
async def domain_insights(domain: str, user: User = Depends(get_current_user)):
    from app.services.ai_service import generate_domain_insights
    insights = await generate_domain_insights(user.id, domain)
    return {"domain": domain, "insights": insights}
