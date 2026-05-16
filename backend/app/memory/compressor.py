"""
Karpathy-style context compression.
Keeps AI prompts compact while giving the coach the same operating context
the dashboard, planner, and Kanban board use.
"""
from app.db.client import get_supabase
from datetime import datetime, timezone, timedelta

DOMAIN_CONTEXT_TOKEN_LIMIT = 800


def _safe_rows(query) -> list[dict]:
    try:
        return query.execute().data or []
    except Exception:
        return []


def _task_lines(rows: list[dict], limit: int = 6) -> list[str]:
    lines = []
    for row in rows[:limit]:
        due = row.get("due_date") or row.get("start_at") or "unscheduled"
        status = row.get("status") or ("done" if row.get("completed") else "open")
        lines.append(
            f"- {row.get('title', 'Untitled')} [{status}] "
            f"due:{str(due)[:10]} priority:{row.get('priority', 'medium')}"
        )
    return lines


async def build_domain_context(user_id: str, domain: str, days: int = 7) -> str:
    """Compressed context for one domain. Max roughly 800 tokens."""
    sb = get_supabase()
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    entries = _safe_rows(
        sb.table("entries")
        .select("title,value,unit,notes,logged_at")
        .eq("user_id", user_id)
        .eq("domain", domain)
        .gte("logged_at", since)
        .order("logged_at", desc=True)
        .limit(10)
    )
    goals = _safe_rows(
        sb.table("goals")
        .select("title,current_value,target_value,unit,status")
        .eq("user_id", user_id)
        .eq("domain", domain)
        .eq("status", "active")
        .limit(5)
    )
    habits = _safe_rows(
        sb.table("habits")
        .select("name,current_streak,frequency")
        .eq("user_id", user_id)
        .eq("domain", domain)
        .eq("is_active", True)
        .limit(5)
    )
    tasks = _safe_rows(
        sb.table("tasks")
        .select("title,status,priority,due_date,goal_id")
        .eq("user_id", user_id)
        .eq("domain", domain)
        .neq("status", "archived")
        .limit(8)
    )
    planner = _safe_rows(
        sb.table("planner_items")
        .select("title,item_type,start_at,priority,completed,task_id,goal_id")
        .eq("user_id", user_id)
        .eq("domain", domain)
        .eq("completed", False)
        .limit(8)
    )

    entry_lines = [
        f"- {e.get('logged_at', '')[:10]}: {e.get('title', '')} {e.get('value', '')}{e.get('unit', '')}"
        for e in entries
    ]
    goal_lines = [
        f"- {g['title']}: {g.get('current_value', 0)}/{g.get('target_value', '?')} {g.get('unit', '')}"
        for g in goals
    ]
    habit_lines = [
        f"- {h['name']} ({h['frequency']}) streak:{h.get('current_streak', 0)}d"
        for h in habits
    ]

    return f"""[{domain.upper()} CONTEXT - {datetime.now().strftime('%Y-%m-%d')}]
ACTIVE GOALS ({len(goal_lines)}):
{chr(10).join(goal_lines) or 'None'}
HABITS:
{chr(10).join(habit_lines) or 'None'}
KANBAN TASKS:
{chr(10).join(_task_lines(tasks)) or 'None'}
PLANNER:
{chr(10).join(_task_lines(planner)) or 'None'}
RECENT {days}d ({len(entry_lines)} entries):
{chr(10).join(entry_lines) or 'No entries'}""".strip()


async def build_operating_context(user_id: str) -> str:
    """Cross-domain work graph context for coach/planner/Kanban reasoning."""
    sb = get_supabase()
    tasks = _safe_rows(
        sb.table("tasks")
        .select("title,domain,status,priority,due_date,goal_id")
        .eq("user_id", user_id)
        .neq("status", "archived")
        .limit(12)
    )
    planner = _safe_rows(
        sb.table("planner_items")
        .select("title,domain,item_type,start_at,priority,completed,task_id,goal_id")
        .eq("user_id", user_id)
        .eq("completed", False)
        .limit(12)
    )
    open_tasks = [t for t in tasks if t.get("status") not in ("done", "archived")]
    waiting = [t for t in tasks if t.get("status") == "waiting"]
    return f"""[OPERATING CONTEXT]
Open Kanban tasks: {len(open_tasks)}; waiting/blocked: {len(waiting)}; planner items: {len(planner)}.
KANBAN:
{chr(10).join(_task_lines(open_tasks, 8)) or 'None'}
PLANNER:
{chr(10).join(_task_lines(planner, 8)) or 'None'}""".strip()


async def build_full_context(user_id: str, domains: list[str] | None = None) -> str:
    """Multi-domain compressed context for coach/review use."""
    if domains is None:
        domains = ["health", "family", "social", "finance", "career", "growth"]
    parts = []
    for d in domains:
        parts.append(await build_domain_context(user_id, d))
    parts.append(await build_operating_context(user_id))
    return "\n\n".join(parts)
