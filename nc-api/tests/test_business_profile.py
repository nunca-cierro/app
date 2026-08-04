"""Tests for business_profile validation/normalization (task 5).

A new tenant must be able to configure name, city (location), schedule,
services, tone and CTA without copying code. The profile is validated at the
API boundary: known keys only (extra keys dropped), string values enforced,
category canonicalized via the shared registry.
"""

from __future__ import annotations

import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.modules.auth.deps import get_current_user
from app.modules.auth.models import User, UserRole
from app.db.session import get_session
from app.modules.tenants.business_profile import (
    BUSINESS_PROFILE_KEYS,
    validate_business_profile,
)
from app.modules.agents.templates import PLACEHOLDER_KEYS


class TestBusinessProfileKeys:
    def test_profile_keys_are_exactly_the_placeholder_set(self) -> None:
        # One source of truth: tenant profile keys == template placeholder keys
        assert BUSINESS_PROFILE_KEYS == PLACEHOLDER_KEYS

    def test_includes_cta(self) -> None:
        assert "business_cta" in BUSINESS_PROFILE_KEYS

    def test_includes_city_location(self) -> None:
        assert "business_location" in BUSINESS_PROFILE_KEYS

    def test_includes_schedule(self) -> None:
        assert "business_schedule" in BUSINESS_PROFILE_KEYS


class TestValidateBusinessProfile:
    def test_valid_profile_passes_unchanged(self) -> None:
        profile = {
            "business_name": "Café La Estación",
            "business_schedule": "Lun–Sáb 8:00–18:00",
            "business_cta": "Escríbenos al +57 300 123 4567",
        }
        assert validate_business_profile(profile) == profile

    def test_none_passes(self) -> None:
        assert validate_business_profile(None) is None

    def test_empty_dict_passes(self) -> None:
        assert validate_business_profile({}) == {}

    def test_unknown_keys_are_dropped(self) -> None:
        profile = {
            "business_name": "Mi Negocio",
            "garbage_key": "should be dropped",
        }
        assert validate_business_profile(profile) == {"business_name": "Mi Negocio"}

    def test_non_string_known_key_raises(self) -> None:
        with pytest.raises(ValueError):
            validate_business_profile({"business_name": 123})

    def test_nested_value_raises(self) -> None:
        with pytest.raises(ValueError):
            validate_business_profile({"business_name": {"nested": "dict"}})

    def test_non_dict_raises(self) -> None:
        with pytest.raises(ValueError):
            validate_business_profile("not a dict")

    def test_all_placeholder_keys_are_string_fields(self) -> None:
        full = {key: "value" for key in PLACEHOLDER_KEYS}
        assert validate_business_profile(full) == full


class TestTenantApiWithBusinessProfile:
    @pytest_asyncio.fixture
    async def superadmin_client(self, db_session: AsyncSession) -> AsyncClient:
        """Authenticated client with a PERSISTED superadmin + tenant context.

        Mirrors test_tenant_crud.superadmin_client: a real DB user avoids the
        FK violation on user_tenants when the endpoint auto-assigns, and a
        tenant context prevents the tenantless auto-assignment branch.
        """
        user = User(
            id=uuid.uuid4(),
            email="superadmin@bp-test.com",
            password_hash="not-a-real-hash",
            name="BP Superadmin",
        )
        db_session.add(user)
        await db_session.flush()

        from app.modules.tenants.models import Tenant

        tenant = Tenant(
            id=uuid.uuid4(),
            name="Superadmin Home",
            slug="superadmin-home-bp",
            status="active",
            plan="basic",
        )
        db_session.add(tenant)
        await db_session.flush()

        user.current_role = UserRole.SUPERADMIN
        user.current_tenant_id = tenant.id

        async def override_auth() -> User:
            return user

        app.dependency_overrides[get_current_user] = override_auth
        app.dependency_overrides[get_session] = lambda: db_session

        transport = ASGITransport(app=app)  # type: ignore[arg-type]
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac

        app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_create_tenant_with_business_profile(
        self, superadmin_client: AsyncClient
    ):
        resp = await superadmin_client.post(
            "/api/v1/tenants",
            json={
                "name": "Panadería El Trigal",
                "slug": "panaderia-el-trigal",
                "category": "Panadería",  # display label → canonicalized
                "business_profile": {
                    "business_name": "Panadería El Trigal",
                    "business_location": "Calle 10 #5-20, Medellín",
                    "business_schedule": "Lun–Dom 6:00–21:00",
                    "business_cta": "Pedí por WhatsApp al +57 300 000 0000",
                    "business_phone": "+57 300 000 0000",
                },
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["category"] == "panaderia"  # label canonicalized to slug
        assert data["business_profile"]["business_name"] == "Panadería El Trigal"
        assert data["business_profile"]["business_cta"] == (
            "Pedí por WhatsApp al +57 300 000 0000"
        )

    @pytest.mark.asyncio
    async def test_create_tenant_rejects_non_string_profile_value(
        self, superadmin_client: AsyncClient
    ):
        resp = await superadmin_client.post(
            "/api/v1/tenants",
            json={
                "name": "Bad Profile",
                "slug": "bad-profile",
                "business_profile": {"business_name": 42},
            },
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_tenant_drops_unknown_profile_keys(
        self, superadmin_client: AsyncClient
    ):
        resp = await superadmin_client.post(
            "/api/v1/tenants",
            json={
                "name": "Extra Keys",
                "slug": "extra-keys",
                "business_profile": {
                    "business_name": "Extra",
                    "mystery": "dropped",
                },
            },
        )
        assert resp.status_code == 201
        assert resp.json()["business_profile"] == {"business_name": "Extra"}

    @pytest.mark.asyncio
    async def test_update_tenant_business_profile(
        self, superadmin_client: AsyncClient
    ):
        created = await superadmin_client.post(
            "/api/v1/tenants",
            json={
                "name": "Actualizable",
                "slug": "actualizable",
                "business_profile": {"business_name": "Nombre Inicial"},
            },
        )
        tenant_id = created.json()["id"]

        resp = await superadmin_client.patch(
            f"/api/v1/tenants/{tenant_id}",
            json={
                "business_profile": {
                    "business_name": "Nombre Actualizado",
                    "business_cta": "Agendá tu cita",
                }
            },
        )
        assert resp.status_code == 200
        profile = resp.json()["business_profile"]
        assert profile["business_name"] == "Nombre Actualizado"
        assert profile["business_cta"] == "Agendá tu cita"
