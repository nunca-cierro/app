"""Tests for the client business-card PATCH contract (owner decision #1).

A client CAN edit their OWN current tenant's business card fields (name,
timezone, locale, notes) but NOTHING else: plan, slug, status, category,
business_profile and any OTHER tenant are rejected with 403. Admin/superadmin
behavior is unchanged (admin: plan/status silently dropped; superadmin: full
update including plan).
"""

from __future__ import annotations

import uuid

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.modules.auth.deps import get_current_user
from app.modules.auth.models import User, UserRole
from app.modules.tenants.models import Tenant


def _create_tenant(
    db_session: AsyncSession, name: str, slug: str, plan: str = "basic"
) -> Tenant:
    tenant = Tenant(
        id=uuid.uuid4(),
        name=name,
        slug=slug,
        status="active",
        plan=plan,
        timezone="America/Bogota",
        locale="es-CO",
    )
    db_session.add(tenant)
    return tenant


@pytest_asyncio.fixture
async def actor(db_session: AsyncSession) -> User:
    user = User(
        id=uuid.uuid4(),
        email="actor-client-patch@test.com",
        password_hash="hash",
        name="Actor",
    )
    db_session.add(user)
    await db_session.flush()
    return user


def _act_as(user: User, role: UserRole, tenant_id: uuid.UUID | None) -> None:
    """Set JWT-like context on the user and wire the auth override."""
    setattr(user, "current_role", role)
    setattr(user, "current_tenant_id", tenant_id)

    async def mock_get_current_user() -> User:
        return user

    app.dependency_overrides[get_current_user] = mock_get_current_user


# ═══════════════════════════════════════════════════════════════════════════
# Client — own business card only
# ═══════════════════════════════════════════════════════════════════════════


class TestClientBusinessCardPatch:
    """Client edits ONLY their own current tenant's business-card fields."""

    @pytest.mark.asyncio
    async def test_client_patches_own_tenant_business_card(
        self, client: AsyncClient, db_session: AsyncSession, actor: User
    ) -> None:
        """name/timezone/locale/notes on own tenant → 200, plan untouched."""
        own = _create_tenant(db_session, "Mi Negocio", "mi-negocio")
        await db_session.commit()
        _act_as(actor, UserRole.CLIENT, own.id)

        response = await client.patch(
            f"/api/v1/tenants/{own.id}",
            json={
                "name": "Mi Negocio Renovado",
                "timezone": "America/Argentina/Buenos_Aires",
                "locale": "es-AR",
                "notes": "Nota de prueba",
            },
        )

        assert response.status_code == 200, response.text
        data = response.json()
        assert data["name"] == "Mi Negocio Renovado"
        assert data["timezone"] == "America/Argentina/Buenos_Aires"
        assert data["locale"] == "es-AR"
        assert data["notes"] == "Nota de prueba"
        assert data["plan"] == "basic"  # plan untouched by business-card edit

    @pytest.mark.asyncio
    async def test_client_cannot_change_plan(
        self, client: AsyncClient, db_session: AsyncSession, actor: User
    ) -> None:
        own = _create_tenant(db_session, "Plan Guard", "plan-guard")
        await db_session.commit()
        _act_as(actor, UserRole.CLIENT, own.id)

        response = await client.patch(
            f"/api/v1/tenants/{own.id}", json={"plan": "enterprise"}
        )

        assert response.status_code == 403, response.text

    @pytest.mark.asyncio
    async def test_client_cannot_send_slug(
        self, client: AsyncClient, db_session: AsyncSession, actor: User
    ) -> None:
        """slug is schema-ignored by TenantUpdate — the raw-body check must
        still reject it for clients (defense in depth)."""
        own = _create_tenant(db_session, "Slug Guard", "slug-guard")
        await db_session.commit()
        _act_as(actor, UserRole.CLIENT, own.id)

        response = await client.patch(
            f"/api/v1/tenants/{own.id}", json={"slug": "hacked-slug"}
        )

        assert response.status_code == 403, response.text

    @pytest.mark.asyncio
    async def test_client_cannot_change_status(
        self, client: AsyncClient, db_session: AsyncSession, actor: User
    ) -> None:
        own = _create_tenant(db_session, "Status Guard", "status-guard")
        await db_session.commit()
        _act_as(actor, UserRole.CLIENT, own.id)

        response = await client.patch(
            f"/api/v1/tenants/{own.id}", json={"status": "inactive"}
        )

        assert response.status_code == 403, response.text

    @pytest.mark.asyncio
    async def test_client_cannot_patch_other_tenant(
        self, client: AsyncClient, db_session: AsyncSession, actor: User
    ) -> None:
        """Isolation: client only patches their CURRENT tenant, never another."""
        own = _create_tenant(db_session, "Own Co", "own-co")
        other = _create_tenant(db_session, "Other Co", "other-co")
        await db_session.commit()
        _act_as(actor, UserRole.CLIENT, own.id)

        response = await client.patch(
            f"/api/v1/tenants/{other.id}", json={"name": "Hacked"}
        )

        assert response.status_code == 403, response.text


