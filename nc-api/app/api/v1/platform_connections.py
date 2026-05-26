"""PlatformConnection CRUD endpoints — /api/v1/platform-connections."""

from __future__ import annotations

import typing as t
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.modules.platform_connections.schemas import (
    PlatformConnectionCreate,
    PlatformConnectionResponse,
    PlatformConnectionUpdate,
)
from app.modules.platform_connections.service import (
    create_connection,
    delete_connection,
    get_connection,
    list_connections,
    update_connection,
)
from app.modules.telegram.client import TelegramClient

router = APIRouter(prefix="/platform-connections", tags=["platform-connections"])


class TelegramTokenValidationRequest(BaseModel):
    bot_token: str


class TelegramTokenValidationResponse(BaseModel):
    valid: bool


@router.get("", response_model=list[PlatformConnectionResponse])
async def list_platform_connections(
    tenant_id: uuid.UUID | None = None,
    platform_type: str | None = None,
    session: AsyncSession = Depends(get_session),
) -> t.Any:
    """List all platform connections, optionally filtered by tenant_id."""
    return await list_connections(
        session,
        tenant_id=tenant_id,
        platform_type=platform_type,
    )


@router.post("", response_model=PlatformConnectionResponse, status_code=201)
async def create_platform_connection(
    body: PlatformConnectionCreate,
    session: AsyncSession = Depends(get_session),
) -> t.Any:
    """Register a new platform connection (credentials are encrypted)."""
    return await create_connection(session, body)


@router.get("/{connection_id}", response_model=PlatformConnectionResponse)
async def get_platform_connection(
    connection_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> t.Any:
    """Get a single platform connection by ID."""
    connection = await get_connection(session, connection_id)
    if not connection:
        raise HTTPException(status_code=404, detail="Platform connection not found")
    return connection


@router.patch("/{connection_id}", response_model=PlatformConnectionResponse)
async def update_platform_connection(
    connection_id: uuid.UUID,
    body: PlatformConnectionUpdate,
    session: AsyncSession = Depends(get_session),
) -> t.Any:
    """Update an existing platform connection."""
    connection = await get_connection(session, connection_id)
    if not connection:
        raise HTTPException(status_code=404, detail="Platform connection not found")
    return await update_connection(session, connection, body)


@router.delete("/{connection_id}", status_code=204)
async def delete_platform_connection(
    connection_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> None:
    """Remove a platform connection."""
    connection = await get_connection(session, connection_id)
    if not connection:
        raise HTTPException(status_code=404, detail="Platform connection not found")
    await delete_connection(session, connection)


@router.post("/validate-telegram-token", response_model=TelegramTokenValidationResponse)
async def validate_telegram_token(
    body: TelegramTokenValidationRequest,
) -> TelegramTokenValidationResponse:
    """Validate a Telegram bot token by calling getMe."""
    client = TelegramClient()
    try:
        response = await client.getMe(body.bot_token)
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Telegram validation failed") from exc
    return TelegramTokenValidationResponse(valid=bool(response.get("ok")))


@router.post("/{connection_id}/register-webhook")
async def register_telegram_webhook(
    connection_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    """Register (or re-register) the Telegram webhook for this connection.

    Decrypts the stored ``bot_token``, calls
    ``Telegram API /setWebhook`` with the public Railway URL,
    and saves the webhook URL in ``extra_data``.
    """
    connection = await get_connection(session, connection_id)
    if not connection:
        raise HTTPException(status_code=404, detail="Platform connection not found")

    if connection.platform_type != "telegram":
        raise HTTPException(
            status_code=400,
            detail="Webhook registration is only supported for Telegram connections",
        )

    # ── Decrypt credentials ────────────────────────────────────────────
    from app.core.encryption import decrypt

    creds = decrypt(connection.credentials)
    if not isinstance(creds, dict):
        raise HTTPException(status_code=500, detail="Invalid credential format")

    bot_token: str | None = creds.get("bot_token")
    if not bot_token:
        raise HTTPException(status_code=400, detail="No bot_token found in credentials")

    # ── Register webhook with Telegram ─────────────────────────────────
    webhook_url = (
        f"https://nunca-cierro.up.railway.app"
        f"/webhook/telegram/{connection_id}"
    )

    client = TelegramClient()
    try:
        response = await client.setWebhook(bot_token, webhook_url)
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Telegram API error: {exc}",
        ) from exc

    if not response.get("ok"):
        raise HTTPException(
            status_code=502,
            detail=response.get("description", "Telegram webhook registration failed"),
        )

    # ── Persist webhook URL in extra_data ──────────────────────────────
    extra = dict(connection.extra_data or {})
    extra["webhook_url"] = webhook_url
    extra["webhook_status"] = "registered"
    connection.extra_data = extra
    await session.commit()

    return {"status": "ok", "webhook_url": webhook_url}


# ═══════════════════════════════════════════════════════════════════════════════
# Evolution API — register webhook
# ═══════════════════════════════════════════════════════════════════════════════


@router.post("/{connection_id}/register-evolution-webhook")
async def register_evolution_webhook(
    connection_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    base_url_override: str | None = None,
) -> dict[str, str]:
    """Register (or re-register) the Evolution API webhook for this connection.

    Calls Evolution API's ``/instance/setWebhook/{instance}`` to tell
    Evolution where to forward incoming messages.

    Args:
        connection_id: The platform connection UUID.
        base_url_override: Optional override for the public-facing URL
            (defaults to ``https://nunca-cierro.up.railway.app``).

    Returns:
        Dict with registration status and webhook URL.
    """
    connection = await get_connection(session, connection_id)
    if not connection:
        raise HTTPException(status_code=404, detail="Platform connection not found")

    if connection.platform_type != "evolution":
        raise HTTPException(
            status_code=400,
            detail="Webhook registration is only supported for Evolution connections",
        )

    # ── Decrypt credentials ────────────────────────────────────────────
    from app.core.encryption import decrypt

    creds = decrypt(connection.credentials)
    if not isinstance(creds, dict):
        raise HTTPException(status_code=500, detail="Invalid credential format")

    base_url: str = (creds.get("base_url") or "").rstrip("/")
    api_key: str = creds.get("api_key", "") or ""
    instance_name: str = creds.get("instance_name", "") or ""

    if not base_url or not instance_name:
        raise HTTPException(
            status_code=400,
            detail="base_url and instance_name are required in credentials",
        )

    # ── Build the webhook URL where Evolution should send events ───────
    public_url = (
        base_url_override
        or "https://nunca-cierro.up.railway.app"
    )
    webhook_url = f"{public_url}/webhook/evolution/{connection_id}"

    # ── Register webhook with Evolution API ────────────────────────────
    import httpx

    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["apikey"] = api_key

    set_webhook_payload = {
        "webhook": {
            "url": webhook_url,
            "enabled": True,
            "events": ["MESSAGES_UPSERT"],
        }
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{base_url}/webhook/set/{instance_name}",
                json=set_webhook_payload,
                headers=headers,
            )
            data = resp.json()
            if not resp.is_success:
                raise HTTPException(
                    status_code=502,
                    detail=f"Evolution API error: {data}",
                )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Evolution API unreachable: {exc}",
        ) from exc

    # ── Persist webhook URL in extra_data ──────────────────────────────
    extra = dict(connection.extra_data or {})
    extra["webhook_url"] = webhook_url
    extra["webhook_status"] = "registered"
    connection.extra_data = extra
    await session.commit()

    return {"status": "ok", "webhook_url": webhook_url}
