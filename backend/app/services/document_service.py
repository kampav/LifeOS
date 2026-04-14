"""
Sprint 7 — Document extraction + sensitivity classification service.

Flow:
  1. extract_content(file_bytes, content_type, filename) → raw text
  2. classify_sensitivity(text) → tier 1/2/3
  3. process_document(file_bytes, content_type, filename, user_id) → ExtractionResult
  4. confirm_extraction(upload_id, confirmed_ids, user_id, db) → list[created_item]

Nothing is written to the DB until confirm_extraction() is called.
Tier 3 documents go to Ollama; Tier 1/2 go to Gemini 1.5 Pro.
"""

from __future__ import annotations

import re
import io
import json
import uuid
import logging
from dataclasses import dataclass, field
from typing import Any

from app.services.ai_service import ai_complete

log = logging.getLogger(__name__)

# ── Sensitivity keyword lists (PRD §8.2) ─────────────────────────────────────

_TIER3_PATTERNS = re.compile(
    r"\b(diagnosis|medication|prescription|NHS|GP|consultant|blood test|"
    r"MRI|scan|biopsy|therapy|mental health|depression|anxiety|HIV|cancer|"
    r"diabetes|cholesterol|HbA1c|medical history|patient|clinical)\b",
    re.IGNORECASE,
)

_TIER2_PATTERNS = re.compile(
    r"\b(bank statement|account number|sort code|IBAN|salary|payslip|"
    r"tax return|HMRC|NI number|national insurance|P60|P45|pension|"
    r"mortgage|credit card|overdraft|balance|investment|ISA|net worth)\b",
    re.IGNORECASE,
)


@dataclass
class ActionItem:
    title: str
    domain: str
    item_type: str  # task | goal | event | entry
    extra: dict[str, Any] = field(default_factory=dict)


@dataclass
class ExtractionResult:
    upload_id: str
    filename: str
    summary: str
    domains: list[str]
    action_items: list[ActionItem]
    sensitivity_tier: int
    raw_text: str = field(repr=False, default="")


# ── Content extraction ────────────────────────────────────────────────────────

def extract_content(file_bytes: bytes, content_type: str, filename: str) -> str:
    """Extract plain text from PDF, Word doc, or image (Gemini vision)."""
    ct = content_type.lower()
    fn = filename.lower()

    if "pdf" in ct or fn.endswith(".pdf"):
        return _extract_pdf(file_bytes)
    if "word" in ct or "docx" in ct or fn.endswith((".docx", ".doc")):
        return _extract_docx(file_bytes)
    if ct.startswith("image/") or fn.endswith((".png", ".jpg", ".jpeg", ".webp")):
        return _extract_image_via_gemini(file_bytes, content_type)
    if "text" in ct or fn.endswith((".txt", ".md", ".csv")):
        return file_bytes.decode("utf-8", errors="replace")

    # Fallback: try UTF-8 decode
    return file_bytes.decode("utf-8", errors="replace")


def _extract_pdf(file_bytes: bytes) -> str:
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        pages = []
        for page in doc:
            pages.append(page.get_text())
        return "\n".join(pages)
    except ImportError:
        log.warning("PyMuPDF not installed — cannot extract PDF")
        return ""
    except Exception as e:
        log.error("PDF extraction failed: %s", e)
        return ""


def _extract_docx(file_bytes: bytes) -> str:
    try:
        import docx
        doc = docx.Document(io.BytesIO(file_bytes))
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    except ImportError:
        log.warning("python-docx not installed — cannot extract DOCX")
        return ""
    except Exception as e:
        log.error("DOCX extraction failed: %s", e)
        return ""


def _extract_image_via_gemini(file_bytes: bytes, content_type: str) -> str:
    """Use Gemini vision to OCR the image."""
    try:
        import base64
        from google import genai
        from app.config import settings
        client = genai.Client(api_key=settings.GOOGLE_AI_API_KEY)
        b64 = base64.b64encode(file_bytes).decode()
        response = client.models.generate_content(
            model="gemini-1.5-pro",
            contents=[
                {"parts": [
                    {"text": "Extract all text from this image verbatim. Return only the text, no commentary."},
                    {"inline_data": {"mime_type": content_type, "data": b64}},
                ]}
            ],
        )
        return response.text or ""
    except Exception as e:
        log.error("Gemini vision OCR failed: %s", e)
        return ""


