"""Tests for billing endpoints — payment-info and activate-plan."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.modules.auth.deps import get_current_user
from app.modules.auth.models import User, UserRole


# ── Helpers ──────────────────────────────────────────────────────────────────


def create_tenant(db_session: AsyncSession, slug: str = "testco", **kw):
    from app.modules.tenants.models import Tenant

    tenant = Tenant(
        id=uuid.uuid4(),
        name=kw.pop("name", "Test Co"),
        slug=slug,
        status=kw.pop("status", "active"),
        plan=kw.pop("plan", "trial"),
        timezone="America/Bogota",
        locale="es-CO",
        **kw,
    )
    db_session.add(tenant)
    return tenant


# ── GET /api/v1/billing/payment-info ───────────────────────────────────────


class TestPaymentInfo:
    @pytest.mark.asyncio
    async def test_get_payment_info(self, client: AsyncClient):
        """Returns payment QR URLs, methods, and account holder."""
        response = await client.get("/api/v1/billing/payment-info")
        assert response.status_code == 200
        data = response.json()

        assert "qr_urls" in data
        assert data["qr_urls"]["basic"] == "/payment/QRBasico.jpeg"
        assert data["qr_urls"]["professional"] == "/payment/QRProfesional.jpeg"
        assert data["qr_urls"]["enterprise"] == "/payment/QREmpresarial.jpeg"

        assert "methods" in data
        assert len(data["methods"]) == 1
        method_names = [m["name"] for m in data["methods"]]
        assert "Bre-B" in method_names

        assert "account_holder" in data
        assert data["account_holder"] != ""

    @pytest.mark.asyncio
    async def test_get_payment_info_returns_account_numbers(
        self, client: AsyncClient
    ):
        """Each payment method has a number field."""
        response = await client.get("/api/v1/billing/payment-info")
        assert response.status_code == 200
        data = response.json()

        for method in data["methods"]:
            assert "number" in method
            assert method["number"] != ""
            assert "logo" in method

    @pytest.mark.asyncio
    async def test_payment_info_needs_auth(self, client: AsyncClient):
        """Without auth, returns 401."""
        # Clear auth override
        async def deny():
            from fastapi import HTTPException, status
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

        app.dependency_overrides[get_current_user] = deny
        try:
            response = await client.get("/api/v1/billing/payment-info")
            assert response.status_code == 401
        finally:
            app.dependency_overrides.clear()


# ── PATCH /api/v1/tenants/{id}/activate-plan ──────────────────────────────


class TestActivatePlan:
    @pytest.mark.asyncio
    async def test_activate_plan_happy_path(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """Superadmin can activate a plan, setting payment_status=active and plan_activated_at."""
        tenant = create_tenant(db_session, slug="happyco", plan="trial")
        await db_session.commit()

        response = await client.patch(
            f"/api/v1/tenants/{tenant.id}/activate-plan",
            json={"plan": "professional"},
        )
        assert response.status_code == 200
        data = response.json()

        assert data["plan"] == "professional"
        assert data["payment_status"] == "active"
        assert data["plan_activated_at"] is not None

    @pytest.mark.asyncio
    async def test_activate_plan_idempotent_plan_activated_at(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """plan_activated_at is immutable — second call doesn't change it."""
        from app.modules.tenants.models import Tenant
        from app.modules.auth.models import PaymentStatus

        tenant = create_tenant(db_session, slug="idempotent", plan="trial")
        await db_session.commit()

        # First activation
        resp1 = await client.patch(
            f"/api/v1/tenants/{tenant.id}/activate-plan",
            json={"plan": "basic"},
        )
        assert resp1.status_code == 200
        first_activated = resp1.json()["plan_activated_at"]

        # Second activation with different plan
        resp2 = await client.patch(
            f"/api/v1/tenants/{tenant.id}/activate-plan",
            json={"plan": "professional"},
        )
        assert resp2.status_code == 200
        second_activated = resp2.json()["plan_activated_at"]

        assert second_activated == first_activated

    @pytest.mark.asyncio
    async def test_activate_plan_plan_updated(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """Plan can be updated even if already active (idempotent for activated_at, not for plan)."""
        # Arrange: tenant is already active
        tenant = create_tenant(db_session, slug="upgrade", plan="basic")
        from app.modules.auth.models import PaymentStatus
        tenant.payment_status = PaymentStatus.ACTIVE
        tenant.plan_activated_at = datetime.now(UTC)
        await db_session.commit()

        # Act: upgrade to professional
        response = await client.patch(
            f"/api/v1/tenants/{tenant.id}/activate-plan",
            json={"plan": "professional"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["plan"] == "professional"
        assert data["payment_status"] == "active"

    @pytest.mark.asyncio
    async def test_activate_plan_invalid_plan(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """Invalid plan values return 422."""
        tenant = create_tenant(db_session, slug="invalid")
        await db_session.commit()

        response = await client.patch(
            f"/api/v1/tenants/{tenant.id}/activate-plan",
            json={"plan": "ultra_mega"},
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_activate_plan_forbidden_non_superadmin(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """Non-superadmin gets 403."""
        tenant = create_tenant(db_session, slug="forbidden")
        await db_session.commit()

        regular_user = User(
            id=uuid.uuid4(),
            email="regular@test.com",
            name="Regular",
            password_hash="hash",
        )
        setattr(regular_user, "current_role", UserRole.ADMIN)

        async def mock_auth():
            return regular_user

        app.dependency_overrides[get_current_user] = mock_auth
        try:
            response = await client.patch(
                f"/api/v1/tenants/{tenant.id}/activate-plan",
                json={"plan": "basic"},
            )
            assert response.status_code == 403
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_activate_plan_not_found(
        self, client: AsyncClient
    ):
        """Non-existent tenant returns 404."""
        fake_id = uuid.uuid4()
        response = await client.patch(
            f"/api/v1/tenants/{fake_id}/activate-plan",
            json={"plan": "basic"},
        )
        assert response.status_code == 404
