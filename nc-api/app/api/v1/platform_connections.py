"""PlatformConnection CRUD endpoints — /api/v1/platform-connections."""

from __future__ import annotations

import asyncio
import json
import typing as t
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_session
from app.modules.auth.deps import get_current_user, get_current_user_sse
from app.modules.auth.models import User, UserRole
from app.modules.plans.capabilities import CAP_CONNECTIONS_MANAGE
from app.modules.plans.deps import require_capability

# Managing connections requires an operator role AND a plan that includes
# connection management (professional/enterprise). Superadmin is exempt.
connections_manage = require_capability(
    CAP_CONNECTIONS_MANAGE, [UserRole.ADMIN, UserRole.SUPERADMIN]
)
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
from app.modules.platform_connections.sse import subscribe, unsubscribe
from app.modules.telegram.client import TelegramClient

router = APIRouter(prefix="/platform-connections", tags=["platform-connections"])


# ═══════════════════════════════════════════════════════════════════════════════
# SSE events — real-time connection state pushes
# ═══════════════════════════════════════════════════════════════════════════════
# Separate router: EventSource cannot send Authorization headers, so this
# endpoint authenticates via ?token= (get_current_user_sse) instead of the
# header-based admin_deps applied to the main router.

sse_router = APIRouter(prefix="/platform-connections", tags=["platform-connections"])


@sse_router.get("/{connection_id}/events")
async def platform_connection_events(
    connection_id: uuid.UUID,
    request: Request,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user_sse),
) -> StreamingResponse:
    """Subscribe to real-time events for a platform connection (SSE).

    Streams ``connection_state_changed`` events when a webhook updates the
    connection (e.g. WhatsApp QR scanned → ``state: open``). Keeps the
    stream alive with periodic comment keepalives so proxies don't close it.
    """
    connection = await get_connection(session, connection_id)
    if not connection or (
        current_user.current_role != UserRole.SUPERADMIN
        and connection.tenant_id != current_user.current_tenant_id
    ):
        raise HTTPException(status_code=404, detail="Platform connection not found")

    return StreamingResponse(
        _connection_event_generator(str(connection_id), request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


async def _connection_event_generator(
    connection_id: str,
    request: Request,
):
    """SSE generator: subscribe to the hub and stream events as they arrive.

    Emits an initial ``: connected`` comment, then ``data:`` frames for
    each event. Sends ``: keepalive`` comments every 5s of silence so
    proxies don't close idle streams. Terminates (and unsubscribes) when
    the client disconnects.
    """
    queue = subscribe(connection_id)
    try:
        yield ": connected\n\n"
        while True:
            # Check for client disconnect between polls so the generator
            # terminates (and unsubscribes) when the browser closes.
            if await request.is_disconnected():
                break
            try:
                event = await asyncio.wait_for(queue.get(), timeout=5.0)
            except asyncio.TimeoutError:
                yield ": keepalive\n\n"
                continue
            yield f"data: {json.dumps(event)}\n\n"
    finally:
        unsubscribe(connection_id, queue)


class TelegramTokenValidationRequest(BaseModel):
    bot_token: str


class TelegramTokenValidationResponse(BaseModel):
    valid: bool


def _ssrf_validate_evolution_base_url(base_url: str) -> str:
    """Validate a caller-supplied Evolution base_url against SSRF (sync part).

    Returns the hostname when the URL parses and its scheme is http(s);
    raises HTTPException(422) otherwise. Address-range checks continue in
    :func:`_ssrf_assert_public_host` (async, needs DNS resolution).
    """
    from urllib.parse import urlparse

    parsed = urlparse(base_url)
    host = parsed.hostname or ""
    if parsed.scheme not in ("http", "https") or not host:
        raise HTTPException(
            status_code=422,
            detail="base_url must be a valid http(s) URL with a hostname",
        )
    return host


async def _ssrf_assert_public_host(host: str) -> None:
    """Reject hosts that resolve to private/reserved infrastructure (SSRF).

    The configured Evolution API host (settings.evo_api_base_url) is always
    allowed — that is where production traffic goes anyway, and it may
    intentionally live on the internal Docker network.
    """
    import asyncio
    import ipaddress
    from urllib.parse import urlparse

    evo_host = urlparse(settings.evo_api_base_url).hostname or ""
    if host.lower() == evo_host.lower():
        return

    # Literal IPs are validated directly; hostnames are resolved via DNS.
    addresses: list[str] = []
    try:
        ipaddress.ip_address(host)
        addresses = [host]
    except ValueError:
        try:
            loop = asyncio.get_running_loop()
            infos = await loop.getaddrinfo(host, None)
        except OSError as exc:
            raise HTTPException(
                status_code=422,
                detail=f"base_url host could not be resolved: {exc}",
            ) from exc
        addresses = [info[4][0] for info in infos]

    for address in addresses:
        ip = ipaddress.ip_address(address)
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
            or ip.is_unspecified
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "base_url host resolves to a private, loopback or "
                    "reserved address and is not allowed"
                ),
            )


