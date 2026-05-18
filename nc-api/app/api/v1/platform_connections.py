"""PlatformConnection CRUD endpoints — /api/v1/platform-connections."""

from __future__ import annotations

import uuid
import typing as t

from fastapi import APIRouter, Depends, HTTPException
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

router = APIRouter(prefix="/platform-connections", tags=["platform-connections"])


@router.get("", response_model=list[PlatformConnectionResponse])
async def list_platform_connections(
    tenant_id: uuid.UUID | None = None,
    session: AsyncSession = Depends(get_session),
) -> t.Any:
    """List all platform connections, optionally filtered by tenant_id."""
    return await list_connections(session, tenant_id=tenant_id)


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
