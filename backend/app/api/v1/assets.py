"""
Sprint 9 — Assets API.

Endpoints:
  GET    /assets           — list all assets with totals
  POST   /assets           — create asset
  GET    /assets/summary   — equity breakdown by type
  GET    /assets/{id}      — get single asset
  PUT    /assets/{id}      — update asset
  DELETE /assets/{id}      — delete asset
"""
from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.security.auth import get_current_user, User
from app.db.client import get_supabase

router = APIRouter(prefix="/assets", tags=["assets"])

ASSET_TYPES = {
    "property", "vehicle", "investment", "pension",
    "savings", "business", "insurance", "crypto", "other",
}


class AssetIn(BaseModel):
    name: str
    asset_type: str
    current_value: Optional[float] = None
    purchase_value: Optional[float] = None
    purchase_date: Optional[date] = None
    currency: str = "GBP"
    liability: float = 0.0
    notes: Optional[str] = None


@router.get("")
async def list_assets(
    current_user: User = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    result = supabase.table("assets").select("*").eq(
        "user_id", current_user.id
    ).order("asset_type").execute()

    assets = result.data or []
    total_value = sum(float(a.get("current_value") or 0) for a in assets)
    total_liability = sum(float(a.get("liability") or 0) for a in assets)

    return {
        "assets": assets,
        "total_value": round(total_value, 2),
        "total_liability": round(total_liability, 2),
        "net_equity": round(total_value - total_liability, 2),
    }


@router.get("/summary")
async def assets_summary(
    current_user: User = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """Breakdown of asset values by type."""
    result = supabase.table("assets").select("*").eq(
        "user_id", current_user.id
    ).execute()

    assets = result.data or []
    by_type: dict[str, dict] = {}
    for a in assets:
        t = a.get("asset_type", "other")
        if t not in by_type:
            by_type[t] = {"asset_type": t, "value": 0.0, "liability": 0.0, "count": 0}
        by_type[t]["value"] += float(a.get("current_value") or 0)
        by_type[t]["liability"] += float(a.get("liability") or 0)
        by_type[t]["count"] += 1

    breakdown = sorted(by_type.values(), key=lambda x: -x["value"])
    for row in breakdown:
        row["net_equity"] = round(row["value"] - row["liability"], 2)
        row["value"] = round(row["value"], 2)
        row["liability"] = round(row["liability"], 2)

    total_value = sum(r["value"] for r in breakdown)
    total_liability = sum(r["liability"] for r in breakdown)

    return {
        "breakdown": breakdown,
        "total_value": round(total_value, 2),
        "total_liability": round(total_liability, 2),
        "net_equity": round(total_value - total_liability, 2),
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_asset(
    body: AssetIn,
    current_user: User = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    if body.asset_type not in ASSET_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid asset_type: {body.asset_type}")

    payload = body.model_dump(exclude_none=True)
    if "purchase_date" in payload and payload["purchase_date"]:
        payload["purchase_date"] = str(payload["purchase_date"])
    payload["user_id"] = current_user.id

    result = supabase.table("assets").insert(payload).execute()
    return (result.data or [{}])[0]


@router.get("/{asset_id}")
async def get_asset(
    asset_id: str,
    current_user: User = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    result = supabase.table("assets").select("*").eq("id", asset_id).eq(
        "user_id", current_user.id
    ).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Asset not found")
    return result.data[0]


@router.put("/{asset_id}")
async def update_asset(
    asset_id: str,
    body: AssetIn,
    current_user: User = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    # Verify ownership
    check = supabase.table("assets").select("id").eq("id", asset_id).eq(
        "user_id", current_user.id
    ).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Asset not found")

    payload = body.model_dump(exclude_none=True)
    if "purchase_date" in payload and payload["purchase_date"]:
        payload["purchase_date"] = str(payload["purchase_date"])

    result = supabase.table("assets").update(payload).eq("id", asset_id).execute()
    return (result.data or [{}])[0]


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_asset(
    asset_id: str,
    current_user: User = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    check = supabase.table("assets").select("id").eq("id", asset_id).eq(
        "user_id", current_user.id
    ).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Asset not found")

    supabase.table("assets").delete().eq("id", asset_id).execute()
