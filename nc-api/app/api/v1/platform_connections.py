"""PlatformConnection CRUD endpoints — /api/v1/platform-connections."""

from __future__ import annotations

import typing as t
import uuid

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.modules.auth.deps import RoleChecker, get_current_user
from app.modules.auth.models import User, UserRole

admin_or_super = RoleChecker(allowed_roles=[UserRole.ADMIN, UserRole.SUPERADMIN])
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


class EvolutionConnectionStateResponse(BaseModel):
    """Response from the evolution-connection-state endpoint."""

    instance_name: str
    state: str  # open | connecting | close | qrread | undefined
    status: str  # connected | connecting | disconnected | unknown
    details: dict[str, t.Any] = {}


@router.get("/{connection_id}/evolution-connection-state")
async def evolution_connection_state(
    connection_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> EvolutionConnectionStateResponse:
    """Check the real connection state of an Evolution instance.

    Calls Evolution API's ``/instance/connectionState/{name}`` to get
    the actual WhatsApp connection status, not our cached one.
    """
    import httpx
    from loguru import logger

    from app.core.config import settings
    from app.core.encryption import decrypt

    connection = await get_connection(session, connection_id)
    if not connection or (
        current_user.current_role != UserRole.SUPERADMIN
        and connection.tenant_id != current_user.current_tenant_id
    ):
        raise HTTPException(status_code=404, detail="Platform connection not found")

    if connection.platform_type != "evolution":
        raise HTTPException(
            status_code=400,
            detail="Only supported for evolution connections",
        )

    creds = decrypt(connection.credentials)
    if not isinstance(creds, dict):
        raise HTTPException(status_code=500, detail="Invalid credential format")

    base_url: str = (creds.get("base_url") or settings.evo_api_base_url).rstrip("/")
    api_key: str = creds.get("api_key", "") or settings.evo_api_key
    instance_name: str = (creds.get("instance_name") or "").strip()

    if not instance_name:
        return EvolutionConnectionStateResponse(
            instance_name="",
            state="undefined",
            status="disconnected",
            details={"error": "No instance name configured"},
        )

    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["apikey"] = api_key

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{base_url}/instance/connectionState/{instance_name}",
                headers=headers,
            )

            if not resp.is_success:
                logger.warning(
                    "Evolution connectionState failed | status={s} | body={b}",
                    s=resp.status_code,
                    b=resp.text[:200],
                )
                return EvolutionConnectionStateResponse(
                    instance_name=instance_name,
                    state="undefined",
                    status="unknown",
                    details={"http_status": resp.status_code, "error": resp.text[:200]},
                )

            data = resp.json()

            # Evolution API v2.x returns state in different shapes:
            # {"state": "open"}, {"instance": {...}}, etc.
            raw_state = (
                data.get("state")
                or (data.get("instance") or {}).get("state")
                or "undefined"
            )

            status_map = {
                "open": "connected",
                "connecting": "connecting",
                "close": "disconnected",
                "qrread": "connecting",
            }
            mapped_status = status_map.get(raw_state, "unknown")

            return EvolutionConnectionStateResponse(
                instance_name=instance_name,
                state=raw_state,
                status=mapped_status,
                details=data,
            )

    except httpx.RequestError as exc:
        logger.error("Evolution API unreachable: {exc}", exc=exc)
        return EvolutionConnectionStateResponse(
            instance_name=instance_name,
            state="undefined",
            status="unknown",
            details={"error": f"Evolution API unreachable: {exc}"},
        )

    except Exception as exc:
        logger.exception("Unexpected error checking connection state")
        return EvolutionConnectionStateResponse(
            instance_name=instance_name,
            state="undefined",
            status="unknown",
            details={"error": str(exc)},
        )


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
    current_user: User = Depends(admin_or_super),
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
    current_user: User = Depends(admin_or_super),
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
    current_user: User = Depends(admin_or_super),
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
    current_user: User = Depends(admin_or_super),
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
    current_user: User = Depends(admin_or_super),
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
    # Cuando Evolution API y nc-api están en el mismo Docker (Hetzner),
    # usamos la URL interna de Docker. El override permite apuntar a
    # una URL pública si Evolution está en otro servidor.
    public_url = (base_url_override or "").strip().rstrip("/")
    if not public_url:
        # Internal Docker network (Hetzner) — Evolution API → nc-api
        public_url = "http://nc-api:8000"

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
            "webhookByEvents": True,
            "webhookBase64": False,
            "events": [
                "MESSAGES_UPSERT",
                "CONNECTION_UPDATE",
                "QRCODE_UPDATED",
            ],
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