# ═══════════════════════════════════════════════════════════════════════════
# Admin / superadmin — behavior unchanged
# ═══════════════════════════════════════════════════════════════════════════


class TestAdminAndSuperadminPatchUnchanged:
    @pytest.mark.asyncio
    async def test_admin_patches_own_tenant_business_card(
        self, client: AsyncClient, db_session: AsyncSession, actor: User
    ) -> None:
        own = _create_tenant(db_session, "Admin Co", "admin-co")
        await db_session.commit()
        _act_as(actor, UserRole.ADMIN, own.id)

        response = await client.patch(
            f"/api/v1/tenants/{own.id}",
            json={
                "name": "Admin Renamed",
                "timezone": "UTC",
                "locale": "en-US",
                "notes": "n",
            },
        )

        assert response.status_code == 200, response.text
        assert response.json()["name"] == "Admin Renamed"

    @pytest.mark.asyncio
    async def test_admin_plan_still_silently_dropped(
        self, client: AsyncClient, db_session: AsyncSession, actor: User
    ) -> None:
        """Unchanged admin contract: plan is dropped, not rejected."""
        own = _create_tenant(db_session, "Admin Plan", "admin-plan")
        await db_session.commit()
        _act_as(actor, UserRole.ADMIN, own.id)

        response = await client.patch(
            f"/api/v1/tenants/{own.id}",
            json={"name": "Admin Plan Renamed", "plan": "enterprise"},
        )

        assert response.status_code == 200, response.text
        assert response.json()["name"] == "Admin Plan Renamed"
        assert response.json()["plan"] == "basic"

    @pytest.mark.asyncio
    async def test_superadmin_patches_full_fields_including_plan(
        self, client: AsyncClient, db_session: AsyncSession, actor: User
    ) -> None:
        own = _create_tenant(db_session, "Super Co", "super-co")
        await db_session.commit()
        _act_as(actor, UserRole.SUPERADMIN, own.id)

        response = await client.patch(
            f"/api/v1/tenants/{own.id}",
            json={
                "name": "Super Renamed",
                "plan": "enterprise",
                "timezone": "America/New_York",
                "locale": "en-US",
                "notes": "n",
            },
        )

        assert response.status_code == 200, response.text
        data = response.json()
        assert data["name"] == "Super Renamed"
        assert data["plan"] == "enterprise"
        assert data["timezone"] == "America/New_York"

    @pytest.mark.asyncio
    async def test_superadmin_patches_any_tenant(
        self, client: AsyncClient, db_session: AsyncSession, actor: User
    ) -> None:
        own = _create_tenant(db_session, "Super Home", "super-home")
        other = _create_tenant(db_session, "Super Target", "super-target")
        await db_session.commit()
        _act_as(actor, UserRole.SUPERADMIN, own.id)

        response = await client.patch(
            f"/api/v1/tenants/{other.id}", json={"name": "Super Renamed Other"}
        )

        assert response.status_code == 200, response.text
        assert response.json()["name"] == "Super Renamed Other"