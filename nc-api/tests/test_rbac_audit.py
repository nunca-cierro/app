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


def _create_tenant(db_session: AsyncSession, name: str, slug: str, plan: str = "basic") -> Tenant:
    tenant = Tenant(
        id=uuid.uuid4(),
        name=name,
        slug=slug,
        status="active",
        plan=plan,
        timezone="UTC",
        locale="en",
    )
    db_session.add(tenant)
    return tenant


@pytest_asyncio.fixture
async def client_user(db_session: AsyncSession) -> User:
    """Return a user with CLIENT role attached to a tenant (read-only role)."""
    user = User(id=uuid.uuid4(), email="client@test.com", name="Client User", password_hash="hash")
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
# Client role (read-only): should NOT be able to create/delete agents, platform
# connections, whatsapp numbers, tenants, or assign tenants — on ANY plan (RV-2)
# ═══════════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_client_cannot_create_agent(client: AsyncClient, db_session: AsyncSession, client_user: User, tenant_with_data: Tenant):
    """CLIENT role should get 403 when creating an agent."""
    setattr(client_user, "current_role", UserRole.CLIENT)
    setattr(client_user, "current_tenant_id", tenant_with_data.id)

    async def mock_get_current_user():
        return client_user

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
async def test_client_cannot_delete_agent(client: AsyncClient, db_session: AsyncSession, client_user: User, tenant_with_data: Tenant):
    """CLIENT role should get 403 when deleting an agent."""
    from app.modules.agents.models import AiAgent

    agent = AiAgent(id=uuid.uuid4(), tenant_id=tenant_with_data.id, name="Delete Me")
    db_session.add(agent)
    await db_session.commit()

    setattr(client_user, "current_role", UserRole.CLIENT)
    setattr(client_user, "current_tenant_id", tenant_with_data.id)

    async def mock_get_current_user():
        return client_user

    app.dependency_overrides[get_current_user] = mock_get_current_user
    try:
        response = await client.delete(f"/api/v1/agents/{agent.id}")
        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_client_cannot_create_platform_connection(client: AsyncClient, db_session: AsyncSession, client_user: User, tenant_with_data: Tenant):
    """CLIENT role should get 403 when creating a platform connection."""
    setattr(client_user, "current_role", UserRole.CLIENT)
    setattr(client_user, "current_tenant_id", tenant_with_data.id)

    async def mock_get_current_user():
        return client_user

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
async def test_client_cannot_delete_platform_connection(client: AsyncClient, db_session: AsyncSession, client_user: User, tenant_with_data: Tenant):
    """CLIENT role should get 403 when deleting a platform connection."""
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

    setattr(client_user, "current_role", UserRole.CLIENT)
    setattr(client_user, "current_tenant_id", tenant_with_data.id)

    async def mock_get_current_user():
        return client_user

    app.dependency_overrides[get_current_user] = mock_get_current_user
    try:
        response = await client.delete(f"/api/v1/platform-connections/{conn.id}")
        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_client_cannot_create_whatsapp_number(client: AsyncClient, db_session: AsyncSession, client_user: User, tenant_with_data: Tenant):
    """CLIENT role should get 403 when creating a WhatsApp number."""
    setattr(client_user, "current_role", UserRole.CLIENT)
    setattr(client_user, "current_tenant_id", tenant_with_data.id)

    async def mock_get_current_user():
        return client_user

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
async def test_client_cannot_create_tenant(client: AsyncClient, db_session: AsyncSession, client_user: User, tenant_with_data: Tenant):
    """CLIENT role should get 403 when creating a tenant."""
    setattr(client_user, "current_role", UserRole.CLIENT)
    setattr(client_user, "current_tenant_id", tenant_with_data.id)

    async def mock_get_current_user():
        return client_user

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
async def test_client_cannot_access_admin_panel(client: AsyncClient, db_session: AsyncSession, client_user: User):
    """CLIENT role should get 403 when listing users (admin endpoint)."""
    setattr(client_user, "current_role", UserRole.CLIENT)
    setattr(client_user, "current_tenant_id", None)

    async def mock_get_current_user():
        return client_user

    app.dependency_overrides[get_current_user] = mock_get_current_user
    try:
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
    """ADMIN role can assign users to tenants they manage (per updated spec)."""
    tenant = _create_tenant(db_session, "Assign Tenant", "assign")
    target_user = User(id=uuid.uuid4(), email="target@test.com", name="Target", password_hash="hash")
    db_session.add(target_user)
    await db_session.commit()

    setattr(admin_user, "current_role", UserRole.ADMIN)
    # Admin must be acting within their ACTIVE tenant — cross-tenant assignment is blocked
    setattr(admin_user, "current_tenant_id", tenant.id)

    async def mock_get_current_user():
        return admin_user

    app.dependency_overrides[get_current_user] = mock_get_current_user
    try:
        payload = {
            "user_id": str(target_user.id),
            "tenant_id": str(tenant.id),
            "role": "client",
        }
        response = await client.post("/api/v1/admin/assign-tenant", json=payload)
        assert response.status_code == 200
    finally:
        app.dependency_overrides.clear()


# ═══════════════════════════════════════════════════════════════════════════
# RV-2: client-403 matrix — EVERY mutation endpoint rejects client on ANY plan
# ═══════════════════════════════════════════════════════════════════════════


