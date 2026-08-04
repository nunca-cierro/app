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

import re
from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.api.v1.router import router as v1_router
from app.api.webhooks import router as webhook_router
from app.core.config import settings
from app.db.session import engine

# Matches credentials inside URLs (scheme://user:pass@...) so DB exceptions
# (which embed the DSN, including the password) never leak secrets to logs.
_DSN_CREDENTIALS_RE = re.compile(r"://[^/@\s]+@")


def _safe_exc(exc: Exception) -> str:
    """Exception message with embedded URL credentials redacted."""
    return _DSN_CREDENTIALS_RE.sub("://***@", str(exc))


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
        logger.warning("Database not available yet: {exc}", exc=_safe_exc(exc))

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
# Origins are configured via CORS_ORIGINS env var (JSON array).
# When set to ["*"] (dev default), credentials are disabled for security.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials="*" not in settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ─────────────────────────────────────────────────────────────

# v1 Admin API
app.include_router(v1_router)

# Webhook (WhatsApp incoming messages)
app.include_router(webhook_router)


# ── Global exception handlers ────────────────────────────────────────────

@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError) -> JSONResponse:
    """Catch duplicate keys / constraint violations and return 409 instead of 500."""
    logger.error(f"IntegrityError on {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=409,
        content={"detail": "Ya existe un recurso con ese identificador único."},
    )


# ── Health / readiness probes ──────────────────────────────────────────

@app.get("/health")
async def health() -> dict:
    """Liveness probe — the process is up and serving requests.

    Deliberately does NOT touch the database or any external service:
    liveness must stay cheap and never fail because of a dependency.
    """
    return {
        "status": "ok",
        "service": settings.app_name,
        "version": app.version,
    }


@app.get("/ready")
async def ready() -> JSONResponse:
    """Readiness probe — verifies the database connection (SELECT 1).

    Only asserts what is actually checked: if the DB is reachable the app
    can serve webhooks. It does NOT claim health of dependencies that are
    not verified here (Evolution API, Redis, Groq, …).
    """
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception as exc:
        logger.warning("Readiness check failed: {exc}", exc=_safe_exc(exc))
        return JSONResponse(
            status_code=503,
            content={"status": "not_ready", "database": "error"},
        )
    return JSONResponse(
        status_code=200,
        content={"status": "ready", "database": "ok"},
    )


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
