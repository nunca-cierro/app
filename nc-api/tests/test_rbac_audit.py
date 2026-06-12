"""RBAC audit tests — verify all endpoints enforce RoleChecker correctly."""

from __future__ import annotations

import uuid

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.modules.auth.deps import get_current_user
from app.modules.auth.models import User, UserRole
from app.modules.auth.user_tenant import UserTenant
from app.modules.tenants.models import Tenant


def _create_tenant(db_session: AsyncSession, name: str, slug: str) -> Tenant:
    tenant = Tenant(
        id=uuid.uuid4(),
        name=name,
        slug=slug,
        status="active",
        plan="basic",
        timezone="UTC",
        locale="en",
    )
    db_session.add(tenant)
    return tenant


@pytest_asyncio.fixture
async def agent_user(db_session: AsyncSession) -> User:
    """Return a user with AGENT role attached to a tenant."""
    user = User(id=uuid.uuid4(), email="agent@test.com", name="Agent User", password_hash="hash")
    db_session.add(user)
    await db_session.flush()
    return user


@pytest_asyncio.fixture
async def admin_user(db_session: AsyncSession) -> User:
    """Return a user with ADMIN role."""
    user = User(id=uuid.uuid4(), email="admin@test.com", name="Admin User", password_hash="hash")
    db_session.add(user)
    await db_session.flush()
    return user


@pytest_asyncio.fixture
async def tenant_with_data(db_session: AsyncSession, admin_user: User) -> Tenant:
    """Create a tenant with an admin user association."""
    tenant = _create_tenant(db_session, "Test Tenant", "test-tenant")
    await db_session.flush()
    ut = UserTenant(user_id=admin_user.id, tenant_id=tenant.id, role=UserRole.ADMIN, is_primary=True)
    db_session.add(ut)
    await db_session.commit()
    return tenant


# ═══════════════════════════════════════════════════════════════════════════════
# Agent role: should NOT be able to create/delete agents, platform connections,
# whatsapp numbers, tenants, or assign tenants
# ═══════════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_agent_cannot_create_agent(client: AsyncClient, db_session: AsyncSession, agent_user: User, tenant_with_data: Tenant):
    """AGENT role should get 403 when creating an agent."""
    setattr(agent_user, "current_role", UserRole.AGENT)
    setattr(agent_user, "current_tenant_id", tenant_with_data.id)

    async def mock_get_current_user():
        return agent_user

    app.dependency_overrides[get_current_user] = mock_get_current_user
    try:
        response = await client.post(
            "/api/v1/agents",
            json={"name": "Agent X", "tenant_id": str(tenant_with_data.id)},
        )
        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_agent_cannot_delete_agent(client: AsyncClient, db_session: AsyncSession, agent_user: User, tenant_with_data: Tenant):
    """AGENT role should get 403 when deleting an agent."""
    from app.modules.agents.models import AiAgent

    agent = AiAgent(id=uuid.uuid4(), tenant_id=tenant_with_data.id, name="Delete Me")
    db_session.add(agent)
    await db_session.commit()

    setattr(agent_user, "current_role", UserRole.AGENT)
    setattr(agent_user, "current_tenant_id", tenant_with_data.id)

    async def mock_get_current_user():
        return agent_user

    app.dependency_overrides[get_current_user] = mock_get_current_user
    try:
        response = await client.delete(f"/api/v1/agents/{agent.id}")
        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_agent_cannot_create_platform_connection(client: AsyncClient, db_session: AsyncSession, agent_user: User, tenant_with_data: Tenant):
    """AGENT role should get 403 when creating a platform connection."""
    setattr(agent_user, "current_role", UserRole.AGENT)
    setattr(agent_user, "current_tenant_id", tenant_with_data.id)

    async def mock_get_current_user():
        return agent_user

    app.dependency_overrides[get_current_user] = mock_get_current_user
    try:
        response = await client.post(
            "/api/v1/platform-connections",
            json={
                "tenant_id": str(tenant_with_data.id),
                "platform_type": "whatsapp",
                "display_name": "Test",
                "credentials": "encrypted",
                "status": "active",
            },
        )
        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_agent_cannot_delete_platform_connection(client: AsyncClient, db_session: AsyncSession, agent_user: User, tenant_with_data: Tenant):
    """AGENT role should get 403 when deleting a platform connection."""
    from app.modules.platform_connections.models import PlatformConnection

    conn = PlatformConnection(
        id=uuid.uuid4(),
        tenant_id=tenant_with_data.id,
        platform_type="whatsapp",
        display_name="Test Conn",
        credentials="encrypted",
        status="active",
    )
    db_session.add(conn)
    await db_session.commit()

    setattr(agent_user, "current_role", UserRole.AGENT)
    setattr(agent_user, "current_tenant_id", tenant_with_data.id)

    async def mock_get_current_user():
        return agent_user

    app.dependency_overrides[get_current_user] = mock_get_current_user
    try:
        response = await client.delete(f"/api/v1/platform-connections/{conn.id}")
        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_agent_cannot_create_whatsapp_number(client: AsyncClient, db_session: AsyncSession, agent_user: User, tenant_with_data: Tenant):
    """AGENT role should get 403 when creating a WhatsApp number."""
    setattr(agent_user, "current_role", UserRole.AGENT)
    setattr(agent_user, "current_tenant_id", tenant_with_data.id)

    async def mock_get_current_user():
        return agent_user

    app.dependency_overrides[get_current_user] = mock_get_current_user
    try:
        response = await client.post(
            "/api/v1/whatsapp-numbers",
            json={
                "tenant_id": str(tenant_with_data.id),
                "phone_number_id": "12345",
                "display_phone_number": "+1234567890",
                "status": "active",
            },
        )
        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_agent_cannot_create_tenant(client: AsyncClient, db_session: AsyncSession, agent_user: User, tenant_with_data: Tenant):
    """AGENT role should get 403 when creating a tenant."""
    setattr(agent_user, "current_role", UserRole.AGENT)
    setattr(agent_user, "current_tenant_id", tenant_with_data.id)

    async def mock_get_current_user():
        return agent_user

    app.dependency_overrides[get_current_user] = mock_get_current_user
    try:
        response = await client.post(
            "/api/v1/tenants",
            json={"name": "New Tenant", "slug": "new-tenant"},
        )
        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_agent_cannot_access_admin_panel(client: AsyncClient, db_session: AsyncSession, agent_user: User):
    """AGENT role should get 403 when listing users (admin endpoint)."""
    setattr(agent_user, "current_role", UserRole.AGENT)
    setattr(agent_user, "current_tenant_id", None)

    async def mock_get_current_user():
        return agent_user

    app.dependency_overrides[get_current_user] = mock_get_current_user
    try:
        # list_users still uses manual superadmin check, not RoleChecker
        response = await client.get("/api/v1/admin/users")
        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_admin_cannot_access_admin_panel(client: AsyncClient, db_session: AsyncSession, admin_user: User):
    """ADMIN role should get 403 when listing users (superadmin-only)."""
    setattr(admin_user, "current_role", UserRole.ADMIN)
    setattr(admin_user, "current_tenant_id", None)

    async def mock_get_current_user():
        return admin_user

    app.dependency_overrides[get_current_user] = mock_get_current_user
    try:
        response = await client.get("/api/v1/admin/users")
        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()


