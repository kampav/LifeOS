"""
Karpathy-style context compression.
Keeps total AI prompt under 2200 tokens by pre-compressing domain data.
"""
from app.db.client import get_supabase
from datetime import datetime, timezone, timedelta

DOMAIN_CONTEXT_TOKEN_LIMIT = 800


async def build_domain_context(user_id: str, domain: str, days: int = 7) -> str:
    """Compressed context for one domain. Max ~800 tokens."""
    sb = get_supabase()
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    entries = sb.table("entries").select("title,value,unit,notes,logged_at").eq("user_id", user_id).eq("domain", domain).gte("logged_at", since).order("logged_at", desc=True).limit(10).execute()
    goals = sb.table("goals").select("title,current_value,target_value,unit,status").eq("user_id", user_id).eq("domain", domain).eq("status", "active").limit(5).execute()
    habits = sb.table("habits").select("name,current_streak,frequency").eq("user_id", user_id).eq("domain", domain).eq("is_active", True).limit(5).execute()

    entry_lines = [f"- {e.get('logged_at','')[:10]}: {e.get('title','')} {e.get('value','')}{e.get('unit','')}" for e in (entries.data or [])]
    goal_lines = [f"- {g['title']}: {g.get('current_value',0)}/{g.get('target_value','?')} {g.get('unit','')}" for g in (goals.data or [])]
    habit_lines = [f"- {h['name']} ({h['frequency']}) streak:{h.get('current_streak',0)}d" for h in (habits.data or [])]

    return f"""[{domain.upper()} CONTEXT — {datetime.now().strftime('%Y-%m-%d')}]
ACTIVE GOALS ({len(goal_lines)}):
{chr(10).join(goal_lines) or 'None'}
HABITS:
{chr(10).join(habit_lines) or 'None'}
RECENT 7d ({len(entry_lines)} entries):
{chr(10).join(entry_lines) or 'No entries'}""".strip()


async def build_full_context(user_id: str, domains: list[str] | None = None) -> str:
    """Multi-domain compressed context for weekly review etc."""
    if domains is None:
        domains = ["health", "family", "social", "finance", "career", "growth"]
    parts = []
    for d in domains:
        parts.append(await build_domain_context(user_id, d))
    return "\n\n".join(parts)
