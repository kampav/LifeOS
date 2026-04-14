"""
Sprint 8 — Health data API.

Tier 3 — ALL data stays local. AI responses use Ollama (health_sensitive intent).
No raw health data is ever sent to Claude or Gemini cloud models.

Endpoints:
  GET/POST /health/appointments
  GET/POST /health/medications
  POST     /health/medications/{id}/taken
  GET      /health/screenings
  GET      /health/vaccinations
  POST     /health/vaccinations
"""
from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.security.auth import get_current_user, User
from app.db.client import get_supabase
from app.security.disclaimers import HEALTH_DISCLAIMER

router = APIRouter(prefix="/health", tags=["health"])

# Age-appropriate NHS screening schedule (PRD §8.3)
NHS_SCREENINGS = [
    {"type": "blood_pressure", "name": "Blood Pressure Check", "frequency_months": 60, "min_age": 40, "nhs": True},
    {"type": "cholesterol", "name": "Cholesterol Check", "frequency_months": 60, "min_age": 40, "nhs": True},
    {"type": "bowel_cancer", "name": "Bowel Cancer Screening", "frequency_months": 24, "min_age": 60, "nhs": True},
    {"type": "breast_cancer", "name": "Breast Screening (Mammogram)", "frequency_months": 36, "min_age": 50, "nhs": True},
    {"type": "cervical", "name": "Cervical Screening (Smear)", "frequency_months": 36, "min_age": 25, "nhs": True},
    {"type": "diabetic_eye", "name": "Diabetic Eye Screening", "frequency_months": 12, "min_age": 12, "nhs": True},
    {"type": "aaa", "name": "Abdominal Aortic Aneurysm (AAA)", "frequency_months": None, "min_age": 65, "nhs": True},
    {"type": "dental", "name": "Dental Check-up", "frequency_months": 12, "min_age": 0, "nhs": False},
    {"type": "eye_test", "name": "Eye Test", "frequency_months": 24, "min_age": 0, "nhs": False},
]


class AppointmentIn(BaseModel):
    title: str
    appointment_type: str = "gp"
    scheduled_at: datetime
    location: Optional[str] = None
    provider_name: Optional[str] = None
    notes: Optional[str] = None


class MedicationIn(BaseModel):
    name: str
    dosage: Optional[str] = None
    frequency: str = "daily"
    times_of_day: list[str] = ["morning"]
    start_date: date = date.today()
    end_date: Optional[date] = None
    prescriber: Optional[str] = None
    notes: Optional[str] = None


class MedicationTakenIn(BaseModel):
    was_taken: bool = True
    notes: Optional[str] = None


class VaccinationIn(BaseModel):
    vaccine_name: str
    date_given: date
    next_due_date: Optional[date] = None
    batch_number: Optional[str] = None
    provider: Optional[str] = None
    notes: Optional[str] = None


# ── Appointments ──────────────────────────────────────────────────────────────

