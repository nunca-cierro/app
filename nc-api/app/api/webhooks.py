"""Webhook endpoints — platform-agnostic message ingress.

- ``GET /webhook`` — WhatsApp verification handshake (Meta setup)
- ``POST /webhook/{platform}/{connection_id}`` — validated + routed by platform

The legacy unauthenticated ``POST /webhook`` route was REMOVED (security:
it resolved the tenant from attacker-supplied ``phone_number_id`` with no
signature validation). Meta Cloud webhooks must use
``POST /webhook/whatsapp/{connection_id}`` with signature verification.
"""

from __future__ import annotations

import json
import typing as t
import uuid as uuid_pkg

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from fastapi.responses import PlainTextResponse
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_session
from app.modules.engine.debounce import schedule_debounced_processing
from app.modules.engine.schemas import InboundMessage
from app.modules.evolution.adapter import EvolutionAdapter
from app.modules.evolution.handler import (
    handle_evolution_connection_update,
    handle_evolution_incoming,
)
from app.modules.evolution.webhook import extract_evolution_message
from app.modules.integrations.meta.client import verify_webhook
from app.modules.integrations.webhook import handle_incoming
from app.modules.platform_connections.service import get_connection
from app.modules.platforms.adapter import WhatsAppAdapter
from app.modules.telegram.adapter import TelegramAdapter
from app.modules.telegram.handler import handle_telegram_incoming
from app.modules.telegram.webhook import extract_telegram_message

router = APIRouter(tags=["webhook"])

VALID_PLATFORMS = {"whatsapp", "telegram", "evolution"}


# ═══════════════════════════════════════════════════════════════════════════════
# WhatsApp verification handshake (GET)
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
# Platform-generic webhook — POST /webhook/{platform}/{connection_id}
# ═══════════════════════════════════════════════════════════════════════════════


@router.post("/webhook/{platform}/{connection_id}")
async def webhook_platform_post(
    platform: str,
    connection_id: str,
    request: Request,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    """Receive and route an incoming webhook for any supported platform.

    Validation flow:
    1. **Platform check** — ``400`` if *platform* is unsupported.
    2. **Connection lookup** — ``404`` if *connection_id* is unknown.
    3. **Body parse** — ``400`` if the body is not valid JSON.
    4. **Platform-specific validation** — ``401`` (WhatsApp bad signature or
       unconfigured app secret) or ``403`` (Telegram secret mismatch /
       inactive connection).
    5. **Handler dispatch** — delegates to the platform-specific message
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

    # ── 3. Read + parse the RAW body ────────────────────────────────────
    # Signature verification must cover the exact bytes the platform sent,
    # so the body is read raw and parsed here (not via FastAPI's model
    # binding, which only exposes a re-serializable dict).
    raw_body = await request.body()
    try:
        payload: dict[str, t.Any] = json.loads(raw_body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    # ── 4. Platform-specific validation ─────────────────────────────────
    if platform == "whatsapp":
        adapter = WhatsAppAdapter()
        # Fail CLOSED when the Meta App Secret is unset: without it the
        # HMAC cannot be verified and anyone could forge deliveries.
        app_secret = settings.whatsapp_app_secret or ""
        if not app_secret:
            logger.warning(
                "WHATSAPP_APP_SECRET is NOT configured — rejecting Meta Cloud "
                "webhook (fail-closed). Set it to the App Secret from "
                "developers.facebook.com (App Settings > Basic); it is NOT "
                "the access token. Existing Meta Cloud deployments MUST set "
                "WHATSAPP_APP_SECRET or WhatsApp ingestion stays down."
            )
            raise HTTPException(
                status_code=401,
                detail="Webhook secret not configured",
            )

        # Normalise header keys to lowercase — HTTP transports may vary casing
        raw_headers = {k.lower(): v for k, v in request.headers.items()}
        valid = await adapter.validate_webhook(
            payload,
            raw_headers,
            app_secret=app_secret,
            raw_body=raw_body,
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

        # ── 5. Dispatch ─────────────────────────────────────────────────
        try:
            await handle_incoming(payload, session)
        except Exception:
            logger.exception("Unhandled error in WhatsApp handler")
            raise HTTPException(status_code=500, detail="Internal processing error")

    elif platform == "telegram":
        adapter = TelegramAdapter()
        valid = await adapter.validate_webhook(
            payload,
            dict(request.headers),
            connection=connection,
            connection_status=connection.status,
        )
        if not valid:
            raise HTTPException(
                status_code=403,
                detail="Webhook validation failed",
            )

        # ── 5. Dispatch (non-blocking debounce with fallback) ───────────
        try:
            tg_msg = extract_telegram_message(payload)
            if tg_msg:
                inbound = InboundMessage(
                    platform_connection_id=connection.id,
                    platform="telegram",
                    external_user_id=tg_msg["external_user_id"],
                    external_message_id=tg_msg["external_message_id"],
                    content=tg_msg["content"],
                    from_me=False,
                    remote_jid=tg_msg["external_user_id"],
                    raw_payload=payload,
                )
                try:
                    await schedule_debounced_processing(
                        inbound=inbound,
                        adapter=adapter,
                        background_tasks=background_tasks,
                    )
                except Exception as db_exc:
                    logger.debug("Telegram debounce failed, falling back to direct handling: {e}", e=db_exc)
                    await handle_telegram_incoming(payload, connection, session)
            else:
                await handle_telegram_incoming(payload, connection, session)
        except Exception:
            logger.exception("Unhandled error in Telegram handler")
            raise HTTPException(status_code=500, detail="Internal processing error")

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

        # ── 4. Dispatch (non-blocking debounce with fallback) ───────────
        try:
            if payload.get("event") == "connection.update":
                await handle_evolution_connection_update(payload, connection, session)
            else:
                evo_msg = extract_evolution_message(payload)
                if evo_msg and not evo_msg.get("from_me"):
                    inbound = InboundMessage(
                        platform_connection_id=connection.id,
                        platform="evolution",
                        external_user_id=evo_msg["external_user_id"],
                        external_message_id=evo_msg["external_message_id"],
                        content=evo_msg["content"],
                        from_me=False,
                        remote_jid=evo_msg.get("remote_jid"),
                        raw_payload=payload,
                    )
                    try:
                        await schedule_debounced_processing(
                            inbound=inbound,
                            adapter=adapter,
                            background_tasks=background_tasks,
                        )
                    except Exception as db_exc:
                        logger.debug("Evolution debounce failed, falling back to direct handling: {e}", e=db_exc)
                        await handle_evolution_incoming(payload, connection, session)
                else:
                    await handle_evolution_incoming(payload, connection, session)
        except Exception:
            logger.exception("Unhandled error in Evolution handler")
            raise HTTPException(
                status_code=500,
                detail="Evolution webhook processing failed",
            )

    return {"status": "ok"}
