"""
Sprint 9 — Document Vault + Legacy Vault API.

Document Vault: stores important personal document records (metadata only — no raw GCS access exposed).
Legacy Vault: encrypted personal messages/instructions to be released under specific conditions.

Endpoints:
  GET    /vault/documents           — list document vault records
  POST   /vault/documents           — add document record
  DELETE /vault/documents/{id}      — delete

  GET    /vault/legacy              — list legacy vault entries
  POST   /vault/legacy              — create legacy vault entry
  PUT    /vault/legacy/{id}         — update
  DELETE /vault/legacy/{id}         — delete
"""
from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.security.auth import get_current_user, User
from app.db.client import get_supabase

router = APIRouter(prefix="/vault", tags=["vault"])

DOCUMENT_TYPES = {
    "passport", "driving_licence", "birth_certificate", "will",
    "power_of_attorney", "insurance_policy", "property_deed",
    "tax_document", "medical_record", "other",
}

ENTRY_TYPES = {"message", "instruction", "account_info", "contact", "wish"}
RELEASE_CONDITIONS = {"death", "incapacity", "specific_date", "manual"}


# ── Document Vault ────────────────────────────────────────────────────────────

class DocumentVaultIn(BaseModel):
    title: str
    document_type: str
    expiry_date: Optional[date] = None
    notes: Optional[str] = None
    # GCS path set by backend after upload; clients don't set this directly
    gcs_path: Optional[str] = None
    file_size_bytes: Optional[int] = None
    content_type: Optional[str] = None


@router.get("/documents")
async def list_documents(
    current_user: User = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    result = supabase.table("document_vault").select(
        "id, title, document_type, expiry_date, notes, file_size_bytes, content_type, created_at"
        # gcs_path intentionally excluded — never expose raw storage paths to client
    ).eq("user_id", current_user.id).order("document_type").execute()

    docs = result.data or []

    # Flag expiring documents (within 90 days)
    from datetime import datetime, timezone
    today = datetime.now(timezone.utc).date()
    for doc in docs:
        expiry = doc.get("expiry_date")
        if expiry:
            exp_date = date.fromisoformat(expiry)
            days_until = (exp_date - today).days
            doc["days_until_expiry"] = days_until
            doc["expiring_soon"] = 0 <= days_until <= 90
        else:
            doc["days_until_expiry"] = None
            doc["expiring_soon"] = False

    return {"documents": docs, "total": len(docs)}


@router.post("/documents", status_code=status.HTTP_201_CREATED)
async def create_document(
    body: DocumentVaultIn,
    current_user: User = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    if body.document_type not in DOCUMENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid document_type: {body.document_type}")

    payload = body.model_dump(exclude_none=True)
    if "expiry_date" in payload and payload["expiry_date"]:
        payload["expiry_date"] = str(payload["expiry_date"])
    payload["user_id"] = current_user.id

    result = supabase.table("document_vault").insert(payload).execute()
    return (result.data or [{}])[0]


@router.delete("/documents/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    check = supabase.table("document_vault").select("id").eq("id", doc_id).eq(
        "user_id", current_user.id
    ).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Document not found")
    supabase.table("document_vault").delete().eq("id", doc_id).execute()


# ── Legacy Vault ──────────────────────────────────────────────────────────────

class LegacyVaultIn(BaseModel):
    entry_type: str
    title: str
    content: Optional[str] = None
    recipient_name: Optional[str] = None
    recipient_email: Optional[str] = None
    release_on: Optional[str] = None
    release_date: Optional[date] = None


@router.get("/legacy")
async def list_legacy(
    current_user: User = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    result = supabase.table("legacy_vault").select(
        "id, entry_type, title, recipient_name, recipient_email, "
        "release_on, release_date, is_encrypted, created_at, updated_at"
        # content intentionally excluded from list — fetch individually
    ).eq("user_id", current_user.id).order("entry_type").execute()

    return {"entries": result.data or [], "total": len(result.data or [])}


@router.post("/legacy", status_code=status.HTTP_201_CREATED)
async def create_legacy_entry(
    body: LegacyVaultIn,
    current_user: User = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    if body.entry_type not in ENTRY_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid entry_type: {body.entry_type}")
    if body.release_on and body.release_on not in RELEASE_CONDITIONS:
        raise HTTPException(status_code=400, detail=f"Invalid release_on: {body.release_on}")

    payload = body.model_dump(exclude_none=True)
    if "release_date" in payload and payload["release_date"]:
        payload["release_date"] = str(payload["release_date"])
    payload["user_id"] = current_user.id
    payload["is_encrypted"] = True  # always true — enforced server-side

    result = supabase.table("legacy_vault").insert(payload).execute()
    return (result.data or [{}])[0]


@router.get("/legacy/{entry_id}")
async def get_legacy_entry(
    entry_id: str,
    current_user: User = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    result = supabase.table("legacy_vault").select("*").eq("id", entry_id).eq(
        "user_id", current_user.id
    ).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Entry not found")
    return result.data[0]


@router.put("/legacy/{entry_id}")
async def update_legacy_entry(
    entry_id: str,
    body: LegacyVaultIn,
    current_user: User = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    check = supabase.table("legacy_vault").select("id").eq("id", entry_id).eq(
        "user_id", current_user.id
    ).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Entry not found")

    if body.entry_type not in ENTRY_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid entry_type: {body.entry_type}")

    payload = body.model_dump(exclude_none=True)
    if "release_date" in payload and payload["release_date"]:
        payload["release_date"] = str(payload["release_date"])

    result = supabase.table("legacy_vault").update(payload).eq("id", entry_id).execute()
    return (result.data or [{}])[0]


@router.delete("/legacy/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_legacy_entry(
    entry_id: str,
    current_user: User = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    check = supabase.table("legacy_vault").select("id").eq("id", entry_id).eq(
        "user_id", current_user.id
    ).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Entry not found")
    supabase.table("legacy_vault").delete().eq("id", entry_id).execute()
