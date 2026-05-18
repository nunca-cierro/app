"""Metrics and dashboard stats endpoints — /api/v1/metrics."""

from __future__ import annotations

import uuid
import typing as t
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.modules.conversations.models import Message
from app.modules.tenants.models import Tenant

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("/dashboard")
async def dashboard_summary(
    session: AsyncSession = Depends(get_session),
) -> dict[str, t.Any]:
    """Global dashboard stats — tenant count, message volume, etc."""
    # Total tenants
    tenant_count_result = await session.execute(select(func.count(Tenant.id)))
    total_tenants = tenant_count_result.scalar() or 0

    # Active tenants
    active_result = await session.execute(
        select(func.count(Tenant.id)).where(Tenant.status == "active")
    )
    active_tenants = active_result.scalar() or 0

    # Messages today
    today_start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
    messages_today_result = await session.execute(
        select(func.count(Message.id)).where(Message.created_at >= today_start)
    )
    messages_today = messages_today_result.scalar() or 0

    # Messages total
    messages_total_result = await session.execute(select(func.count(Message.id)))
    messages_total = messages_total_result.scalar() or 0

    # In/out split
    in_result = await session.execute(
        select(func.count(Message.id)).where(Message.direction == "in")
    )
    messages_in = in_result.scalar() or 0
    messages_out = messages_total - messages_in

    return {
        "total_tenants": total_tenants,
        "active_tenants": active_tenants,
        "messages_today": messages_today,
        "messages_total": messages_total,
        "messages_in": messages_in,
        "messages_out": messages_out,
    }


@router.get("/tenant/{tenant_id}")
async def tenant_metrics(
    tenant_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> dict[str, t.Any]:
    """Per-tenant metrics."""
    messages_total_result = await session.execute(
        select(func.count(Message.id)).where(Message.tenant_id == tenant_id)
    )
    total = messages_total_result.scalar() or 0

    in_result = await session.execute(
        select(func.count(Message.id)).where(
            Message.tenant_id == tenant_id, Message.direction == "in"
        )
    )
    messages_in = in_result.scalar() or 0

    return {
        "tenant_id": str(tenant_id),
        "messages_total": total,
        "messages_in": messages_in,
        "messages_out": total - messages_in,
    }
