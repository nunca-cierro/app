import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.tenants.models import Tenant
from app.modules.auth.models import User, UserRole
from app.modules.agents.models import AiAgent
from app.modules.conversations.models import Conversation
from app.modules.platform_connections.models import PlatformConnection
from app.modules.auth.deps import get_current_user
from app.main import app

def create_tenant(session, name, slug):
    tenant = Tenant(id=uuid.uuid4(), name=name, slug=slug, status="active", plan="basic", timezone="UTC", locale="en")
    session.add(tenant)
    return tenant

@pytest.mark.asyncio
async def test_tenant_isolation_conversations_detail(client: AsyncClient, db_session: AsyncSession):
    # Setup: Two tenants
    t1 = create_tenant(db_session, "Tenant 1", "t1")
    t2 = create_tenant(db_session, "Tenant 2", "t2")
    await db_session.flush()

    # User for Tenant 1
    u1 = User(id=uuid.uuid4(), email="u1@t1.com", name="User 1")
    setattr(u1, "current_role", UserRole.ADMIN)
    setattr(u1, "current_tenant_id", t1.id)

    # Conversation for Tenant 2
    c2 = Conversation(id=uuid.uuid4(), tenant_id=t2.id, external_user_id="123")
    db_session.add(c2)
    await db_session.commit()

    # Override auth to be User 1
    async def mock_get_current_user():
        return u1
    app.dependency_overrides[get_current_user] = mock_get_current_user

    try:
        response = await client.get(f"/api/v1/conversations/{c2.id}")
        assert response.status_code == 404
    finally:
        app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_tenant_isolation_conversations_list(client: AsyncClient, db_session: AsyncSession):
    # Setup: Two tenants
    t1 = create_tenant(db_session, "Tenant 1", "t1")
    t2 = create_tenant(db_session, "Tenant 2", "t2")
    await db_session.flush()

    # User for Tenant 1
    u1 = User(id=uuid.uuid4(), email="u1@t1.com", name="User 1")
    setattr(u1, "current_role", UserRole.ADMIN)
    setattr(u1, "current_tenant_id", t1.id)

    # Conversation for Tenant 1
    c1 = Conversation(id=uuid.uuid4(), tenant_id=t1.id, external_user_id="u1-t1")
    # Conversation for Tenant 2
    c2 = Conversation(id=uuid.uuid4(), tenant_id=t2.id, external_user_id="u2-t2")
    db_session.add(c1)
    db_session.add(c2)
    await db_session.commit()

    # Override auth to be User 1
    async def mock_get_current_user():
        return u1
    app.dependency_overrides[get_current_user] = mock_get_current_user

    try:
        response = await client.get("/api/v1/conversations")
        assert response.status_code == 200
        data = response.json()
        ids = [item["id"] for item in data]
        assert str(c1.id) in ids
        assert str(c2.id) not in ids
    finally:
        app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_tenant_isolation_agents_list(client: AsyncClient, db_session: AsyncSession):
    # Setup: Two tenants
    t1 = create_tenant(db_session, "Tenant 1", "t1")
    t2 = create_tenant(db_session, "Tenant 2", "t2")
    await db_session.flush()

    # User for Tenant 1
    u1 = User(id=uuid.uuid4(), email="u1@t1.com", name="User 1")
    setattr(u1, "current_role", UserRole.ADMIN)
    setattr(u1, "current_tenant_id", t1.id)

    # Agent for Tenant 1
    a1 = AiAgent(id=uuid.uuid4(), tenant_id=t1.id, name="Agent 1")
    # Agent for Tenant 2
    a2 = AiAgent(id=uuid.uuid4(), tenant_id=t2.id, name="Agent 2")
    db_session.add(a1)
    db_session.add(a2)
    await db_session.commit()

    # Override auth to be User 1
    async def mock_get_current_user():
        return u1
    app.dependency_overrides[get_current_user] = mock_get_current_user

    try:
        response = await client.get("/api/v1/agents")
        assert response.status_code == 200
        data = response.json()
        ids = [item["id"] for item in data]
        assert str(a1.id) in ids
        assert str(a2.id) not in ids
    finally:
        app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_tenant_isolation_platform_connections_list(client: AsyncClient, db_session: AsyncSession):
    # Setup: Two tenants
    t1 = create_tenant(db_session, "Tenant 1", "t1")
    t2 = create_tenant(db_session, "Tenant 2", "t2")
    await db_session.flush()

    # User for Tenant 1
    u1 = User(id=uuid.uuid4(), email="u1@t1.com", name="User 1")
    setattr(u1, "current_role", UserRole.ADMIN)
    setattr(u1, "current_tenant_id", t1.id)

    # Connection for Tenant 1
    p1 = PlatformConnection(
        id=uuid.uuid4(), 
        tenant_id=t1.id, 
        platform_type="whatsapp", 
        display_name="P1", 
        credentials="encrypted",
        status="active"
    )
    # Connection for Tenant 2
    p2 = PlatformConnection(
        id=uuid.uuid4(), 
        tenant_id=t2.id, 
        platform_type="whatsapp", 
        display_name="P2", 
        credentials="encrypted",
        status="active"
    )
    db_session.add(p1)
    db_session.add(p2)
    await db_session.commit()

    # Override auth to be User 1
    async def mock_get_current_user():
        return u1
    app.dependency_overrides[get_current_user] = mock_get_current_user

    try:
        response = await client.get("/api/v1/platform-connections")
        assert response.status_code == 200
        data = response.json()
        ids = [item["id"] for item in data]
        assert str(p1.id) in ids
        assert str(p2.id) not in ids
    finally:
        app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_superadmin_can_see_everything(client: AsyncClient, db_session: AsyncSession):
    # Setup: Two tenants
    t1 = create_tenant(db_session, "Tenant 1", "t1")
    t2 = create_tenant(db_session, "Tenant 2", "t2")
    await db_session.flush()

    # User for Superadmin
    u_super = User(id=uuid.uuid4(), email="super@test.com", name="Super")
    setattr(u_super, "current_role", UserRole.SUPERADMIN)
    setattr(u_super, "current_tenant_id", None)

    # Agent for Tenant 1
    a1 = AiAgent(id=uuid.uuid4(), tenant_id=t1.id, name="Agent 1")
    # Agent for Tenant 2
    a2 = AiAgent(id=uuid.uuid4(), tenant_id=t2.id, name="Agent 2")
    db_session.add(a1)
    db_session.add(a2)
    await db_session.commit()

    # Override auth to be Superadmin
    async def mock_get_current_user():
        return u_super
    app.dependency_overrides[get_current_user] = mock_get_current_user

    try:
        response = await client.get("/api/v1/agents")
        assert response.status_code == 200
        data = response.json()
        ids = [item["id"] for item in data]
        assert str(a1.id) in ids
        assert str(a2.id) in ids
    finally:
        app.dependency_overrides.clear()