@router.get("/evolution-fetch-instances")
async def evolution_fetch_instances(
    base_url: str,
    api_key: str | None = None,
    user: User = Depends(connections_manage),
) -> list[dict[str, t.Any]]:
    """Fetch all instances from a given Evolution API server.

    Useful for the dashboard to show a dropdown instead of manual entry.

    Restricted to operator roles (same gate as connection mutations) and
    validated against SSRF: the server fetches the URL and reflects the
    body, so arbitrary or internal targets are rejected.
    """
    import httpx
    from loguru import logger

    base_url = base_url.rstrip("/")
    host = _ssrf_validate_evolution_base_url(base_url)
    await _ssrf_assert_public_host(host)
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
    current_user: User = Depends(connections_manage),
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
    current_user: User = Depends(connections_manage),
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
    current_user: User = Depends(connections_manage),
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
    current_user: User = Depends(connections_manage),
) -> TelegramTokenValidationResponse:
    """Validate a Telegram bot token by calling getMe.

    Gated behind the same operator-role/capability dependency as the other
    connection-mutation endpoints: unauthenticated server-side requests to
    third-party APIs must not be reachable by client-role users.
    """
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
    current_user: User = Depends(connections_manage),
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
    # Public base URL is configurable (WEBHOOK_PUBLIC_BASE_URL) instead of
    # a hardcoded domain — see app/core/config.py.
    webhook_url = (
        f"{settings.webhook_public_base_url}"
        f"/webhook/telegram/{connection_id}"
    )

    # Per-connection request authentication: Telegram echoes this secret in
    # the X-Telegram-Bot-Api-Secret-Token header on every update; the
    # webhook endpoint verifies it (deterministic — derived, not stored).
    from app.modules.telegram.security import telegram_webhook_secret

    client = TelegramClient()
    try:
        response = await client.setWebhook(
            bot_token, webhook_url, secret_token=telegram_webhook_secret(connection_id)
        )
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
    current_user: User = Depends(connections_manage),
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
    from app.modules.evolution.webhook_registration import (
        resolve_effective_api_key,
        set_instance_webhook,
    )

    creds = decrypt(connection.credentials)
    if not isinstance(creds, dict):
        raise HTTPException(status_code=500, detail="Invalid credential format")

    base_url: str = (creds.get("base_url") or "").rstrip("/")
    # Effective key = own credential key, else the global EVO_API_KEY (W3).
    api_key = resolve_effective_api_key(creds, settings.evo_api_key)
    instance_name: str = (creds.get("instance_name", "") or "").strip()

    if not base_url or not instance_name:
        raise HTTPException(
            status_code=400,
            detail="base_url and instance_name are required in credentials",
        )

    # ── Build the webhook URL where Evolution should send events ───────
    # Cuando Evolution API y nc-api están en el mismo Docker (Hetzner),
    # usamos la URL interna de Docker (configurable vía EVO_INTERNAL_BASE_URL).
    # El override permite apuntar a una URL pública si Evolution está en
    # otro servidor.
    public_url = (base_url_override or "").strip().rstrip("/")
    if not public_url:
        # Internal Docker network (Hetzner) — Evolution API → nc-api
        public_url = settings.evo_internal_base_url

    webhook_url = f"{public_url}/webhook/evolution/{connection_id}"

    # ── Register webhook with Evolution API (v2 payload + auth header) ──
    import httpx
    from loguru import logger

    try:
        resp = await set_instance_webhook(
            base_url, instance_name, webhook_url, api_key, verify_ssl=False
        )
    except httpx.RequestError as exc:
        logger.error("Evolution API unreachable: {exc}", exc=exc)
        raise HTTPException(
            status_code=502,
            detail=f"Evolution API unreachable: {exc}",
        ) from exc

    logger.info(
        "Evolution webhook set | status={status} | body={body}",
        status=resp.status_code,
        body=resp.text[:300],
    )
    if not resp.is_success:
        raise HTTPException(
            status_code=502,
            detail=f"Evolution API error ({resp.status_code}): {resp.text}",
        )

    # Update extra_data
    extra = dict(connection.extra_data or {})
    extra["webhook_url"] = webhook_url
    extra["webhook_status"] = "registered"
    connection.extra_data = extra
    await session.commit()

    return {"status": "ok", "webhook_url": webhook_url}



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
    current_user: User = Depends(connections_manage),
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
    from app.modules.evolution.webhook_registration import (
        build_evolution_webhook_payload,
        resolve_effective_api_key,
    )

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
    # Effective key = own credential key, else the global EVO_API_KEY (W3).
    api_key: str = resolve_effective_api_key(creds, settings.evo_api_key)
    instance_name: str = (creds.get("instance_name") or "").strip()

    # Auto-generate instance name if missing
    if not instance_name:
        instance_name = f"conn-{uuid.uuid4().hex[:12]}"
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
            webhook_url = (
                f"{settings.evo_internal_base_url}/webhook/evolution/{connection_id}"
            )

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
                    json=build_evolution_webhook_payload(webhook_url, api_key),
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
                    message="El QR no se generó a tiempo. Intenta de nuevo con ?regenerate=true",
                )

            return EvolutionConnectResponse(
                connection_id=str(connection_id),
                instance_name=instance_name,
                qrcode=qrcode,
                status="connecting",
                message="Escanea el QR con WhatsApp para conectar",
            )

    except httpx.RequestError as exc:
        logger.error("Evolution API unreachable: {exc}", exc=exc)
        raise HTTPException(
            status_code=502,
            detail=f"Evolution API no responde: {exc}",
        )


