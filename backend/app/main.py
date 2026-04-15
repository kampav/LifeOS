from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
import time
import structlog

from app.config import settings
from app.observability.logging import configure_logging
from app.observability.tracing import configure_tracing
from app.observability.metrics import metrics_endpoint, API_LATENCY, ERROR_RATE

# Configure logging and tracing before anything else
configure_logging()
configure_tracing()

log = structlog.get_logger()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# ── Middleware ──────────────────────────────────────────────────────────────
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
}


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    t0 = time.time()
    response = await call_next(request)
    latency = time.time() - t0
    for k, v in SECURITY_HEADERS.items():
        response.headers[k] = v
    API_LATENCY.labels(endpoint=request.url.path, method=request.method).observe(latency)
    if response.status_code >= 400:
        ERROR_RATE.labels(endpoint=request.url.path, status_code=response.status_code).inc()
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    log.error("unhandled_exception", path=request.url.path, error=str(exc), exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# ── Routers ─────────────────────────────────────────────────────────────────
from app.api.v1 import users, entries, goals, habits, domains, social, notifications, ai_coach, personalisation, mcp, tasks, planner, homescreen, documents, finance, health_data, privacy, assets, vault

app.include_router(users.router, prefix="/api/v1")
app.include_router(entries.router, prefix="/api/v1")
app.include_router(goals.router, prefix="/api/v1")
app.include_router(habits.router, prefix="/api/v1")
app.include_router(domains.router, prefix="/api/v1")
app.include_router(social.router, prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")
app.include_router(ai_coach.router, prefix="/api/v1")
app.include_router(personalisation.router, prefix="/api/v1")
app.include_router(mcp.router, prefix="/api/v1")
app.include_router(tasks.router, prefix="/api/v1")
app.include_router(planner.router, prefix="/api/v1")
app.include_router(homescreen.router, prefix="/api/v1")
app.include_router(documents.router, prefix="/api/v1")
app.include_router(finance.router, prefix="/api/v1")
app.include_router(health_data.router, prefix="/api/v1")
app.include_router(privacy.router, prefix="/api/v1")
app.include_router(assets.router, prefix="/api/v1")
app.include_router(vault.router, prefix="/api/v1")


# ── Convenience aliases ──────────────────────────────────────────────────────
from fastapi import Depends as _Depends
from app.security.auth import get_current_user as _get_user, User as _User
from app.services.score_service import compute_life_score as _life_score, compute_domain_score as _domain_score

DOMAIN_LIST = ["health", "family", "education", "social", "finance", "career", "growth", "property", "holiday", "community"]


@app.get("/api/v1/profile", tags=["profile"])
async def get_profile_alias(user: _User = _Depends(_get_user)):
    from app.db.client import get_supabase
    sb = get_supabase()
    r = sb.table("profiles").select("*").eq("id", user.id).single().execute()
    return r.data or {}


@app.put("/api/v1/profile", tags=["profile"])
async def update_profile_alias(payload: dict, user: _User = _Depends(_get_user)):
    from app.db.client import get_supabase
    sb = get_supabase()
    r = sb.table("profiles").update(payload).eq("id", user.id).execute()
    return r.data[0] if r.data else {}


@app.get("/api/v1/scores/all", tags=["scores"])
async def get_all_scores(user: _User = _Depends(_get_user)):
    import asyncio
    scores = await asyncio.gather(*[_domain_score(user.id, d) for d in DOMAIN_LIST])
    domain_scores = dict(zip(DOMAIN_LIST, scores))
    life_score = await _life_score(user.id)
    return {"life_score": life_score, "domain_scores": domain_scores}


# ── Health + Metrics ─────────────────────────────────────────────────────────
@app.get("/health", tags=["system"])
async def health():
    return {"status": "ok", "version": settings.APP_VERSION, "environment": settings.ENVIRONMENT}


@app.get("/metrics", include_in_schema=False)
async def metrics():
    return metrics_endpoint()


log.info("life_os_started", version=settings.APP_VERSION, env=settings.ENVIRONMENT)
