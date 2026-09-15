"""Metrics and dashboard stats endpoints — /api/v1/metrics."""

from __future__ import annotations

import uuid
import typing as t
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select, case, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.modules.auth.deps import get_current_user
from app.modules.auth.models import User, UserRole
from app.modules.conversations.models import Message
from app.modules.tenants.models import Tenant

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("/dashboard")
async def dashboard_summary(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict[str, t.Any]:
    """Dashboard stats — global for superadmin, filtered for tenants.
    
    Optimized: uses 2 queries instead of 6 (tenant counts + message counts).
    """
    role = getattr(current_user, "current_role", current_user.role)
    tenant_id = getattr(current_user, "current_tenant_id", None)

    today_start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)

    if role != UserRole.SUPERADMIN:
        if not tenant_id:
            return {
                "total_tenants": 0,
                "active_tenants": 0,
                "messages_today": 0,
                "messages_total": 0,
                "messages_in": 0,
                "messages_out": 0,
            }
        
        # Single query for all message metrics (filtered by tenant)
        result = await session.execute(
            select(
                func.count(Message.id).label("total"),
                func.count(case((Message.created_at >= today_start, 1))).label("today"),
                func.count(case((Message.direction == "in", 1))).label("in_count"),
            ).where(Message.tenant_id == tenant_id)
        )
        row = result.one()
        
        return {
            "total_tenants": 1,
            "active_tenants": 1,
            "messages_today": row.today,
            "messages_total": row.total,
            "messages_in": row.in_count,
            "messages_out": row.total - row.in_count,
        }

    # Superadmin: 2 queries (tenants + messages)
    tenant_result = await session.execute(
        select(
            func.count(Tenant.id).label("total"),
            func.count(case((Tenant.status == "active", 1))).label("active"),
        )
    )
    tenant_row = tenant_result.one()

    message_result = await session.execute(
        select(
            func.count(Message.id).label("total"),
            func.count(case((Message.created_at >= today_start, 1))).label("today"),
            func.count(case((Message.direction == "in", 1))).label("in_count"),
        )
    )
    msg_row = message_result.one()

    return {
        "total_tenants": tenant_row.total,
        "active_tenants": tenant_row.active,
        "messages_today": msg_row.today,
        "messages_total": msg_row.total,
        "messages_in": msg_row.in_count,
        "messages_out": msg_row.total - msg_row.in_count,
    }


@router.get("/tenant/{tenant_id}")
async def tenant_metrics(
    tenant_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict[str, t.Any]:
    """Per-tenant metrics — single query."""
    role = getattr(current_user, "current_role", current_user.role)
    if role != UserRole.SUPERADMIN:
        if str(tenant_id) != str(getattr(current_user, "current_tenant_id", None)):
            raise HTTPException(status_code=403, detail="Forbidden")

    result = await session.execute(
        select(
            func.count(Message.id).label("total"),
            func.count(case((Message.direction == "in", 1))).label("in_count"),
        ).where(Message.tenant_id == tenant_id)
    )
    row = result.one()

    return {
        "tenant_id": str(tenant_id),
        "messages_total": row.total,
        "messages_in": row.in_count,
        "messages_out": row.total - row.in_count,
    }
