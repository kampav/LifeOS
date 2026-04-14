"""
Sprint 7 — Document upload API.

Endpoints:
  POST   /coach/upload              — multipart, up to 5 files, 50 MB max each
  GET    /coach/upload/{id}/status  — polling endpoint
  POST   /coach/upload/{id}/confirm — persist confirmed action items
  POST   /coach/upload/{id}/skip    — mark skipped
  GET    /coach/uploads             — list user's uploads (metadata only)
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel

from app.security.auth import get_current_user, User
from app.db.client import get_supabase
from app.services.document_service import process_document, confirm_extraction

log = logging.getLogger(__name__)

router = APIRouter(prefix="/coach", tags=["documents"])

MAX_FILES = 5
MAX_FILE_BYTES = 50 * 1024 * 1024  # 50 MB
ALLOWED_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "image/jpeg",
    "image/png",
    "image/webp",
    "text/plain",
    "text/csv",
    "text/markdown",
}


class ConfirmRequest(BaseModel):
    confirmed_items: list[dict] = []


class SkipRequest(BaseModel):
    reason: Optional[str] = None


@router.post("/upload", status_code=status.HTTP_202_ACCEPTED)
async def upload_documents(
    files: list[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """Accept up to 5 files. Returns list of upload records with initial status."""
    if len(files) > MAX_FILES:
        raise HTTPException(status_code=400, detail=f"Maximum {MAX_FILES} files per upload.")

    results = []
    for f in files:
        if f.content_type not in ALLOWED_TYPES:
            raise HTTPException(
                status_code=415,
                detail=f"Unsupported file type: {f.content_type}. Allowed: PDF, Word, images, text.",
            )

        file_bytes = await f.read()
        if len(file_bytes) > MAX_FILE_BYTES:
            raise HTTPException(status_code=413, detail=f"{f.filename} exceeds 50 MB limit.")

        # Insert initial record
        insert_result = supabase.table("document_uploads").insert({
            "user_id": current_user.id,
            "filename": f.filename or "upload",
            "content_type": f.content_type or "application/octet-stream",
            "file_size_bytes": len(file_bytes),
            "status": "processing",
            "sensitivity_tier": 2,  # default; updated after extraction
        }).execute()

        record = (insert_result.data or [{}])[0]
        upload_id = record.get("id")

        try:
            extraction = await process_document(
                file_bytes=file_bytes,
                content_type=f.content_type or "",
                filename=f.filename or "upload",
                user_id=current_user.id,
            )

            supabase.table("document_uploads").update({
                "status": "ready",
                "sensitivity_tier": extraction.sensitivity_tier,
                "extracted_summary": extraction.summary,
                "extracted_domains": extraction.domains,
                "action_items": [
                    {"title": a.title, "domain": a.domain, "item_type": a.item_type}
                    for a in extraction.action_items
                ],
            }).eq("id", upload_id).eq("user_id", current_user.id).execute()

            results.append({
                "id": upload_id,
                "filename": f.filename,
                "status": "ready",
                "sensitivity_tier": extraction.sensitivity_tier,
                "summary": extraction.summary,
                "domains": extraction.domains,
                "action_items": [
                    {"title": a.title, "domain": a.domain, "item_type": a.item_type}
                    for a in extraction.action_items
                ],
            })

        except Exception as e:
            log.error("Document processing failed for %s: %s", f.filename, e)
            supabase.table("document_uploads").update({
                "status": "error",
                "error_message": str(e)[:500],
            }).eq("id", upload_id).eq("user_id", current_user.id).execute()
            results.append({
                "id": upload_id,
                "filename": f.filename,
                "status": "error",
                "error_message": "Processing failed. Please try again.",
            })

    return {"uploads": results}


@router.get("/upload/{upload_id}/status")
async def get_upload_status(
    upload_id: str,
    current_user: User = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    result = supabase.table("document_uploads").select(
        "id, filename, status, sensitivity_tier, extracted_summary, extracted_domains, action_items, error_message"
    ).eq("id", upload_id).eq("user_id", current_user.id).single().execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Upload not found.")
    return result.data


@router.post("/upload/{upload_id}/confirm")
async def confirm_upload(
    upload_id: str,
    body: ConfirmRequest,
    current_user: User = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """Persist confirmed action items as tasks/goals/entries. Single logical transaction."""
    # Verify ownership + ready status
    check = supabase.table("document_uploads").select("id, status").eq(
        "id", upload_id
    ).eq("user_id", current_user.id).single().execute()

    if not check.data:
        raise HTTPException(status_code=404, detail="Upload not found.")
    if check.data.get("status") not in ("ready",):
        raise HTTPException(status_code=409, detail="Upload not in 'ready' state.")

    created = await confirm_extraction(
        upload_id=upload_id,
        confirmed_action_items=body.confirmed_items,
        user_id=current_user.id,
        supabase=supabase,
    )

    return {
        "confirmed": True,
        "created_count": len(created),
        "created": created,
    }


@router.post("/upload/{upload_id}/skip")
async def skip_upload(
    upload_id: str,
    body: SkipRequest,
    current_user: User = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    supabase.table("document_uploads").update({
        "status": "skipped",
    }).eq("id", upload_id).eq("user_id", current_user.id).execute()
    return {"skipped": True}


@router.get("/uploads")
async def list_uploads(
    current_user: User = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """Return upload metadata only — no raw extracted text."""
    result = supabase.table("document_uploads").select(
        "id, filename, content_type, file_size_bytes, status, sensitivity_tier, "
        "extracted_summary, extracted_domains, created_at, confirmed_at"
    ).eq("user_id", current_user.id).order("created_at", desc=True).limit(50).execute()

    return {"uploads": result.data or []}
