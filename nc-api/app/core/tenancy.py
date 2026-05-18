"""Tenant resolution — platform-aware multi-tenant lookup.

Supports two resolution strategies:

1. **Webhook-based** (``resolve_by_webhook``): given a validated
   ``connection_id``, looks up the ``PlatformConnection`` and returns
   the owning tenant.  Fast and deterministic — used after webhook
   validation is complete.

2. **Credential-based** (``resolve_by_platform``): given a platform
   name and a credentials dict, iterates active connections for that
   platform and tries to match the credential fields (e.g.,
   ``phone_number_id`` for WhatsApp, ``bot_token`` for Telegram).

The old ``resolve_by_phone_number_id`` is kept as a backward-compatible
wrapper that delegates to ``resolve_by_platform("whatsapp", …)``.
"""

from __future__ import annotations

import typing as t

from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.platform_connections.models import PlatformConnection
from app.modules.tenants.models import Tenant


class TenantResolution(t.NamedTuple):
    """Result of a tenant lookup."""

    tenant: Tenant
    whatsapp_number: t.Any | None = None  # WhatsAppNumber — backward compat
    agent: t.Any | None = None  # AiAgent — imported lazily to avoid cycles
    prompts: list[t.Any] = []  # list[Prompt]
    platform_connection: t.Any | None = None  # PlatformConnection


# ── Credential-based resolution ───────────────────────────────────────────


async def resolve_by_platform(
    session: AsyncSession,
    platform: str,
    credentials: dict[str, t.Any],
) -> TenantResolution | None:
    """Resolve a tenant by matching *credentials* against active
    ``PlatformConnection`` records for the given *platform*.

    Decrypts each matching connection's credentials and checks whether
    the key-value pairs in *credentials* are a subset of the stored
    credentials.

    Returns ``None`` if no match is found.
    """
    from app.core.encryption import decrypt  # lazy import

    result = await session.execute(
        select(PlatformConnection).where(
            PlatformConnection.platform_type == platform,
            PlatformConnection.status == "active",
        )
    )
    connections = list(result.scalars().all())

    for conn in connections:
        try:
            stored = decrypt(conn.credentials)
        except Exception:
            logger.warning(
                "Failed to decrypt credentials for connection {id}",
                id=conn.id,
            )
            continue

        if not isinstance(stored, dict):
            continue

        # Check if all provided credential fields match
        if all(stored.get(k) == v for k, v in credentials.items()):
            return await _build_resolution(session, conn, conn.tenant_id)

    return None


# ── Webhook-based resolution ──────────────────────────────────────────────


async def resolve_by_webhook(
    session: AsyncSession,
    platform: str,
    connection_id: str,
    payload: dict[str, t.Any],
) -> TenantResolution | None:
    """Resolve a tenant from a webhook's ``connection_id``.

    Looks up the ``PlatformConnection`` by ID, verifies it is active
    and matches the expected *platform*, then returns the resolution.

    The *payload* is accepted for future extensibility (e.g., extracting
    extra metadata) but is not currently used.

    Returns ``None`` if the connection is unknown, inactive, or platform
    doesn't match.
    """
    import uuid

    try:
        conn_id = uuid.UUID(connection_id)
    except ValueError:
        logger.warning("Invalid connection_id={cid}", cid=connection_id)
        return None

    connection = await session.get(PlatformConnection, conn_id)
    if connection is None:
        logger.warning("PlatformConnection {id} not found", id=connection_id)
        return None

    if connection.status != "active":
        logger.warning(
            "PlatformConnection {id} is {status} — skipping",
            id=connection_id,
            status=connection.status,
        )
        return None

    if connection.platform_type != platform:
        logger.warning(
            "Platform mismatch: expected {expected}, got {got}",
            expected=platform,
            got=connection.platform_type,
        )
        return None

    return await _build_resolution(session, connection, connection.tenant_id)


# ── Backward-compat wrapper ───────────────────────────────────────────────


async def resolve_by_phone_number_id(
    session: AsyncSession,
    phone_number_id: str,
) -> TenantResolution | None:
    """Backward-compat wrapper — resolves using the old WhatsAppNumber model.

    Delegates to ``resolve_by_platform("whatsapp", …)`` under the hood.
    """
    logger.warning(
        "Deprecation: resolve_by_phone_number_id is deprecated — "
        "use resolve_by_platform('whatsapp', ...) or resolve_by_webhook instead"
    )
    return await resolve_by_platform(
        session, "whatsapp", {"phone_number_id": phone_number_id}
    )


# ── Internal helpers ──────────────────────────────────────────────────────


async def _build_resolution(
    session: AsyncSession,
    connection: PlatformConnection,
    tenant_id: t.Any,
) -> TenantResolution | None:
    """Load the tenant, agent, and prompts for *tenant_id*."""
    tenant = await session.get(Tenant, tenant_id)
    if tenant is None or tenant.status != "active":
        logger.warning(
            "Tenant {tid} not found or inactive for connection {cid}",
            tid=tenant_id,
            cid=connection.id,
        )
        return None

    # Lazy imports to avoid circular dependencies
    from app.modules.agents.models import AiAgent, Prompt

    agent_result = await session.execute(
        select(AiAgent).where(
            AiAgent.tenant_id == tenant.id,
            AiAgent.enabled == True,
        )
    )
    agent = agent_result.scalar_one_or_none()

    prompts_result = await session.execute(
        select(Prompt).where(
            Prompt.tenant_id == tenant.id,
            Prompt.active == True,
        )
    )
    prompts = list(prompts_result.scalars().all())

    return TenantResolution(
        tenant=tenant,
        whatsapp_number=None,
        agent=agent,
        prompts=prompts,
        platform_connection=connection,
    )
