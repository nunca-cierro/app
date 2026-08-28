"""Tests for update_payment_status service function."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.tenants.models import Tenant
from app.modules.tenants.service import update_payment_status


def _create_tenant(db_session: AsyncSession, **kwargs) -> Tenant:
    defaults = {
        "id": uuid.uuid4(),
        "name": "Test Tenant",
        "slug": "test-tenant",
        "status": "active",
        "plan": "basic",
        "timezone": "UTC",
        "locale": "en",
        "payment_status": "inactive",
        "plan_activated_at": None,
    }
    defaults.update(kwargs)
    tenant = Tenant(**defaults)
    db_session.add(tenant)
    return tenant


class TestUpdatePaymentStatus:
    """update_payment_status service method."""

    @pytest.mark.asyncio
    async def test_activate_sets_plan_activated_at(
        self, db_session: AsyncSession,
    ):
        """Setting status to 'active' sets plan_activated_at to now."""
        tenant = _create_tenant(db_session)
        await db_session.commit()

        before = datetime.now(UTC)
        result = await update_payment_status(
            tenant_id=tenant.id,
            payment_status="active",
            session=db_session,
        )
        after = datetime.now(UTC)

        assert result.payment_status == "active"
        assert result.plan_activated_at is not None
        assert before <= result.plan_activated_at <= after

    @pytest.mark.asyncio
    async def test_deactivate_clears_plan_activated_at(
        self, db_session: AsyncSession,
    ):
        """Setting status to 'inactive' sets plan_activated_at to None."""
        tenant = _create_tenant(
            db_session,
            payment_status="active",
            plan_activated_at=datetime.now(UTC),
        )
        await db_session.commit()

        result = await update_payment_status(
            tenant_id=tenant.id,
            payment_status="inactive",
            session=db_session,
        )

        assert result.payment_status == "inactive"
        assert result.plan_activated_at is None

    @pytest.mark.asyncio
    async def test_not_found_raises_404(
        self, db_session: AsyncSession,
    ):
        """Calling with a non-existent tenant ID raises HTTPException 404."""
        fake_id = uuid.uuid4()

        with pytest.raises(Exception) as exc_info:
            await update_payment_status(
                tenant_id=fake_id,
                payment_status="active",
                session=db_session,
            )
        assert exc_info.value.status_code == 404