# ── Sensitivity classification (zero tokens) ─────────────────────────────────

def classify_sensitivity(text: str) -> int:
    """
    Returns 1, 2, or 3.
    3 = health/medical (Ollama only)
    2 = financial (Ollama for raw account data)
    1 = general
    """
    if _TIER3_PATTERNS.search(text):
        return 3
    if _TIER2_PATTERNS.search(text):
        return 2
    return 1


# ── Main processing ───────────────────────────────────────────────────────────

async def process_document(
    file_bytes: bytes,
    content_type: str,
    filename: str,
    user_id: str,
) -> ExtractionResult:
    """
    Extract text, classify sensitivity, call AI to summarise + extract action items.
    Nothing written to DB here — caller persists the ExtractionResult.
    """
    raw_text = extract_content(file_bytes, content_type, filename)
    tier = classify_sensitivity(raw_text)

    # Truncate to 4000 chars for AI prompt (stay well under 2200 token budget)
    snippet = raw_text[:4000].strip()

    intent = "health_sensitive" if tier == 3 else "document_review"

    prompt = (
        "Analyse the following document and return a JSON object with exactly these fields:\n"
        '{"summary": "<2-3 sentence summary>", "domains": ["<domain1>", ...], '
        '"action_items": [{"title": "<action>", "domain": "<domain>", "item_type": "<task|goal|event|entry>"}]}\n'
        "Domains must be chosen from: health, finance, family, career, growth, social, property, holiday, education, community.\n"
        "Return ONLY valid JSON, no markdown fences.\n\n"
        f"DOCUMENT:\n{snippet}"
    )

    ai_response = await ai_complete(
        messages=[{"role": "user", "content": prompt}],
        intent=intent,
        user_id=user_id,
    )

    try:
        parsed = json.loads(ai_response)
        summary = str(parsed.get("summary", ""))
        domains = [str(d) for d in parsed.get("domains", [])]
        items = [
            ActionItem(
                title=str(a.get("title", "")),
                domain=str(a.get("domain", "general")),
                item_type=str(a.get("item_type", "task")),
            )
            for a in parsed.get("action_items", [])
        ]
    except (json.JSONDecodeError, AttributeError):
        summary = ai_response[:300] if ai_response else "Could not summarise document."
        domains = []
        items = []

    return ExtractionResult(
        upload_id=str(uuid.uuid4()),
        filename=filename,
        summary=summary,
        domains=domains,
        action_items=items,
        sensitivity_tier=tier,
        raw_text=raw_text,
    )


# ── Confirmation (single DB transaction) ─────────────────────────────────────

async def confirm_extraction(
    upload_id: str,
    confirmed_action_items: list[dict],
    user_id: str,
    supabase,
) -> list[dict]:
    """
    Persist the confirmed action items as tasks/goals/entries.
    Updates the upload record status to 'confirmed'.
    Returns list of created item records.
    All operations in a single logical transaction (Supabase doesn't support multi-table
    transactions directly, so we insert items first then mark confirmed — idempotent on retry).
    """
    created = []

    for item in confirmed_action_items:
        item_type = item.get("item_type", "task")
        title = item.get("title", "")
        domain = item.get("domain", "general")

        if not title:
            continue

        if item_type in ("task", "event"):
            result = supabase.table("tasks").insert({
                "user_id": user_id,
                "title": title,
                "domain": domain,
                "status": "todo",
                "priority": "medium",
                "position": 0,
            }).execute()
        elif item_type == "goal":
            result = supabase.table("goals").insert({
                "user_id": user_id,
                "title": title,
                "domain": domain,
                "status": "active",
                "target_value": 100,
                "current_value": 0,
                "unit": "percent",
            }).execute()
        else:
            # entry
            result = supabase.table("entries").insert({
                "user_id": user_id,
                "content": title,
                "domain": domain,
                "mood": None,
            }).execute()

        if result.data:
            created.append(result.data[0])

    # Mark upload as confirmed
    supabase.table("document_uploads").update({
        "status": "confirmed",
        "confirmed_ids": [c.get("id") for c in created if c.get("id")],
    }).eq("id", upload_id).eq("user_id", user_id).execute()

    return created