class TestClientMutationMatrix:
    """A client (read-only role) gets 403 on every mutation endpoint —
    agents, connections, tenants, admin, platform, whatsapp — regardless of
    the tenant plan (trial/basic/professional/enterprise)."""

    @pytest.mark.parametrize("plan", ["trial", "basic", "professional", "enterprise"])
    @pytest.mark.asyncio
    async def test_client_cannot_mutate_any_resource(
        self, client: AsyncClient, db_session: AsyncSession, plan: str
    ) -> None:
        from app.modules.agents.models import AiAgent
        from app.modules.platform_connections.models import PlatformConnection
        from app.modules.whatsapp.models import WhatsAppNumber

        tenant = _create_tenant(db_session, f"Matrix {plan}", f"matrix-{plan}", plan=plan)
        agent = AiAgent(id=uuid.uuid4(), tenant_id=tenant.id, name="Matrix Agent")
        conn = PlatformConnection(
            id=uuid.uuid4(),
            tenant_id=tenant.id,
            platform_type="whatsapp",
            display_name="Matrix Conn",
            credentials="encrypted",
            status="active",
        )
        number = WhatsAppNumber(
            id=uuid.uuid4(),
            tenant_id=tenant.id,
            phone_number_id="999",
            waba_id="waba-999",
            display_phone_number="+999",
            status="active",
        )
        target = User(
            id=uuid.uuid4(), email="target-matrix@test.com", name="Target", password_hash="hash"
        )
        db_session.add_all([agent, conn, number, target])
        await db_session.commit()

        client_user = User(
            id=uuid.uuid4(), email="client-matrix@test.com", name="Client", password_hash="hash"
        )
        setattr(client_user, "current_role", UserRole.CLIENT)
        setattr(client_user, "current_tenant_id", tenant.id)

        async def mock_get_current_user() -> User:
            return client_user

        app.dependency_overrides[get_current_user] = mock_get_current_user
        try:
            mutations: list[tuple[str, str, dict | None]] = [
                ("POST", "/api/v1/agents", {"name": "X", "tenant_id": str(tenant.id)}),
                ("POST", f"/api/v1/agents/{agent.id}/prompts", {"content": "p"}),
                ("PATCH", f"/api/v1/agents/{agent.id}", {"name": "Renamed"}),
                ("DELETE", f"/api/v1/agents/{agent.id}", None),
                (
                    "POST",
                    "/api/v1/platform-connections",
                    {
                        "tenant_id": str(tenant.id),
                        "platform_type": "whatsapp",
                        "display_name": "Test",
                        "credentials": {"token": "x"},
                        "status": "active",
                    },
                ),
                ("PATCH", f"/api/v1/platform-connections/{conn.id}", {"display_name": "R"}),
                ("DELETE", f"/api/v1/platform-connections/{conn.id}", None),
                (
                    "POST",
                    "/api/v1/whatsapp-numbers",
                    {
                        "tenant_id": str(tenant.id),
                        "phone_number_id": "12345",
                        "display_phone_number": "+1234567890",
                        "status": "active",
                    },
                ),
                ("PATCH", f"/api/v1/whatsapp-numbers/{number.id}", {"display_phone_number": "+0"}),
                ("DELETE", f"/api/v1/whatsapp-numbers/{number.id}", None),
                # NOTE: client PATCH /tenants/{id} is NO LONGER a blanket 403 —
                # owner decision #1 lets a client edit their OWN tenant's
                # business card ({name, timezone, locale, notes}). The matrix
                # keeps asserting the field restriction: plan is outside the
                # client's business-card fields → 403. (The client's
                # current_tenant_id here IS tenant.id, so the request passes
                # the isolation check and hits the field gate.)
                ("PATCH", f"/api/v1/tenants/{tenant.id}", {"plan": "enterprise"}),
                ("DELETE", f"/api/v1/tenants/{tenant.id}", None),
                (
                    "POST",
                    "/api/v1/admin/users",
                    {"email": "u@t.com", "password": "secret123", "name": "U", "role": "client"},
                ),
                ("PATCH", f"/api/v1/admin/users/{target.id}", {"role": "client"}),
                ("DELETE", f"/api/v1/admin/users/{target.id}", None),
                ("POST", "/api/v1/agent-templates", {"name": "T", "category": "general"}),
            ]
            for method, url, body in mutations:
                response = await client.request(method, url, json=body)
                assert response.status_code == 403, (
                    f"{method} {url} → {response.status_code} on plan={plan} "
                    f"(detail={response.text[:120]})"
                )
        finally:
            app.dependency_overrides.clear()


# ═══════════════════════════════════════════════════════════════════════════
# UR-9: pre-migration agent JWTs authenticate as client (DB role is truth)
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_legacy_agent_jwt_authenticates_as_client(db_session: AsyncSession):
    """A JWT issued BEFORE the migration (role claim 'agent') resolves
    current_role from DB users.role — now 'client' — and is denied every
    admin-gated endpoint (UR-9 scenario)."""
    from unittest.mock import MagicMock

    from fastapi import HTTPException
    from fastapi.security import HTTPAuthorizationCredentials

    from app.modules.auth.deps import RoleChecker
    from app.modules.auth.service import create_access_token

    user = User(
        id=uuid.uuid4(),
        email="legacy@test.com",
        name="Legacy Agent",
        password_hash="hash",
        role=UserRole.CLIENT,  # post-migration DB role
    )
    db_session.add(user)
    await db_session.commit()

    # Token carries the OLD role claim (issued while the role was still agent)
    token = create_access_token(str(user.id), user.email, role="agent", tenant_id=None)
    credentials = MagicMock(spec=HTTPAuthorizationCredentials)
    credentials.credentials = token

    resolved = await get_current_user(credentials=credentials, session=db_session)

    # current_role comes from DB users.role, never the JWT claim
    assert resolved.current_role == UserRole.CLIENT

    # Admin-gated endpoints deny the legacy user
    checker = RoleChecker(allowed_roles=[UserRole.SUPERADMIN])
    with pytest.raises(HTTPException) as exc:
        await checker(user=resolved)
    assert exc.value.status_code == 403
