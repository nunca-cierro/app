"""Tenant business logic — service layer."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.modules.auth.models import PaymentStatus
from app.modules.tenants.models import Tenant


# ── Plan activation ──────────────────────────────────────────────────────────


async def activate_tenant_plan(
    tenant_id: uuid.UUID,
    plan: str,
    session: AsyncSession,
) -> Tenant:
    """Activate a tenant's plan.

    Sets ``payment_status`` to active and records ``plan_activated_at``
    (only if not already set — immutable after first activation). After
    activation, sends a WhatsApp confirmation to the tenant (fire-and-forget).

    Idempotent: if the tenant is already active, the plan can still be
    upgraded/downgraded, but ``plan_activated_at`` never changes.
    """
    tenant = await session.get(Tenant, tenant_id)
    if tenant is None:
        raise HTTPException(status_code=404, detail="Tenant not found")

    tenant.plan = plan
    tenant.payment_status = PaymentStatus.ACTIVE

    if tenant.plan_activated_at is None:
        tenant.plan_activated_at = datetime.now(UTC)

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
    "Ya podés usar todas las funciones. Cualquier duda, escribime."
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
    activated = tenant.plan_activated_at or datetime.now(UTC)
    expiry = (activated + timedelta(days=30)).strftime("%d/%m/%Y")

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
