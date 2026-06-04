"""Business logic for PlatformConnection CRUD — handles credential encryption."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from fastapi import HTTPException

from app.core.encryption import decrypt, encrypt
from app.modules.agents.models import AiAgent
from app.modules.platform_connections.models import PlatformConnection
from app.modules.platform_connections.schemas import (
    PlatformConnectionCreate,
    PlatformConnectionUpdate,
)


async def list_connections(
    session: AsyncSession,
    tenant_id: uuid.UUID | None = None,
    platform_type: str | None = None,
) -> list[PlatformConnection]:
    """Return all platform connections, optionally filtered by tenant."""
    query = select(PlatformConnection).order_by(PlatformConnection.created_at.desc())
    if tenant_id:
        query = query.where(PlatformConnection.tenant_id == tenant_id)
    if platform_type:
        query = query.where(PlatformConnection.platform_type == platform_type)
    result = await session.execute(query)
    return list(result.scalars().all())


async def get_connection(
    session: AsyncSession,
    connection_id: uuid.UUID,
) -> PlatformConnection | None:
    """Get a single connection by ID."""
    return await session.get(PlatformConnection, connection_id)


async def create_connection(
    session: AsyncSession,
    data: PlatformConnectionCreate,
) -> PlatformConnection:
    """Create a new platform connection with encrypted credentials."""
    if data.agent_id:
        agent = await session.get(AiAgent, data.agent_id)
        if agent and agent.tenant_id != data.tenant_id:
            raise HTTPException(
                status_code=400,
                detail="Agent belongs to a different tenant",
            )

    # ── Auto-fill Evolution API credentials from settings ─────────────
    # El admin no necesita saber la URL interna de Docker ni la API key.
    # El backend las completa automáticamente desde la configuración.
    if data.platform_type == "evolution":
        from app.core.config import settings as app_settings

        creds = dict(data.credentials) if data.credentials else {}
        if not creds.get("base_url"):
            creds["base_url"] = app_settings.evo_api_base_url
        if not creds.get("api_key"):
            creds["api_key"] = app_settings.evo_api_key
        if not creds.get("instance_name"):
            creds["instance_name"] = f"conn-{uuid.uuid4().hex[:12]}"
        data.credentials = creds

    connection = PlatformConnection(
        tenant_id=data.tenant_id,
        platform_type=data.platform_type,
        display_name=data.display_name,
        credentials=encrypt(data.credentials),
        extra_data=data.extra_data,
        status=data.status,
        is_primary=data.is_primary,
        agent_id=data.agent_id,
    )
    session.add(connection)
    await session.commit()
    await session.refresh(connection)
    return connection


async def update_connection(
    session: AsyncSession,
    connection: PlatformConnection,
    data: PlatformConnectionUpdate,
) -> PlatformConnection:
    """Update a platform connection, re-encrypting credentials if provided."""
    update_data = data.model_dump(exclude_unset=True)

    if "agent_id" in update_data and update_data["agent_id"] is not None:
        agent = await session.get(AiAgent, update_data["agent_id"])
        if agent and agent.tenant_id != connection.tenant_id:
            raise HTTPException(
                status_code=400,
                detail="Agent belongs to a different tenant",
            )

    if "credentials" in update_data and update_data["credentials"] is not None:
        update_data["credentials"] = encrypt(update_data["credentials"])
    for field, value in update_data.items():
        setattr(connection, field, value)
    await session.commit()
    await session.refresh(connection)
    return connection


async def delete_connection(
    session: AsyncSession,
    connection: PlatformConnection,
) -> None:
    """Delete a platform connection and all related messages/conversations."""
    from app.modules.conversations.models import Conversation, Message

    # Delete messages referencing this connection
    await session.execute(
        Message.__table__.delete().where(
            Message.platform_connection_id == connection.id
        )
    )

    # Delete conversations referencing this connection
    await session.execute(
        Conversation.__table__.delete().where(
            Conversation.platform_connection_id == connection.id
        )
    )

    await session.delete(connection)
    await session.commit()
