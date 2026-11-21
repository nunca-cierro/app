"""Tenant business logic — service layer."""

from __future__ import annotations

import calendar
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.modules.auth.models import PaymentStatus, TenantStatus
from app.modules.tenants.models import Tenant


def calculate_calendar_month_expiry(base_dt: datetime) -> datetime:
    """Calculate the exact calendar month expiration.

    For example:
    - Nov 21 -> Dec 21
    - Jan 31 -> Feb 28 (or Feb 29 in leap years)
    """
    year = base_dt.year + (base_dt.month // 12)
    month = (base_dt.month % 12) + 1
    max_day = calendar.monthrange(year, month)[1]
    day = min(base_dt.day, max_day)
    return base_dt.replace(year=year, month=month, day=day)


# ── Payment status toggle ─────────────────────────────────────────────────────


async def update_payment_status(
    tenant_id: uuid.UUID,
    payment_status: str,
    session: AsyncSession,
) -> Tenant:
    """Toggle a tenant's payment status.

    On ``active``: sets ``plan_activated_at`` and calculates ``plan_expires_at`` for 1 calendar month.
    On ``inactive``: clears ``plan_activated_at`` and ``plan_expires_at`` to None.
    Raises HTTPException 404 if the tenant does not exist.
    """
    tenant = await session.get(Tenant, tenant_id)
    if tenant is None:
        raise HTTPException(status_code=404, detail="Tenant not found")

    tenant.payment_status = payment_status

    if payment_status == "active":
        now_utc = datetime.now(UTC)
        if tenant.plan_activated_at is None:
            tenant.plan_activated_at = now_utc
        base_date = (
            tenant.plan_expires_at
            if (tenant.plan_expires_at and tenant.plan_expires_at > now_utc)
            else now_utc
        )
        tenant.plan_expires_at = calculate_calendar_month_expiry(base_date)
        tenant.status = TenantStatus.ACTIVE
    else:
        tenant.plan_activated_at = None
        tenant.plan_expires_at = None

    session.add(tenant)
    await session.commit()
    await session.refresh(tenant)

    return tenant


# ── Plan activation ──────────────────────────────────────────────────────────


async def activate_tenant_plan(
    tenant_id: uuid.UUID,
    plan: str,
    session: AsyncSession,
) -> Tenant:
    """Activate a tenant's plan for one calendar month.

    Sets ``payment_status`` to active, records ``plan_activated_at``
    and calculates/extends ``plan_expires_at`` by one calendar month.
    After activation, sends a WhatsApp confirmation to the tenant (fire-and-forget).
    """
    tenant = await session.get(Tenant, tenant_id)
    if tenant is None:
        raise HTTPException(status_code=404, detail="Tenant not found")

    now_utc = datetime.now(UTC)
    base_date = (
        tenant.plan_expires_at
        if (tenant.plan_expires_at and tenant.plan_expires_at > now_utc)
        else now_utc
    )
    tenant.plan_expires_at = calculate_calendar_month_expiry(base_date)

    tenant.plan = plan
    tenant.payment_status = PaymentStatus.ACTIVE
    tenant.status = TenantStatus.ACTIVE

    if tenant.plan_activated_at is None:
        tenant.plan_activated_at = now_utc

    session.add(tenant)
    await session.commit()
    await session.refresh(tenant)

    # Fire-and-forget: send WhatsApp confirmation — failure does NOT rollback
    await _send_activation_whatsapp(tenant, session)

    return tenant


# ── Post-activation WhatsApp confirmation ────────────────────────────────────


PLAN_DISPLAY_NAMES: dict[str, str] = {
    "basic": "Básico",
    "professional": "Profesional",
    "enterprise": "Empresarial",
}

ACTIVATION_CONFIRMATION_TEMPLATE: str = (
    "¡Listo {name}! Tu plan {plan} está activo hasta el {expiry}.\n\n"
    "Ya puedes usar todas las funciones. Cualquier duda, escríbeme."
)


async def _send_activation_whatsapp(
    tenant: Tenant,
    session: AsyncSession,
) -> None:
    """Send a WhatsApp confirmation message after plan activation.

    Fire-and-forget: if the WhatsApp API call fails, the error is logged
    but the activation is **not** rolled back.
    """
    # ── 1. Find the tenant's WhatsApp number ────────────────────────────
    from app.modules.whatsapp.models import WhatsAppNumber

    wa_result = await session.execute(
        select(WhatsAppNumber).where(
            WhatsAppNumber.tenant_id == tenant.id,
            WhatsAppNumber.status == "active",
        ).order_by(WhatsAppNumber.is_primary.desc())
    )
    wa_number = wa_result.scalar_one_or_none()
    if wa_number is None:
        logger.warning(
            "No WhatsAppNumber found for tenant {tid} — skipping WA confirmation",
            tid=tenant.id,
        )
        return

    # ── 2. Find an active Evolution connection to send through ─────────
    from app.modules.platform_connections.models import PlatformConnection

    conn_result = await session.execute(
        select(PlatformConnection).where(
            PlatformConnection.tenant_id == tenant.id,
            PlatformConnection.platform_type == "evolution",
            PlatformConnection.status == "active",
        )
    )
    connection = conn_result.scalar_one_or_none()
    if connection is None:
        logger.warning(
            "No active Evolution connection for tenant {tid} — skipping WA confirmation",
            tid=tenant.id,
        )
        return

    # ── 3. Build the confirmation message ──────────────────────────────
    plan_name = PLAN_DISPLAY_NAMES.get(tenant.plan, tenant.plan)
    expiry_dt = tenant.plan_expires_at or calculate_calendar_month_expiry(datetime.now(UTC))
    expiry = expiry_dt.strftime("%d/%m/%Y")

    confirmation_msg = ACTIVATION_CONFIRMATION_TEMPLATE.format(
        name=tenant.name,
        plan=plan_name,
        expiry=expiry,
    )

    # ── 4. Send (fire-and-forget) ──────────────────────────────────────
    from app.modules.evolution.adapter import EvolutionAdapter

    try:
        adapter = EvolutionAdapter()
        await adapter.send_message(
            connection=connection,
            to=wa_number.display_phone_number,
            text=confirmation_msg,
        )
        logger.info(
            "Activation WA confirmation sent | tenant={tid} | to={to}",
            tid=tenant.id,
            to=wa_number.display_phone_number,
        )
    except Exception as exc:
        logger.error(
            "Failed to send activation WA for tenant {tid}: {exc}",
            tid=tenant.id,
            exc=exc,
        )
        # Fire-and-forget: do NOT re-raise