@router.get("/appointments")
async def list_appointments(
    upcoming_only: bool = False,
    current_user: User = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    q = supabase.table("medical_appointments").select("*").eq("user_id", current_user.id)
    if upcoming_only:
        q = q.gte("scheduled_at", datetime.now(timezone.utc).isoformat())
    result = q.order("scheduled_at").execute()
    return {"appointments": result.data or [], "disclaimer": HEALTH_DISCLAIMER}


@router.post("/appointments", status_code=status.HTTP_201_CREATED)
async def create_appointment(
    body: AppointmentIn,
    current_user: User = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    VALID_TYPES = {"gp", "specialist", "dental", "optical", "therapy", "physio", "other"}
    if body.appointment_type not in VALID_TYPES:
        raise HTTPException(status_code=400, detail=f"appointment_type must be one of: {VALID_TYPES}")

    result = supabase.table("medical_appointments").insert({
        "user_id": current_user.id,
        "title": body.title,
        "appointment_type": body.appointment_type,
        "scheduled_at": body.scheduled_at.isoformat(),
        "location": body.location,
        "provider_name": body.provider_name,
        "notes": body.notes,
        "status": "scheduled",
    }).execute()

    return (result.data or [{}])[0]


# ── Medications ───────────────────────────────────────────────────────────────

@router.get("/medications")
async def list_medications(
    active_only: bool = True,
    current_user: User = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    q = supabase.table("medications").select("*").eq("user_id", current_user.id)
    if active_only:
        q = q.eq("is_active", True)
    result = q.order("name").execute()
    return {"medications": result.data or [], "disclaimer": HEALTH_DISCLAIMER}


@router.post("/medications", status_code=status.HTTP_201_CREATED)
async def create_medication(
    body: MedicationIn,
    current_user: User = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    result = supabase.table("medications").insert({
        "user_id": current_user.id,
        "name": body.name,
        "dosage": body.dosage,
        "frequency": body.frequency,
        "times_of_day": body.times_of_day,
        "start_date": body.start_date.isoformat(),
        "end_date": body.end_date.isoformat() if body.end_date else None,
        "prescriber": body.prescriber,
        "notes": body.notes,
        "is_active": True,
    }).execute()

    return (result.data or [{}])[0]


@router.post("/medications/{med_id}/taken", status_code=status.HTTP_201_CREATED)
async def log_medication_taken(
    med_id: str,
    body: MedicationTakenIn,
    current_user: User = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """Daily tick — log whether medication was taken."""
    # Verify ownership
    check = supabase.table("medications").select("id").eq(
        "id", med_id
    ).eq("user_id", current_user.id).single().execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Medication not found.")

    result = supabase.table("medication_logs").insert({
        "user_id": current_user.id,
        "medication_id": med_id,
        "taken_at": datetime.now(timezone.utc).isoformat(),
        "was_taken": body.was_taken,
        "notes": body.notes,
    }).execute()

    return {"logged": True, "record": (result.data or [{}])[0]}


# ── Screenings ────────────────────────────────────────────────────────────────

@router.get("/screenings")
async def get_screenings(
    current_user: User = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """Return NHS schedule + any custom user screening records."""
    user_screenings = supabase.table("health_screenings").select("*").eq(
        "user_id", current_user.id
    ).execute()

    # Merge NHS list with user-specific records
    user_types = {s["screening_type"] for s in (user_screenings.data or [])}
    schedule = []
    for nhs in NHS_SCREENINGS:
        user_rec = next((s for s in (user_screenings.data or []) if s["screening_type"] == nhs["type"]), None)
        schedule.append({
            **nhs,
            "last_done_date": user_rec.get("last_done_date") if user_rec else None,
            "next_due_date": user_rec.get("next_due_date") if user_rec else None,
        })

    # Custom screenings not in NHS list
    custom = [s for s in (user_screenings.data or []) if s["screening_type"] not in {n["type"] for n in NHS_SCREENINGS}]

    return {
        "nhs_schedule": schedule,
        "custom_screenings": custom,
        "disclaimer": HEALTH_DISCLAIMER,
    }


# ── Vaccinations ──────────────────────────────────────────────────────────────

@router.get("/vaccinations")
async def list_vaccinations(
    current_user: User = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    result = supabase.table("vaccinations").select("*").eq(
        "user_id", current_user.id
    ).order("date_given", desc=True).execute()
    return {"vaccinations": result.data or [], "disclaimer": HEALTH_DISCLAIMER}


@router.post("/vaccinations", status_code=status.HTTP_201_CREATED)
async def add_vaccination(
    body: VaccinationIn,
    current_user: User = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    result = supabase.table("vaccinations").insert({
        "user_id": current_user.id,
        "vaccine_name": body.vaccine_name,
        "date_given": body.date_given.isoformat(),
        "next_due_date": body.next_due_date.isoformat() if body.next_due_date else None,
        "batch_number": body.batch_number,
        "provider": body.provider,
        "notes": body.notes,
    }).execute()

    return (result.data or [{}])[0]
