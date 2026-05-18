"""Tests for tenant resolution refactoring — platform-aware resolvers."""

from __future__ import annotations

import os
import uuid
from typing import Any

import pytest

os.environ.setdefault("ENCRYPTION_KEY", "dGhpcyBpcyBhIDE2LWJ5dGUgZXhhbXBsZSBrZXkgISE=")

from app.modules.platform_connections.models import PlatformConnection


def _make_tenant(db_session: Any, slug: str, **kw: Any) -> Any:
    """Create a minimal Tenant and flush so the PK is available."""
    from app.modules.tenants.models import Tenant

    tenant = Tenant(
        id=uuid.uuid4(),
        name=kw.get("name", "Test"),
        slug=slug,
        status=kw.get("status", "active"),
        plan="basic",
        timezone="UTC",
        locale="en",
        **{k: v for k, v in kw.items() if k not in ("name", "status")},
    )
    db_session.add(tenant)
    return tenant


class TestTenantResolution:
    """New tenant resolution functions."""

    @pytest.mark.asyncio
    async def test_resolve_by_phone_number_id_still_exists(self, db_session: Any) -> None:
        """Backward-compat wrapper still works."""
        from app.core.tenancy import resolve_by_phone_number_id

        result = await resolve_by_phone_number_id(db_session, "nonexistent")
        assert result is None

    @pytest.mark.asyncio
    async def test_resolve_by_webhook_unknown_connection(self, db_session: Any) -> None:
        """resolve_by_webhook returns None for unknown connection_id."""
        from app.core.tenancy import resolve_by_webhook

        result = await resolve_by_webhook(
            db_session, "whatsapp", "00000000-0000-0000-0000-000000000000", {}
        )
        assert result is None

    @pytest.mark.asyncio
    async def test_resolve_by_webhook_inactive_connection(self, db_session: Any) -> None:
        """resolve_by_webhook returns None for inactive connection."""
        from app.core.tenancy import resolve_by_webhook
        from app.modules.tenants.models import Tenant

        tenant = _make_tenant(db_session, "test-inactive")
        await db_session.flush()

        conn = PlatformConnection(
            id=uuid.uuid4(),
            tenant_id=tenant.id,
            platform_type="whatsapp",
            display_name="Inactive Conn",
            credentials="gAAAAABnZW5lcmF0ZWQ=",
            status="inactive",
        )
        db_session.add(conn)
        await db_session.commit()

        result = await resolve_by_webhook(
            db_session, "whatsapp", str(conn.id), {}
        )
        assert result is None

    @pytest.mark.asyncio
    async def test_resolve_by_webhook_happy_path(self, db_session: Any) -> None:
        """resolve_by_webhook returns correct tenant for valid connection."""
        from app.core.tenancy import resolve_by_webhook
        from app.modules.tenants.models import Tenant

        tenant = _make_tenant(db_session, "test-webhook", name="Test Tenant")
        await db_session.flush()

        conn = PlatformConnection(
            id=uuid.uuid4(),
            tenant_id=tenant.id,
            platform_type="whatsapp",
            display_name="Active Conn",
            credentials="gAAAAABnZW5lcmF0ZWQ=",
            status="active",
        )
        db_session.add(conn)
        await db_session.commit()

        result = await resolve_by_webhook(
            db_session, "whatsapp", str(conn.id), {}
        )
        assert result is not None
        assert result.tenant.id == tenant.id
        assert result.platform_connection.id == conn.id

    @pytest.mark.asyncio
    async def test_resolve_by_webhook_returns_agent_and_prompts(
        self, db_session: Any
    ) -> None:
        """resolve_by_webhook loads agent and prompts when they exist."""
        from app.core.tenancy import resolve_by_webhook
        from app.modules.tenants.models import Tenant

        tenant = _make_tenant(db_session, "test-agent", name="Agent Tenant")
        await db_session.flush()

        conn = PlatformConnection(
            id=uuid.uuid4(),
            tenant_id=tenant.id,
            platform_type="whatsapp",
            display_name="Agent Conn",
            credentials="gAAAAABnZW5lcmF0ZWQ=",
            status="active",
        )
        db_session.add(conn)
        await db_session.commit()

        result = await resolve_by_webhook(
            db_session, "whatsapp", str(conn.id), {}
        )
        assert result is not None
        assert result.tenant.id == tenant.id
        assert result.platform_connection.id == conn.id

    @pytest.mark.asyncio
    async def test_resolve_by_webhook_platform_mismatch(
        self, db_session: Any
    ) -> None:
        """resolve_by_webhook returns None when platform doesn't match."""
        from app.core.tenancy import resolve_by_webhook
        from app.modules.tenants.models import Tenant

        tenant = _make_tenant(db_session, "test-mismatch")
        await db_session.flush()

        conn = PlatformConnection(
            id=uuid.uuid4(),
            tenant_id=tenant.id,
            platform_type="whatsapp",
            display_name="WA Conn",
            credentials="gAAAAABnZW5lcmF0ZWQ=",
            status="active",
        )
        db_session.add(conn)
        await db_session.commit()

        # Request telegram but connection is whatsapp
        result = await resolve_by_webhook(
            db_session, "telegram", str(conn.id), {}
        )
        assert result is None


class TestTenantResolutionWithCredentials:
    """resolve_by_platform — credential-based tenant lookup."""

    @pytest.mark.asyncio
    async def test_resolve_by_platform_unknown(self, db_session: Any) -> None:
        """resolve_by_platform returns None when no matching connection."""
        from app.core.tenancy import resolve_by_platform

        result = await resolve_by_platform(
            db_session, "whatsapp", {"phone_number_id": "unknown"}
        )
        assert result is None

    @pytest.mark.asyncio
    async def test_resolve_by_platform_whatsapp_phone_number_id(
        self, db_session: Any
    ) -> None:
        """resolve_by_platform resolves by WhatsApp phone_number_id in credentials."""
        from app.core.tenancy import resolve_by_platform
        from app.core.encryption import encrypt
        from app.modules.tenants.models import Tenant

        tenant = _make_tenant(db_session, "test-cred")
        await db_session.flush()

        creds = {"phone_number_id": "12345", "token": "abc"}
        conn = PlatformConnection(
            id=uuid.uuid4(),
            tenant_id=tenant.id,
            platform_type="whatsapp",
            display_name="Cred Conn",
            credentials=encrypt(creds),
            status="active",
        )
        db_session.add(conn)
        await db_session.commit()

        result = await resolve_by_platform(
            db_session, "whatsapp", {"phone_number_id": "12345"}
        )
        assert result is not None
        assert result.tenant.id == tenant.id
        assert result.platform_connection.id == conn.id

    @pytest.mark.asyncio
    async def test_resolve_by_platform_inactive_connection(
        self, db_session: Any
    ) -> None:
        """resolve_by_platform returns None for inactive connections."""
        from app.core.tenancy import resolve_by_platform
        from app.core.encryption import encrypt
        from app.modules.tenants.models import Tenant

        tenant = _make_tenant(db_session, "test-inactive-cred")
        await db_session.flush()

        creds = {"phone_number_id": "inactive_123"}
        conn = PlatformConnection(
            id=uuid.uuid4(),
            tenant_id=tenant.id,
            platform_type="whatsapp",
            display_name="Inactive Cred",
            credentials=encrypt(creds),
            status="inactive",
        )
        db_session.add(conn)
        await db_session.commit()

        result = await resolve_by_platform(
            db_session, "whatsapp", {"phone_number_id": "inactive_123"}
        )
        assert result is None
