"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import assets, analytics, infringements, scan


@asynccontextmanager
async def lifespan(app: FastAPI):
    # load CLIP models here
    yield


app = FastAPI(title="Digital Asset Protection API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(assets.router, prefix="/assets", tags=["assets"])
app.include_router(scan.router, prefix="/scan", tags=["scan"])
app.include_router(infringements.router, prefix="/infringements", tags=["infringements"])
app.include_router(analytics.router, prefix="/analytics", tags=["analytics"])


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "env": settings.environment}
