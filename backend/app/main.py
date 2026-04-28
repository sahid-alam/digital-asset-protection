"""FastAPI application entry point."""

import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import assets, analytics, infringements, scan, settings as settings_router

_start_time: float = time.time()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.services.fingerprint import load_models
    load_models()
    yield


app = FastAPI(title="Digital Asset Protection API", lifespan=lifespan)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log method, path, status code, and duration for every request."""
    start = time.time()
    response = await call_next(request)
    duration_ms = round((time.time() - start) * 1000, 1)
    logger.info(
        "%s %s %s %.1fms",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(assets.router, prefix="/assets", tags=["assets"])
app.include_router(scan.router, prefix="/scan", tags=["scan"])
app.include_router(infringements.router, prefix="/infringements", tags=["infringements"])
app.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
app.include_router(settings_router.router, prefix="/settings", tags=["settings"])


@app.get("/health")
async def health() -> dict:
    """Return service health including CLIP state and Supabase connectivity."""
    from app.services.fingerprint import _model

    clip_loaded: bool = _model is not None

    supabase_connected: bool = False
    try:
        from app.core.supabase import get_supabase
        get_supabase().table("assets").select("id").limit(1).execute()
        supabase_connected = True
    except Exception:
        supabase_connected = False

    uptime_seconds: float = round(time.time() - _start_time, 1)

    return {
        "status": "ok",
        "env": settings.environment,
        "clip_loaded": clip_loaded,
        "supabase_connected": supabase_connected,
        "uptime_seconds": uptime_seconds,
    }


@app.get("/warmup")
async def warmup() -> dict:
    """Pre-warm CLIP model — call this from Railway cron to avoid cold-start hangs."""
    from app.services.fingerprint import load_models
    load_models()
    return {"status": "warm"}
