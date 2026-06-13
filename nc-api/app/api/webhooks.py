"""Webhook endpoints — platform-agnostic message ingress.

Legacy (backward-compat):
- ``GET /webhook`` — WhatsApp verification handshake
- ``POST /webhook`` — WhatsApp message ingestion (unchanged)

Platform-generic:
- ``POST /webhook/{platform}/{connection_id}`` — validated + routed by platform
"""

from __future__ import annotations

import typing as t
import uuid as uuid_pkg

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import PlainTextResponse
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_session
from app.modules.integrations.meta.client import verify_webhook
from app.modules.integrations.webhook import handle_incoming
from app.modules.platform_connections.service import get_connection
from app.modules.platforms.adapter import WhatsAppAdapter
from app.modules.telegram.adapter import TelegramAdapter
from app.modules.telegram.handler import handle_telegram_incoming
from app.modules.evolution.adapter import EvolutionAdapter
from app.modules.evolution.handler import handle_evolution_incoming

router = APIRouter(tags=["webhook"])

VALID_PLATFORMS = {"whatsapp", "telegram", "evolution"}


# ═══════════════════════════════════════════════════════════════════════════════
# Legacy — WhatsApp verification (GET)
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/webhook")
async def webhook_get(
    request: Request,
) -> str:
    """WhatsApp Cloud API webhook verification (GET).

    Meta sends this during setup with ``hub.mode``, ``hub.verify_token``,
    and ``hub.challenge``.  We echo the challenge back to confirm ownership.
    """
    params = dict(request.query_params)
    logger.info("Webhook GET params={params}", params=params)

    mode = params.get("hub.mode", "")
    token = params.get("hub.verify_token", "")
    challenge = params.get("hub.challenge", "")

    result = await verify_webhook(mode, token, challenge)
    if result is not None:
        return PlainTextResponse(result)

    raise HTTPException(status_code=403, detail="Verification failed")


# ═══════════════════════════════════════════════════════════════════════════════
# Legacy — WhatsApp message ingestion (POST) — unchanged
# ═══════════════════════════════════════════════════════════════════════════════


@router.post("/webhook")
async def webhook_post(
    payload: dict[str, t.Any],
    session: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    """Receive incoming WhatsApp messages (POST).

    Processes each text message:
    1. Resolve tenant from ``phone_number_id``
    2. Save message to DB
    3. Generate AI response
    4. Send via WhatsApp API
    5. Save response to DB
    """
    logger.debug("Webhook POST received | keys={keys}", keys=list(payload.keys()))

    try:
        await handle_incoming(payload, session)
    except Exception:
        logger.exception("Unhandled error processing webhook payload")
        # Always return 200 — Evolution/WhatsApp retry on non-200, causing
        # infinite loops, duplicate messages, and AI quota waste.
        return {"status": "error", "detail": "Internal processing error"}

    return {"status": "ok"}


# ═══════════════════════════════════════════════════════════════════════════════
# Platform-generic webhook — POST /webhook/{platform}/{connection_id}
# ═══════════════════════════════════════════════════════════════════════════════


@router.post("/webhook/{platform}/{connection_id}")
async def webhook_platform_post(
    platform: str,
    connection_id: str,
    payload: dict[str, t.Any],
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    """Receive and route an incoming webhook for any supported platform.

    Validation flow:
    1. **Platform check** — ``400`` if *platform* is unsupported.
    2. **Connection lookup** — ``404`` if *connection_id* is unknown.
    3. **Platform-specific validation** — ``401`` (WhatsApp bad signature)
       or ``403`` (Telegram inactive connection).
    4. **Handler dispatch** — delegates to the platform-specific message
       handler for processing.
    """
    # ── 1. Platform check ───────────────────────────────────────────────
    if platform not in VALID_PLATFORMS:
        logger.warning("Unsupported platform={platform}", platform=platform)
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported platform: {platform}",
        )

    # ── 2. Connection lookup ────────────────────────────────────────────
    try:
        conn_uuid = uuid_pkg.UUID(connection_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid connection_id")

    connection = await get_connection(session, conn_uuid)
    if connection is None:
        raise HTTPException(status_code=404, detail="Connection not found")

    # ── 3. Platform-specific validation ─────────────────────────────────
    if platform == "whatsapp":
        adapter = WhatsAppAdapter()
        # Normalise header keys to lowercase — HTTP transports may vary casing
        raw_headers = {k.lower(): v for k, v in request.headers.items()}
        valid = await adapter.validate_webhook(
            payload,
            raw_headers,
            app_secret=settings.whatsapp_token or "",
        )
        if not valid:
            raise HTTPException(
                status_code=401,
                detail="Invalid signature",
            )

        # Extra: WhatsApp inactive check after signature validation
        if connection.status != "active":
            raise HTTPException(
                status_code=403,
                detail="Connection inactive",
            )

        # ── 4. Dispatch ─────────────────────────────────────────────────
        try:
            await handle_incoming(payload, session)
        except Exception:
            logger.exception("Unhandled error in WhatsApp handler")
            return {"status": "error", "detail": "Internal processing error"}

    elif platform == "telegram":
        adapter = TelegramAdapter()
        valid = await adapter.validate_webhook(
            payload,
            dict(request.headers),
            connection_status=connection.status,
        )
        if not valid:
            raise HTTPException(
                status_code=403,
                detail="Connection inactive",
            )

        # ── 4. Dispatch ─────────────────────────────────────────────────
        try:
            await handle_telegram_incoming(payload, connection, session)
        except Exception:
            logger.exception("Unhandled error in Telegram handler")
            return {"status": "error", "detail": "Internal processing error"}

    elif platform == "evolution":
        adapter = EvolutionAdapter()
        valid = await adapter.validate_webhook(
            payload,
            dict(request.headers),
            connection=connection,
        )
        if not valid:
            raise HTTPException(
                status_code=403,
                detail="Webhook validation failed",
            )

        # ── 4. Dispatch ─────────────────────────────────────────────────
        try:
            await handle_evolution_incoming(payload, connection, session)
        except Exception:
            logger.exception("Unhandled error in Evolution handler")
            return {"status": "error", "detail": "Internal processing error"}

    return {"status": "ok"}