# ═══════════════════════════════════════════════════════════════════════════════
# Evolution API — pairing code (alternative to QR)
# ═══════════════════════════════════════════════════════════════════════════════


class EvolutionPairingCodeResponse(BaseModel):
    """Response from the connect-evolution-pairing endpoint."""

    connection_id: str
    instance_name: str
    pairing_code: str | None = None
    status: str  = ""
    message: str = ""


@router.post("/{connection_id}/connect-evolution-pairing")
async def connect_evolution_pairing(
    connection_id: uuid.UUID,
    phone_number: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(connections_manage),
) -> EvolutionPairingCodeResponse:
    """Generate a pairing code instead of a QR.

    The user enters this code in WhatsApp → Linked Devices
    → Link a Device → 'Link using phone number'.

    Flow:
    1. Creates the Evolution API instance (if not exists)
    2. Calls pairing endpoint with the phone number
    3. Returns the 8-character pairing code
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
            detail="connect-evolution-pairing is only supported for evolution connections",
        )

    # ── 2. Decrypt and prepare credentials ──────────────────────────────
    creds = decrypt(connection.credentials)
    if not isinstance(creds, dict):
        raise HTTPException(status_code=500, detail="Invalid credential format")

    base_url: str = (creds.get("base_url") or settings.evo_api_base_url).rstrip("/")
    api_key: str = creds.get("api_key", "") or settings.evo_api_key
    instance_name: str = (creds.get("instance_name") or "").strip()

    if not instance_name:
        instance_name = f"conn-{uuid.uuid4().hex[:12]}"
        creds["instance_name"] = instance_name
        connection.credentials = encrypt(creds)
        await session.commit()

    headers = {"Content-Type": "application/json", "apikey": api_key}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            # ── 3. Create instance if not exists ───────────────────────────
            create_payload = {
                "instanceName": instance_name,
                "qrcode": False,
                "integration": "WHATSAPP-BAILEYS",
            }

            logger.info(
                "Creating Evolution instance for pairing | name={name} | conn={conn}",
                name=instance_name,
                conn=connection_id,
            )

            create_resp = await client.post(
                f"{base_url}/instance/create",
                json=create_payload,
                headers=headers,
            )

            if create_resp.is_success:
                logger.info("Evolution instance created | name={name}", name=instance_name)
                await asyncio.sleep(2)
            elif create_resp.status_code in (409, 403):
                logger.info("Evolution instance already exists | name={name}", name=instance_name)
            else:
                logger.error(
                    "Evolution instance creation failed | status={s} | body={b}",
                    s=create_resp.status_code,
                    b=create_resp.text[:300],
                )
                raise HTTPException(
                    status_code=502,
                    detail=f"Evolution API error ({create_resp.status_code}): {create_resp.text[:300]}",
                )

            # ── 4. Call pairing endpoint ───────────────────────────────────
            # Evolution API v2.x: POST /instance/connect/{name}
            # with {"number": "57xxx", "pairingCode": true}
            pairing_payload = {
                "number": phone_number,
                "pairingCode": True,
            }

            logger.info(
                "Requesting pairing code for {name} | number={num}",
                name=instance_name,
                num=phone_number,
            )

            pairing_resp = await client.post(
                f"{base_url}/instance/connect/{instance_name}",
                json=pairing_payload,
                headers=headers,
            )

            if pairing_resp.is_success:
                data = pairing_resp.json()
                # Evolution API returns pairing code in various shapes
                pairing_code = (
                    data.get("pairingCode")
                    or data.get("code")
                    or data.get("pairing_code")
                    or ""
                )

                if pairing_code:
                    # Save state
                    extra = dict(connection.extra_data or {})
                    extra["instance_name"] = instance_name
                    extra["base_url"] = base_url
                    extra["connection_status"] = "awaiting_pairing"
                    extra["pairing_code"] = pairing_code
                    connection.extra_data = extra
                    await session.commit()

                    logger.info(
                        "Pairing code generated for {name} | code={code}",
                        name=instance_name,
                        code=pairing_code,
                    )

                    return EvolutionPairingCodeResponse(
                        connection_id=str(connection_id),
                        instance_name=instance_name,
                        pairing_code=pairing_code,
                        status="pairing",
                        message=(
                            "Código de 8 dígitos generado. El cliente debe ir a "
                            "WhatsApp → Dispositivos vinculados → Vincular dispositivo "
                            "e ingresar este código."
                        ),
                    )
                else:
                    # Check if already connected
                    status = data.get("status", "")
                    if status in ("open", "connected", "syncing"):
                        extra = dict(connection.extra_data or {})
                        extra["connection_status"] = "connected"
                        extra["instance_name"] = instance_name
                        connection.extra_data = extra
                        await session.commit()
                        return EvolutionPairingCodeResponse(
                            connection_id=str(connection_id),
                            instance_name=instance_name,
                            status=status,
                            message="WhatsApp ya está conectado",
                        )

                    logger.warning(
                        "Pairing response missing code | data={data}",
                        data=data,
                    )
                    return EvolutionPairingCodeResponse(
                        connection_id=str(connection_id),
                        instance_name=instance_name,
                        status="error",
                        message=f"Evolution API no devolvió código: {data}",
                    )

            else:
                error_body = pairing_resp.text[:300]
                logger.error(
                    "Pairing code request failed | status={s} | body={b}",
                    s=pairing_resp.status_code,
                    b=error_body,
                )
                raise HTTPException(
                    status_code=502,
                    detail=f"Error al generar código ({pairing_resp.status_code}): {error_body}",
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
    current_user: User = Depends(connections_manage),
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