# ═══════════════════════════════════════════════════════════════════════════════
# Admin role: should be able to access own tenant agents
# ═══════════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_admin_accesses_own_tenant_agents_200(client: AsyncClient, db_session: AsyncSession, admin_user: User, tenant_with_data: Tenant):
    """ADMIN role should be able to list agents for own tenant."""
    from app.modules.agents.models import AiAgent

    agent = AiAgent(id=uuid.uuid4(), tenant_id=tenant_with_data.id, name="My Agent")
    db_session.add(agent)
    await db_session.commit()

    setattr(admin_user, "current_role", UserRole.ADMIN)
    setattr(admin_user, "current_tenant_id", tenant_with_data.id)

    async def mock_get_current_user():
        return admin_user

    app.dependency_overrides[get_current_user] = mock_get_current_user
    try:
        response = await client.get("/api/v1/agents")
        assert response.status_code == 200
        ids = [a["id"] for a in response.json()]
        assert str(agent.id) in ids
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_superadmin_accesses_admin_panel_200(client: AsyncClient, db_session: AsyncSession):
    """SUPERADMIN role should be able to list users (admin panel)."""
    super_user = User(id=uuid.uuid4(), email="super@test.com", name="Super", password_hash="hash")
    db_session.add(super_user)
    await db_session.commit()

    setattr(super_user, "current_role", UserRole.SUPERADMIN)
    setattr(super_user, "current_tenant_id", None)

    async def mock_get_current_user():
        return super_user

    app.dependency_overrides[get_current_user] = mock_get_current_user
    try:
        response = await client.get("/api/v1/admin/users")
        assert response.status_code == 200
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_admin_can_assign_tenant(client: AsyncClient, db_session: AsyncSession, admin_user: User):
    """ADMIN role should be able to assign users to tenants (per updated spec)."""
    tenant = _create_tenant(db_session, "Assign Tenant", "assign")
    target_user = User(id=uuid.uuid4(), email="target@test.com", name="Target", password_hash="hash")
    db_session.add(target_user)
    await db_session.commit()

    setattr(admin_user, "current_role", UserRole.ADMIN)
    setattr(admin_user, "current_tenant_id", None)

    async def mock_get_current_user():
        return admin_user

    app.dependency_overrides[get_current_user] = mock_get_current_user
    try:
        payload = {
            "user_id": str(target_user.id),
            "tenant_id": str(tenant.id),
            "role": "agent",
        }
        response = await client.post("/api/v1/admin/assign-tenant", json=payload)
        assert response.status_code == 200
    finally:
        app.dependency_overrides.clear()
