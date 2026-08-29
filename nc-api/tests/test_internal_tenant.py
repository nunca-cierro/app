"""Tests: the internal-tenant payment exemption is driven by configuration.

Historically the product's own tenant slug ``"nuncacierro"`` was hardcoded in
auth/tenants/handler behavior. This phase moves it to
``Settings.internal_tenant_slug`` (default ``"nuncacierro"``) so adapting the
platform to another business only requires config, never code. An EMPTY value
is the safe fallback: nobody is exempted.
"""

from __future__ import annotations

import uuid

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.modules.tenants.internal import is_internal_tenant
from app.modules.tenants.models import Tenant


# ── Pure helper ──────────────────────────────────────────────────────────────


class TestIsInternalTenant:
    def test_matching_slug_is_internal(self) -> None:
        assert is_internal_tenant("nuncacierro", "nuncacierro") is True

    def test_other_slug_is_not_internal(self) -> None:
        assert is_internal_tenant("cliente-acme", "nuncacierro") is False

    def test_empty_configured_slug_exempts_nobody(self) -> None:
        assert is_internal_tenant("nuncacierro", "") is False

    def test_none_slug_is_not_internal(self) -> None:
        assert is_internal_tenant(None, "nuncacierro") is False


# ── Integration: tenant list/get exemption ───────────────────────────────────


@pytest_asyncio.fixture
async def internal_tenant(db_session: AsyncSession) -> Tenant:
    tenant = Tenant(
        name="NuncaCierro",
        slug=settings.internal_tenant_slug,
        payment_status="pending",
    )
    db_session.add(tenant)
    await db_session.commit()
    await db_session.refresh(tenant)
    return tenant


@pytest_asyncio.fixture
async def client_tenant(db_session: AsyncSession) -> Tenant:
    tenant = Tenant(name="Cliente Acme", slug="cliente-acme", payment_status="pending")
    db_session.add(tenant)
    await db_session.commit()
    await db_session.refresh(tenant)
    return tenant


class TestDefaultInternalSlug:
    @pytest.mark.asyncio
    async def test_tenant_list_exempts_configured_slug(
        self,
        client: AsyncClient,
        internal_tenant: Tenant,
        client_tenant: Tenant,
    ):
        resp = await client.get("/api/v1/tenants")
        assert resp.status_code == 200
        by_slug = {t["slug"]: t["payment_status"] for t in resp.json()}
        assert by_slug[settings.internal_tenant_slug] == "active"
        assert by_slug["cliente-acme"] == "pending"

    @pytest.mark.asyncio
    async def test_tenant_get_exempts_configured_slug(
        self,
        client: AsyncClient,
        internal_tenant: Tenant,
    ):
        resp = await client.get(f"/api/v1/tenants/{internal_tenant.id}")
        assert resp.status_code == 200
        assert resp.json()["payment_status"] == "active"

    @pytest.mark.asyncio
    async def test_tenant_get_keeps_client_pending(
        self,
        client: AsyncClient,
        client_tenant: Tenant,
    ):
        resp = await client.get(f"/api/v1/tenants/{client_tenant.id}")
        assert resp.status_code == 200
        assert resp.json()["payment_status"] == "pending"


class TestConfigurableInternalSlug:
    @pytest.mark.asyncio
    async def test_custom_slug_moves_the_exemption(
        self,
        client: AsyncClient,
        monkeypatch: pytest.MonkeyPatch,
        internal_tenant: Tenant,
        client_tenant: Tenant,
    ):
        # Adapted product: a different tenant is now "internal"
        monkeypatch.setattr(settings, "internal_tenant_slug", "cliente-acme")
        resp = await client.get("/api/v1/tenants")
        assert resp.status_code == 200
        by_slug = {t["slug"]: t["payment_status"] for t in resp.json()}
        assert by_slug["cliente-acme"] == "active"
        # The former internal tenant (fixture slug) loses the exemption.
        assert by_slug[internal_tenant.slug] == "pending"

    @pytest.mark.asyncio
    async def test_empty_slug_exempts_nobody(
        self,
        client: AsyncClient,
        monkeypatch: pytest.MonkeyPatch,
        internal_tenant: Tenant,
        client_tenant: Tenant,
    ):
        monkeypatch.setattr(settings, "internal_tenant_slug", "")
        resp = await client.get("/api/v1/tenants")
        assert resp.status_code == 200
        by_slug = {t["slug"]: t["payment_status"] for t in resp.json()}
        assert by_slug["nunca-cierro"] == "pending"
        assert by_slug["cliente-acme"] == "pending"