# ═══════════════════════════════════════════════════════════════════════════════
# Evolution API — connect instance (create + get QR)
# ═══════════════════════════════════════════════════════════════════════════════


class EvolutionConnectResponse(BaseModel):
    """Response from the connect-evolution endpoint."""

    connection_id: str
    instance_name: str
    qrcode: str | None = None
    status: str  # connecting | connected | error
    message: str = ""


@router.post("/{connection_id}/connect-evolution")
async def connect_evolution(
    connection_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(admin_or_super),
    regenerate: bool = False,  # query param: force QR regeneration
) -> EvolutionConnectResponse:
    """Create an Evolution API instance and return the QR code.

    Flow:
    1. Validates the PlatformConnection exists (type=evolution)
    2. Creates the instance in Evolution API (POST /instance/create)
    3. Polls for the QR code (GET /instance/connect/{name})
    4. Registers the webhook so messages flow to nc-api
    5. Returns the QR code as base64 for the frontend to display

    The QR must be scanned with WhatsApp within the configured time
    (QRCODE_LIMIT=30 generations). After scanning, the connection
    switches to 'connected' automatically.
    """
    import asyncio

    import httpx
    from loguru import logger

    from app.core.config import settings
    from app.core.encryption import decrypt, encrypt

    # ── 1. Get connection ───────────────────────────────────────────────
    connection = await get_connection(session, connection_id)
    if not connection or (
        current_user.current_role != UserRole.SUPERADMIN
        and connection.tenant_id != current_user.current_tenant_id
    ):
        raise HTTPException(status_code=404, detail="Platform connection not found")

    if connection.platform_type != "evolution":
        raise HTTPException(
            status_code=400,
            detail="connect-evolution is only supported for evolution connections",
        )

    # ── 2. Decrypt and prepare credentials ──────────────────────────────
    creds = decrypt(connection.credentials)
    if not isinstance(creds, dict):
        raise HTTPException(status_code=500, detail="Invalid credential format")

    base_url: str = (creds.get("base_url") or settings.evo_api_base_url).rstrip("/")
    api_key: str = creds.get("api_key", "") or settings.evo_api_key
    instance_name: str = (creds.get("instance_name") or "").strip()

    # Auto-generate instance name if missing
    if not instance_name:
        instance_name = f"conn-{shortuuid.uuid()[:12]}"
        # Persist the generated name back to credentials
        creds["instance_name"] = instance_name
        connection.credentials = encrypt(creds)
        await session.commit()

    headers = {"Content-Type": "application/json", "apikey": api_key}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            # ── 3. Create instance in Evolution API ───────────────────────
            # Try to create — if it already exists (409), continue to get QR
            instance_created = False
            webhook_url = f"http://nc-api:8000/webhook/evolution/{connection_id}"

            create_payload: dict[str, t.Any] = {
                "instanceName": instance_name,
                "qrcode": True,
                "integration": "WHATSAPP-BAILEYS",
            }

            logger.info(
                "Creating Evolution instance | name={name} | conn={conn}",
                name=instance_name,
                conn=connection_id,
            )

            create_resp = await client.post(
                f"{base_url}/instance/create",
                json=create_payload,
                headers=headers,
            )

            if create_resp.is_success:
                instance_created = True
                logger.info(
                    "Evolution instance created | name={name}",
                    name=instance_name,
                )
            elif create_resp.status_code in (409, 403):
                # 409 = already exists (v1), 403 = already in use (v2)
                logger.info(
                    "Evolution instance already exists | name={name}",
                    name=instance_name,
                )
            else:
                logger.error(
                    "Evolution instance creation failed | status={s} | body={b}",
                    s=create_resp.status_code,
                    b=create_resp.text[:300],
                )
                raise HTTPException(
                    status_code=502,
                    detail=(
                        f"Evolution API error creating instance "
                        f"({create_resp.status_code}): {create_resp.text[:300]}"
                    ),
                )

            # ── 4. Configure webhook (separate call, more reliable in v2) ──
            try:
                webhook_resp = await client.post(
                    f"{base_url}/webhook/set/{instance_name}",
                    json={
                        "webhook": {
                            "url": webhook_url,
                            "enabled": True,
                            "webhookByEvents": True,
                            "webhookBase64": False,
                            "events": [
                                "MESSAGES_UPSERT",
                                "CONNECTION_UPDATE",
                                "QRCODE_UPDATED",
                            ],
                        }
                    },
                    headers=headers,
                )
                if webhook_resp.is_success:
                    logger.info(
                        "Evolution webhook configured | name={name}",
                        name=instance_name,
                    )
                else:
                    logger.warning(
                        "Evolution webhook set failed | status={s} | body={b}",
                        s=webhook_resp.status_code,
                        b=webhook_resp.text[:200],
                    )
            except Exception:
                logger.exception("Error configuring Evolution webhook")

            # ── 5. Wait for instance to initialise ─────────────────────────
            if instance_created:
                await asyncio.sleep(2)

            # ── 6. Get QR code ────────────────────────────────────────────
            # Evolution API may need a moment to generate the QR.
            # We poll a few times with short intervals.
            qrcode: str | None = None
            max_attempts = 15  # ~30 seconds total
            poll_interval = 2  # seconds

            for attempt in range(1, max_attempts + 1):
                try:
                    connect_resp = await client.get(
                        f"{base_url}/instance/connect/{instance_name}",
                        headers=headers,
                    )

                    if connect_resp.is_success:
                        data = connect_resp.json()

                        # Evolution API returns QR in different shapes
                        # depending on the state. Common patterns:
                        # - {"base64": "data:image/png;base64,..."}
                        # - {"qrcode": {"base64": "..."}}
                        # - {"status": "connecting", "qrcode": {...}}
                        raw_qr = (
                            data.get("base64")
                            or (data.get("qrcode") or {}).get("base64")
                            or (data.get("qrcode") or {}).get("code")
                            or None
                        )

                        if raw_qr:
                            # Strip any data URI prefix — we store/send raw base64
                            if raw_qr.startswith("data:image"):
                                raw_qr = raw_qr.split(",", 1)[-1]
                            qrcode = raw_qr
                            logger.info(
                                "QR code obtained for {name} | attempt={a}",
                                name=instance_name,
                                a=attempt,
                            )
                            break

                        # Check if already connected (no QR needed)
                        status = data.get("status", "")
                        if status in ("open", "connected", "syncing"):
                            logger.info(
                                "Instance {name} already connected | status={s}",
                                name=instance_name,
                                s=status,
                            )
                            # Save connection status so dashboard shows it
                            extra = dict(connection.extra_data or {})
                            extra["connection_status"] = "connected"
                            extra["instance_name"] = instance_name
                            connection.extra_data = extra
                            await session.commit()
                            return EvolutionConnectResponse(
                                connection_id=str(connection_id),
                                instance_name=instance_name,
                                qrcode=None,
                                status=status,
                                message="WhatsApp ya está conectado",
                            )

                    logger.debug(
                        "QR not ready for {name} | attempt={a}/{m}",
                        name=instance_name,
                        a=attempt,
                        m=max_attempts,
                    )
                except httpx.RequestError as exc:
                    logger.warning(
                        "Evolution API poll error for {name}: {exc}",
                        name=instance_name,
                        exc=exc,
                    )

                await asyncio.sleep(poll_interval)

            # ── 7. Save connection state (including QR image) ─────────────
            extra = dict(connection.extra_data or {})
            extra["instance_name"] = instance_name
            extra["base_url"] = base_url  # needed by frontend (credentials are encrypted)
            extra["qrcode_obtained"] = bool(qrcode)
            if qrcode:
                extra["connection_status"] = "awaiting_scan"
                extra["qrcode_image"] = qrcode  # persist so page refresh shows QR
            connection.extra_data = extra
            await session.commit()

            if not qrcode:
                logger.warning(
                    "QR code not available for {name} after {max} attempts",
                    name=instance_name,
                    max=max_attempts,
                )
                return EvolutionConnectResponse(
                    connection_id=str(connection_id),
                    instance_name=instance_name,
                    qrcode=None,
                    status="timeout",
                    message="El QR no se generó a tiempo. Intentá de nuevo con ?regenerate=true",
                )

            return EvolutionConnectResponse(
                connection_id=str(connection_id),
                instance_name=instance_name,
                qrcode=qrcode,
                status="connecting",
                message="Escaneá el QR con WhatsApp para conectar",
            )

    except httpx.RequestError as exc:
        logger.error("Evolution API unreachable: {exc}", exc=exc)
        raise HTTPException(
            status_code=502,
            detail=f"Evolution API no responde: {exc}",
        )



