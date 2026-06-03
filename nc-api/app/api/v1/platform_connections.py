"""PlatformConnection CRUD endpoints — /api/v1/platform-connections."""

from __future__ import annotations

import typing as t
import uuid

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.modules.auth.deps import get_current_user
from app.modules.auth.models import User, UserRole
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


@router.get("/evolution-fetch-instances")
async def evolution_fetch_instances(
    base_url: str,
    api_key: str | None = None,
) -> list[dict[str, t.Any]]:
    """Fetch all instances from a given Evolution API server.

    Useful for the dashboard to show a dropdown instead of manual entry.
    """
    import httpx
    from loguru import logger

    base_url = base_url.rstrip("/")
    headers = {}
    if api_key:
        headers["apikey"] = api_key

    logger.info("Fetching instances from Evolution API: {url}", url=base_url)

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{base_url}/instance/fetchInstances", headers=headers)
            logger.info("Evolution API response status: {status}", status=resp.status_code)
            
            if not resp.is_success:
                logger.error("Evolution API error: {text}", text=resp.text)
                raise HTTPException(
                    status_code=resp.status_code,
                    detail=f"Evolution API error: {resp.text}",
                )
            
            data = resp.json()
            # Evolution API v2.x often returns a list directly, or a dict with instances
            if isinstance(data, list):
                return data
            if isinstance(data, dict) and "instances" in data:
                return data["instances"]
            
            logger.warning("Unexpected Evolution API response format: {data}", data=data)
            return []
    except httpx.RequestError as exc:
        logger.error("Evolution API unreachable: {exc}", exc=exc)
        raise HTTPException(
            status_code=502,
            detail=f"Evolution API unreachable: {exc}",
        )
    except Exception as exc:
        logger.exception("Unexpected error fetching instances")
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("", response_model=list[PlatformConnectionResponse])
async def list_platform_connections(
    platform_type: str | None = None,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> t.Any:
    """List all platform connections for the current tenant."""
    tenant_id = None
    if current_user.current_role != UserRole.SUPERADMIN:
        if not current_user.current_tenant_id:
            raise HTTPException(status_code=403, detail="No tenant context")
        tenant_id = current_user.current_tenant_id
        
    return await list_connections(
        session,
        tenant_id=tenant_id,
        platform_type=platform_type,
    )


@router.post("", response_model=PlatformConnectionResponse, status_code=201)
async def create_platform_connection(
    body: PlatformConnectionCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> t.Any:
    """Register a new platform connection for the current tenant."""
    if current_user.current_role != UserRole.SUPERADMIN:
        if not current_user.current_tenant_id:
            raise HTTPException(status_code=403, detail="No tenant context")
        # Ensure body tenant_id matches user context
        if body.tenant_id != current_user.current_tenant_id:
            body.tenant_id = current_user.current_tenant_id

    return await create_connection(session, body)


@router.get("/{connection_id}", response_model=PlatformConnectionResponse)
async def get_platform_connection(
    connection_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> t.Any:
    """Get a single platform connection by ID with isolation."""
    connection = await get_connection(session, connection_id)
    if not connection:
        raise HTTPException(status_code=404, detail="Platform connection not found")
    
    # Isolation
    if current_user.current_role != UserRole.SUPERADMIN:
        if connection.tenant_id != current_user.current_tenant_id:
            raise HTTPException(status_code=404, detail="Platform connection not found")
            
    return connection


@router.patch("/{connection_id}", response_model=PlatformConnectionResponse)
async def update_platform_connection(
    connection_id: uuid.UUID,
    body: PlatformConnectionUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> t.Any:
    """Update an existing platform connection with isolation."""
    connection = await get_connection(session, connection_id)
    if not connection or (
        current_user.current_role != UserRole.SUPERADMIN and 
        connection.tenant_id != current_user.current_tenant_id
    ):
        raise HTTPException(status_code=404, detail="Platform connection not found")
        
    return await update_connection(session, connection, body)


@router.delete("/{connection_id}", status_code=204, response_class=Response)
async def delete_platform_connection(
    connection_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Remove a platform connection with isolation."""
    connection = await get_connection(session, connection_id)
    if not connection or (
        current_user.current_role != UserRole.SUPERADMIN and 
        connection.tenant_id != current_user.current_tenant_id
    ):
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
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    """Register (or re-register) the Telegram webhook for this connection with isolation."""
    connection = await get_connection(session, connection_id)
    if not connection or (
        current_user.current_role != UserRole.SUPERADMIN and 
        connection.tenant_id != current_user.current_tenant_id
    ):
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
    current_user: User = Depends(get_current_user),
    base_url_override: str | None = None,
) -> dict[str, str]:
    """Register (or re-register) the Evolution API webhook for this connection with isolation."""
    connection = await get_connection(session, connection_id)
    if not connection or (
        current_user.current_role != UserRole.SUPERADMIN and 
        connection.tenant_id != current_user.current_tenant_id
    ):
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
    api_key: str = (creds.get("api_key", "") or "").strip()
    instance_name: str = (creds.get("instance_name", "") or "").strip()

    if not base_url or not instance_name:
        raise HTTPException(
            status_code=400,
            detail="base_url and instance_name are required in credentials",
        )

    # ── Build the webhook URL where Evolution should send events ───────
    public_url = (base_url_override or "").strip().rstrip("/")
    if not public_url:
        public_url = "https://nunca-cierro.up.railway.app"
    
    webhook_url = f"{public_url}/webhook/evolution/{connection_id}"

    # ── Register webhook with Evolution API ────────────────────────────
    import httpx
    from loguru import logger

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
        async with httpx.AsyncClient(timeout=15.0, verify=False) as client:
            url = f"{base_url}/webhook/set/{instance_name}"
            logger.info("Registering Evolution webhook. URL: {url} | Payload: {payload}", url=url, payload=set_webhook_payload)
            
            resp = await client.post(
                url,
                json=set_webhook_payload,
                headers=headers,
            )
            
            logger.info("Evolution response status: {status} | body: {body}", status=resp.status_code, body=resp.text)
            
            if not resp.is_success:
                raise HTTPException(
                    status_code=502,
                    detail=f"Evolution API error ({resp.status_code}): {resp.text}",
                )
            
            # Evolution often returns success even if body is empty or non-JSON
            try:
                data = resp.json()
            except Exception:
                data = {"status": "ok", "raw_response": resp.text}
                
            # Update extra_data
            extra = dict(connection.extra_data or {})
            extra["webhook_url"] = webhook_url
            extra["webhook_status"] = "registered"
            connection.extra_data = extra
            await session.commit()

            return {"status": "ok", "webhook_url": webhook_url}

    except httpx.RequestError as exc:
        logger.error("Evolution API unreachable: {exc}", exc=exc)
        raise HTTPException(
            status_code=502,
            detail=f"Evolution API unreachable: {exc}",
        ) from exc


# Moved evolution-fetch-instances to the top to avoid UUID collision
