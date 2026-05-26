"""NuncaCierro — FastAPI application entry point (v2).

This is the MAIN entry point.  Run with::

    uvicorn app.main:app --reload --port 8000

It includes:
- ``/api/v1/...``  → Full admin API (CRUD tenants, numbers, agents, etc.)
- ``/webhook``      → WhatsApp Cloud API webhook (uses DB)
- ``/``             → Health check

The old ``main.py`` (root) is kept for backward compatibility only.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.api.v1.router import router as v1_router
from app.api.webhooks import router as webhook_router
from app.core.config import settings
from app.db.session import engine


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan — startup/shutdown hooks."""
    logger.info("Starting {name} v2", name=settings.app_name)

    # Verify DB connection on startup
    try:
        async with engine.connect() as conn:
            await conn.execute(
                __import__("sqlalchemy").text("SELECT 1")
            )
            logger.info("Database connection OK")
    except Exception as exc:
        logger.warning("Database not available yet: {exc}", exc=exc)

    yield

    # Shutdown
    await engine.dispose()
    logger.info("Shutting down {name}", name=settings.app_name)


app = FastAPI(
    title=settings.app_name,
    version="2.0.0",
    lifespan=lifespan,
)

# ── CORS ────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ─────────────────────────────────────────────────────────────

# v1 Admin API
app.include_router(v1_router)

# Webhook (WhatsApp incoming messages)
app.include_router(webhook_router)


# ── Root health ─────────────────────────────────────────────────────────

@app.get("/")
async def root() -> dict:
    return {
        "service": settings.app_name,
        "version": "2.0.0",
        "status": "ok",
        "endpoints": {
            "admin_api": "/api/v1/",
            "webhook": "/webhook",
            "webhook_platform": "/webhook/{platform}/{connection_id}",
        },
        "platforms": ["whatsapp", "telegram", "evolution"],
    }


# ── Entry point (``python -m app.main``) ────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.app_host,
        port=settings.app_port,
        reload=True,
        log_level=settings.log_level.lower(),
    )