# ═══════════════════════════════════════════════════════════════════════════════
# Evolution API — disconnect / delete instance
# ═══════════════════════════════════════════════════════════════════════════════


@router.post("/{connection_id}/disconnect-evolution")
async def disconnect_evolution(
    connection_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(admin_or_super),
) -> dict[str, str]:
    """Logout + delete the Evolution API instance AND the platform connection."""
    import httpx
    from loguru import logger

    from app.core.config import settings
    from app.core.encryption import decrypt

    connection = await get_connection(session, connection_id)
    if not connection or (
        current_user.current_role != UserRole.SUPERADMIN
        and connection.tenant_id != current_user.current_tenant_id
    ):
        raise HTTPException(status_code=404, detail="Platform connection not found")

    if connection.platform_type != "evolution":
        raise HTTPException(
            status_code=400,
            detail="disconnect-evolution is only supported for evolution connections",
        )

    # ── Decrypt credentials ────────────────────────────────────────────
    creds = decrypt(connection.credentials)
    if not isinstance(creds, dict):
        raise HTTPException(status_code=500, detail="Invalid credential format")

    base_url: str = (creds.get("base_url") or settings.evo_api_base_url).rstrip("/")
    api_key: str = creds.get("api_key", "") or settings.evo_api_key
    instance_name: str = (creds.get("instance_name") or "").strip()

    if not instance_name:
        # Nothing to delete on Evolution side
        await delete_connection(session, connection)
        return {"status": "deleted", "detail": "No Evolution instance to delete"}

    headers = {"Content-Type": "application/json", "apikey": api_key}
    errors: list[str] = []

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # ── 1. Logout (disconnect WhatsApp) ────────────────────────
            try:
                logout_resp = await client.post(
                    f"{base_url}/instance/logout/{instance_name}",
                    headers=headers,
                )
                if logout_resp.is_success:
                    logger.info("Evolution instance logged out | name={name}", name=instance_name)
                else:
                    logger.warning(
                        "Evolution logout warning | status={s} | body={b}",
                        s=logout_resp.status_code,
                        b=logout_resp.text[:200],
                    )
            except Exception as exc:
                logger.warning("Evolution logout failed (non-fatal): {exc}", exc=exc)
                errors.append(f"logout: {exc}")

            # ── 2. Delete instance from Evolution API ──────────────────
            try:
                del_resp = await client.delete(
                    f"{base_url}/instance/delete/{instance_name}",
                    headers=headers,
                )
                if del_resp.is_success or del_resp.status_code == 404:
                    logger.info("Evolution instance deleted | name={name}", name=instance_name)
                else:
                    logger.warning(
                        "Evolution delete warning | status={s} | body={b}",
                        s=del_resp.status_code,
                        b=del_resp.text[:200],
                    )
            except Exception as exc:
                logger.warning("Evolution delete failed (non-fatal): {exc}", exc=exc)
                errors.append(f"delete: {exc}")

    except httpx.RequestError as exc:
        logger.error("Evolution API unreachable during disconnect: {exc}", exc=exc)
        # Still delete from our DB — Evolution instance will be orphaned
        errors.append(f"Evolution unreachable: {exc}")

    # ── 3. Delete platform connection from our DB ──────────────────────
    await delete_connection(session, connection)
    logger.info("Platform connection deleted | id={id}", id=connection_id)

    detail = "Instancia eliminada de Evolution y del sistema"
    if errors:
        detail += f" (con advertencias: {'; '.join(errors)})"

    return {"status": "deleted", "detail": detail}


# Moved evolution-fetch-instances to the top to avoid UUID collision
"""⚠️ DO NOT add more routes after this line — they would collide with /{connection_id} routes."""
