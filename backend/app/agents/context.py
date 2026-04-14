"""
Agent context builders — zero LLM tokens, pure Python.
Assembles system prompts and personalisation blocks within strict token budgets.
"""
from dataclasses import dataclass, field
from typing import Optional
from app.config import TOKEN_BUDGETS

# ── User context ─────────────────────────────────────────────────────────────

@dataclass
class UserCtx:
    user_id: str
    tier: str = "free"          # "free" | "pro" | "premium"
    google_connected: bool = False
    display_name: str = ""


# ── Personalisation labels ────────────────────────────────────────────────────

TONE_LABELS = {
    1: "formal and professional",
    2: "warm and encouraging",
    3: "direct and concise",
    4: "motivational and energetic",
    5: "friendly and conversational",
}

DETAIL_LABELS = {
    1: "brief bullet points only",
    2: "short summaries with key numbers",
    3: "balanced detail with context",
    4: "thorough explanations with examples",
    5: "comprehensive deep-dives",
}

CADENCE_LABELS = {
    "minimal": "only when critical",
    "normal": "daily insights",
    "frequent": "proactive nudges throughout the day",
}

# ── Domain expertise blocks (≤120 tokens each) ───────────────────────────────

EXPERTISE_BLOCKS: dict[str, str] = {
    "health": (
        "You specialise in holistic health: exercise, sleep, nutrition, mental wellbeing. "
        "Cite NHS guidelines where relevant. Never diagnose — always recommend GP for medical concerns. "
        "All health data is Tier 3 — never summarise to external services."
    ),
    "finance": (
        "You specialise in UK personal finance: budgeting, saving, investing (ISAs, pensions), tax (HMRC self-assessment). "
        "Always append the financial disclaimer. Do not give regulated financial advice."
    ),
    "family": (
        "You specialise in family life: parenting, relationships, household management, milestone tracking. "
        "Be warm and empathetic. Never suggest data about children be shared externally."
    ),
    "social": (
        "You specialise in social wellbeing: friendships, networking, community, relationship maintenance. "
        "Help the user nurture meaningful connections and schedule check-ins."
    ),
    "career": (
        "You specialise in career development: goal-setting, skill-building, job search, performance, leadership. "
        "Be pragmatic. Connect career actions to broader life goals."
    ),
    "growth": (
        "You specialise in personal growth: learning, habits, mindset, reading, courses, self-reflection. "
        "Encourage compound improvement. Link new habits to existing identity."
    ),
    "property": (
        "You specialise in property: UK market, mortgage, maintenance, renting vs buying, renovation planning. "
        "Always recommend a solicitor or surveyor for legal/structural decisions."
    ),
    "general": (
        "You are a holistic life coach with expertise across all 10 life domains. "
        "Help the user see connections between domains and make balanced decisions."
    ),
}


# ── Domain detection (keyword scoring, zero tokens) ──────────────────────────

_DOMAIN_KEYWORDS: dict[str, list[str]] = {
    "health":   ["health", "exercise", "sleep", "nutrition", "workout", "gym", "diet", "mental", "wellbeing", "weight", "run", "steps", "calories"],
    "finance":  ["money", "budget", "spend", "save", "invest", "salary", "tax", "mortgage", "debt", "isa", "pension", "cost", "income", "expense"],
    "family":   ["family", "kids", "children", "partner", "spouse", "parent", "marriage", "home", "household", "birthday", "anniversary"],
    "social":   ["friend", "social", "relationship", "network", "community", "meet", "event", "party", "connection"],
    "career":   ["job", "work", "career", "promotion", "salary", "boss", "team", "project", "interview", "skill", "cv", "linkedin"],
    "growth":   ["learn", "read", "course", "habit", "goal", "improve", "growth", "mindset", "book", "study", "practice"],
    "property": ["house", "flat", "property", "rent", "mortgage", "landlord", "renovation", "garden", "move", "buy", "sell"],
}


def detect_domain(message: str, last_3_turns: list[str] | None = None) -> str:
    """Keyword-score the message + recent turns to pick a domain. Zero tokens."""
    text = message.lower()
    if last_3_turns:
        text += " " + " ".join(t.lower() for t in last_3_turns[-3:])
    scores: dict[str, int] = {d: 0 for d in _DOMAIN_KEYWORDS}
    for domain, kws in _DOMAIN_KEYWORDS.items():
        for kw in kws:
            if kw in text:
                scores[domain] += 1
    best = max(scores, key=lambda d: scores[d])
    return best if scores[best] > 0 else "general"


# ── System prompt assembly (≤500 tokens) ─────────────────────────────────────

def build_personalisation_block(prefs: dict) -> str:
    """≤80 token style injection from user personalisation row."""
    tone = prefs.get("coach_tone", 2)
    detail = prefs.get("detail_level", 3)
    name = prefs.get("display_name", "")
    lines = [f"Communication style: {TONE_LABELS.get(tone, TONE_LABELS[2])}."]
    lines.append(f"Response depth: {DETAIL_LABELS.get(detail, DETAIL_LABELS[3])}.")
    if name:
        lines.append(f"Address user as: {name}.")
    return " ".join(lines)


def build_system_prompt(domain: str, prefs: dict, user_meta: dict | None = None) -> str:
    """Assemble ≤500 token system prompt for a domain agent."""
    expertise = EXPERTISE_BLOCKS.get(domain, EXPERTISE_BLOCKS["general"])
    personalisation = build_personalisation_block(prefs)
    base = (
        "You are Life OS Coach, an AI life coach embedded in the user's personal life management app. "
        "You have access to their real data. Be specific and actionable — never generic.\n\n"
        f"EXPERTISE: {expertise}\n\n"
        f"STYLE: {personalisation}"
    )
    if user_meta:
        goals = user_meta.get("top_goals", [])
        if goals:
            base += f"\n\nTOP GOALS: {'; '.join(goals[:3])}"
    return base
