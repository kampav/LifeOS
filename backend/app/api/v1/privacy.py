"""
Sprint 8 — Privacy & GDPR API.

Endpoints:
  POST /privacy/export           — async data export job
  POST /privacy/delete           — schedule hard delete within 30 days
  POST /privacy/portability      — same as export but machine-readable JSON
  POST /privacy/withdraw/{type}  — withdraw a specific consent
  GET  /privacy/my-consents      — list all consent records

UK GDPR / GDPR compliance: right to erasure, right to portability, consent management.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.security.auth import get_current_user, User
from app.db.client import get_supabase

router = APIRouter(prefix="/privacy", tags=["privacy"])

REQUIRED_CONSENTS = {"health_data", "financial_data", "ai_processing"}
OPTIONAL_CONSENTS = {"marketing", "analytics", "third_party_sharing"}
ALL_CONSENTS = REQUIRED_CONSENTS | OPTIONAL_CONSENTS


class ConsentUpdate(BaseModel):
    consents: dict[str, bool]  # {consent_type: granted}


class DeleteRequest(BaseModel):
    reason: Optional[str] = None
    confirm: bool = False


@router.get("/my-consents")
async def get_my_consents(
    current_user: User = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    result = supabase.table("consent_records").select("*").eq(
        "user_id", current_user.id
    ).execute()

    existing = {r["consent_type"]: r for r in (result.data or [])}

    # Return as dict {consent_type: bool} for the frontend toggle UI,
    # plus detailed list for informational display
    consents_dict = {}
    consents_detail = []
    for ct in ALL_CONSENTS:
        rec = existing.get(ct)
        granted = rec.get("granted", False) if rec else False
        consents_dict[ct] = granted
        consents_detail.append({
            "consent_type": ct,
            "is_required": ct in REQUIRED_CONSENTS,
            "granted": granted,
            "granted_at": rec.get("granted_at") if rec else None,
            "withdrawn_at": rec.get("withdrawn_at") if rec else None,
        })

    return {"consents": consents_dict, "detail": consents_detail}


class GrantConsentRequest(BaseModel):
    consent_type: str


@router.post("/grant")
async def grant_consent(
    body: GrantConsentRequest,
    current_user: User = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    if body.consent_type not in ALL_CONSENTS:
        raise HTTPException(status_code=400, detail=f"Unknown consent type: {body.consent_type}")

    supabase.table("consent_records").upsert({
        "user_id": current_user.id,
        "consent_type": body.consent_type,
        "granted": True,
        "granted_at": datetime.now(timezone.utc).isoformat(),
        "withdrawn_at": None,
    }).execute()

    return {"granted": True, "consent_type": body.consent_type}


@router.post("/withdraw/{consent_type}")
async def withdraw_consent(
    consent_type: str,
    current_user: User = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    if consent_type not in ALL_CONSENTS:
        raise HTTPException(status_code=400, detail=f"Unknown consent type: {consent_type}")
    if consent_type in REQUIRED_CONSENTS:
        raise HTTPException(
            status_code=409,
            detail=f"'{consent_type}' is required for Life OS to function. "
                   "To remove this data, please delete your account instead.",
        )

    supabase.table("consent_records").upsert({
        "user_id": current_user.id,
        "consent_type": consent_type,
        "granted": False,
        "withdrawn_at": datetime.now(timezone.utc).isoformat(),
    }).execute()

    return {"withdrawn": True, "consent_type": consent_type}


@router.post("/export")
async def request_data_export(
    current_user: User = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """Queue a data export job. Download link delivered in-app within 24h."""
    result = supabase.table("data_export_requests").insert({
        "user_id": current_user.id,
        "status": "pending",
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
    }).execute()

    return {
        "requested": True,
        "message": "Your data export has been queued. You'll receive a download link within 24 hours.",
        "request_id": (result.data or [{}])[0].get("id"),
    }


@router.post("/portability")
async def request_portability_export(
    current_user: User = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """Right to data portability — machine-readable JSON export."""
    result = supabase.table("data_export_requests").insert({
        "user_id": current_user.id,
        "status": "pending",
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
    }).execute()

    return {
        "requested": True,
        "format": "json",
        "message": "Portability export queued. Download link within 24 hours.",
        "request_id": (result.data or [{}])[0].get("id"),
    }


@router.post("/delete")
async def request_account_deletion(
    body: DeleteRequest,
    current_user: User = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """
    Schedule hard delete of all user data within 30 days (UK GDPR Art. 17).
    Requires explicit confirmation.
    """
    if not body.confirm:
        raise HTTPException(
            status_code=400,
            detail="Set confirm=true to acknowledge permanent deletion. This cannot be undone.",
        )

    scheduled_for = datetime.now(timezone.utc) + timedelta(days=30)

    result = supabase.table("data_deletion_requests").insert({
        "user_id": current_user.id,
        "status": "pending",
        "reason": body.reason,
        "scheduled_for": scheduled_for.isoformat(),
    }).execute()

    return {
        "deletion_scheduled": True,
        "scheduled_for": scheduled_for.isoformat(),
        "message": (
            "Your account and all associated data will be permanently deleted on "
            f"{scheduled_for.strftime('%d %B %Y')}. "
            "Contact support before that date to cancel."
        ),
        "request_id": (result.data or [{}])[0].get("id"),
    }
