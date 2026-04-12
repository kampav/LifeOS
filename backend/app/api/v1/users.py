from fastapi import APIRouter, Depends, HTTPException
from app.security.auth import get_current_user, User
from app.models.user import ProfileCreate, ProfileUpdate, ProfileResponse
from app.db.client import get_supabase
from app.observability.logging import get_logger
from app.observability.tracing import get_tracer

router = APIRouter(prefix="/users", tags=["users"])
log = get_logger()
tracer = get_tracer()


@router.get("/me", response_model=ProfileResponse)
async def get_profile(user: User = Depends(get_current_user)):
    with tracer.start_as_current_span("get_profile"):
        sb = get_supabase()
        result = sb.table("profiles").select("*").eq("id", user.id).single().execute()
        if not result.data:
            raise HTTPException(404, "Profile not found")
        return result.data


@router.put("/me", response_model=ProfileResponse)
async def update_profile(payload: ProfileUpdate, user: User = Depends(get_current_user)):
    with tracer.start_as_current_span("update_profile"):
        sb = get_supabase()
        data = payload.model_dump(exclude_none=True)
        result = sb.table("profiles").update(data).eq("id", user.id).execute()
        log.info("profile_updated", user_id=user.id)
        return result.data[0]


@router.get("/me/score")
async def get_life_score(user: User = Depends(get_current_user)):
    from app.services.score_service import compute_life_score
    score = await compute_life_score(user.id)
    return {"score": score, "user_id": user.id}


@router.post("/onboarding")
async def complete_onboarding(payload: ProfileCreate, user: User = Depends(get_current_user)):
    sb = get_supabase()
    data = payload.model_dump()
    data["onboarding_completed"] = True
    sb.table("profiles").update(data).eq("id", user.id).execute()
    log.info("onboarding_completed", user_id=user.id)
    return {"status": "ok", "message": "Onboarding complete"}
