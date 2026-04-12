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
from app.api.v1 import users, entries, goals, habits, domains, social, notifications, ai_coach

app.include_router(users.router, prefix="/api/v1")
app.include_router(entries.router, prefix="/api/v1")
app.include_router(goals.router, prefix="/api/v1")
app.include_router(habits.router, prefix="/api/v1")
app.include_router(domains.router, prefix="/api/v1")
app.include_router(social.router, prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")
app.include_router(ai_coach.router, prefix="/api/v1")


# ── Health + Metrics ─────────────────────────────────────────────────────────
@app.get("/health", tags=["system"])
async def health():
    return {"status": "ok", "version": settings.APP_VERSION, "environment": settings.ENVIRONMENT}


@app.get("/metrics", include_in_schema=False)
async def metrics():
    return metrics_endpoint()


log.info("life_os_started", version=settings.APP_VERSION, env=settings.ENVIRONMENT)
