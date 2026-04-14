"""
Sprint 8 — Finance API.

Endpoints:
  GET  /finance/spending        — category breakdown + monthly trend
  GET  /finance/budget          — budget vs actuals for current month
  POST /finance/transactions    — manual transaction log
  GET  /finance/net-worth       — monthly snapshots + trend
  POST /finance/net-worth       — add/update snapshot
  GET  /finance/tax             — HMRC deadlines + checklist

All AI responses attach FINANCIAL_DISCLAIMER.
Sensitive financial data never leaves the server-side; no cloud AI for raw account data.
"""
from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.security.auth import get_current_user, User
from app.db.client import get_supabase
from app.security.disclaimers import FINANCIAL_DISCLAIMER

router = APIRouter(prefix="/finance", tags=["finance"])

HMRC_DEADLINES = [
    {"event": "Self Assessment registration deadline", "date": "2024-10-05", "type": "self_assessment"},
    {"event": "Paper SA return deadline", "date": "2024-10-31", "type": "self_assessment"},
    {"event": "Online SA return + tax payment deadline", "date": "2025-01-31", "type": "self_assessment"},
    {"event": "Second payment on account", "date": "2025-07-31", "type": "self_assessment"},
    {"event": "P11D expenses/benefits deadline", "date": "2025-07-06", "type": "employment"},
    {"event": "CGT 60-day reporting deadline", "date": "rolling", "type": "cgt"},
]

SPEND_CATEGORIES = [
    "housing", "transport", "food_drink", "entertainment", "health",
    "clothing", "utilities", "insurance", "savings_investment", "other",
]


class TransactionIn(BaseModel):
    date: date
    amount: float
    direction: str  # income | expense
    category: str = "other"
    subcategory: Optional[str] = None
    description: Optional[str] = None
    merchant: Optional[str] = None
    account: Optional[str] = None
    currency: str = "GBP"


class NetWorthIn(BaseModel):
    snapshot_date: date
    assets: float
    liabilities: float
    currency: str = "GBP"
    notes: Optional[str] = None


@router.get("/spending")
async def get_spending(
    months: int = 3,
    current_user: User = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """Category breakdown for the last N months."""
    from datetime import timedelta
    since = (datetime.now(timezone.utc) - timedelta(days=months * 30)).date().isoformat()

    result = supabase.table("transactions").select(
        "category, amount, direction, date"
    ).eq("user_id", current_user.id).gte("date", since).eq("direction", "expense").execute()

    txns = result.data or []
    by_category: dict[str, float] = {}
    for t in txns:
        cat = t.get("category", "other")
        by_category[cat] = round(by_category.get(cat, 0) + float(t.get("amount", 0)), 2)

    total = sum(by_category.values())
    breakdown = [
        {"category": cat, "amount": amt, "pct": round(amt / total * 100, 1) if total else 0}
        for cat, amt in sorted(by_category.items(), key=lambda x: x[1], reverse=True)
    ]

    return {
        "breakdown": breakdown,
        "total_spend": round(total, 2),
        "period_months": months,
        "disclaimer": FINANCIAL_DISCLAIMER,
    }


@router.get("/budget")
async def get_budget(
    month: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """Budget vs actuals for given month (YYYY-MM-DD, defaults to current month)."""
    if month:
        month_start = month
    else:
        today = date.today()
        month_start = today.replace(day=1).isoformat()

    month_end = month_start[:7] + "-31"  # broad upper bound, DB will handle

    budgets = supabase.table("budgets").select("*").eq(
        "user_id", current_user.id
    ).eq("month", month_start).execute()

    actuals = supabase.table("transactions").select(
        "category, amount"
    ).eq("user_id", current_user.id).eq("direction", "expense").gte(
        "date", month_start
    ).lte("date", month_end).execute()

    actual_by_cat: dict[str, float] = {}
    for t in (actuals.data or []):
        cat = t.get("category", "other")
        actual_by_cat[cat] = round(actual_by_cat.get(cat, 0) + float(t.get("amount", 0)), 2)

    budget_rows = budgets.data or []
    result = []
    for b in budget_rows:
        cat = b["category"]
        budgeted = float(b["amount"])
        actual = actual_by_cat.get(cat, 0)
        result.append({
            "category": cat,
            "budgeted": budgeted,
            "actual": actual,
            "remaining": round(budgeted - actual, 2),
            "over_budget": actual > budgeted,
        })

    # Include categories with spend but no budget
    for cat, actual in actual_by_cat.items():
        if not any(r["category"] == cat for r in result):
            result.append({
                "category": cat,
                "budgeted": 0,
                "actual": actual,
                "remaining": -actual,
                "over_budget": True,
            })

    return {
        "month": month_start,
        "budget_vs_actuals": result,
        "disclaimer": FINANCIAL_DISCLAIMER,
    }


@router.post("/transactions", status_code=status.HTTP_201_CREATED)
async def create_transaction(
    body: TransactionIn,
    current_user: User = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    if body.direction not in ("income", "expense"):
        raise HTTPException(status_code=400, detail="direction must be 'income' or 'expense'")

    result = supabase.table("transactions").insert({
        "user_id": current_user.id,
        "date": body.date.isoformat(),
        "amount": body.amount,
        "direction": body.direction,
        "category": body.category,
        "subcategory": body.subcategory,
        "description": body.description,
        "merchant": body.merchant,
        "account": body.account,
        "currency": body.currency,
        "source": "manual",
    }).execute()

    return (result.data or [{}])[0]


@router.get("/net-worth")
async def get_net_worth(
    months: int = 12,
    current_user: User = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """Monthly net worth snapshots + trend."""
    from datetime import timedelta
    since = (date.today() - timedelta(days=months * 30)).isoformat()

    result = supabase.table("net_worth_snapshots").select(
        "snapshot_date, assets, liabilities, net_worth, currency"
    ).eq("user_id", current_user.id).gte(
        "snapshot_date", since
    ).order("snapshot_date").execute()

    snapshots = result.data or []
    latest = snapshots[-1] if snapshots else None

    return {
        "snapshots": snapshots,
        "latest": latest,
        "disclaimer": FINANCIAL_DISCLAIMER,
    }


@router.post("/net-worth", status_code=status.HTTP_201_CREATED)
async def add_net_worth_snapshot(
    body: NetWorthIn,
    current_user: User = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    result = supabase.table("net_worth_snapshots").upsert({
        "user_id": current_user.id,
        "snapshot_date": body.snapshot_date.isoformat(),
        "assets": body.assets,
        "liabilities": body.liabilities,
        "currency": body.currency,
        "notes": body.notes,
    }).execute()

    return (result.data or [{}])[0]


@router.get("/tax")
async def get_tax_deadlines(
    current_user: User = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """HMRC deadlines + user's tax records checklist."""
    records = supabase.table("tax_records").select("*").eq(
        "user_id", current_user.id
    ).order("deadline").execute()

    today = date.today()
    upcoming = [
        d for d in HMRC_DEADLINES
        if d["date"] != "rolling" and d["date"] >= today.isoformat()
    ]

    return {
        "hmrc_deadlines": upcoming,
        "tax_records": records.data or [],
        "disclaimer": FINANCIAL_DISCLAIMER,
    }
