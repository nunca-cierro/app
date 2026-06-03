import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.tenants.models import Tenant
from app.modules.auth.models import User, UserRole
from app.modules.auth.user_tenant import UserTenant
from app.modules.auth.deps import get_current_user
from app.main import app
from sqlalchemy import select

def create_tenant(session, name, slug):
    tenant = Tenant(id=uuid.uuid4(), name=name, slug=slug, status="active", plan="basic", timezone="UTC", locale="en")
    session.add(tenant)
    return tenant

@pytest.mark.asyncio
async def test_assign_tenant_as_superadmin(client: AsyncClient, db_session: AsyncSession):
    # Setup
    tenant = create_tenant(db_session, "Omega", "omega")
    user_to_assign = User(id=uuid.uuid4(), email="john@doe.com", name="John Doe", password_hash="hash")
    db_session.add(user_to_assign)
    await db_session.commit()

    superadmin = User(id=uuid.uuid4(), email="super@test.com", name="Super", password_hash="hash")
    setattr(superadmin, "current_role", UserRole.SUPERADMIN)

    # Override auth
    async def mock_get_current_user():
        return superadmin
    app.dependency_overrides[get_current_user] = mock_get_current_user

    try:
        payload = {
            "user_id": str(user_to_assign.id),
            "tenant_id": str(tenant.id),
            "role": "agent"
        }
        response = await client.post("/api/v1/admin/assign-tenant", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"

        # Verify in DB
        result = await db_session.execute(
            select(UserTenant).where(
                UserTenant.user_id == user_to_assign.id,
                UserTenant.tenant_id == tenant.id
            )
        )
        assoc = result.scalar_one_or_none()
        assert assoc is not None
        assert assoc.role == "agent"
        assert assoc.is_primary is True
    finally:
        app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_assign_tenant_unauthorized(client: AsyncClient, db_session: AsyncSession):
    # Setup
    tenant = create_tenant(db_session, "Omega", "omega")
    user_to_assign = User(id=uuid.uuid4(), email="john@doe.com", name="John Doe", password_hash="hash")
    db_session.add(user_to_assign)
    await db_session.commit()

    regular_admin = User(id=uuid.uuid4(), email="admin@test.com", name="Admin", password_hash="hash")
    setattr(regular_admin, "current_role", UserRole.ADMIN)

    # Override auth
    async def mock_get_current_user():
        return regular_admin
    app.dependency_overrides[get_current_user] = mock_get_current_user

    try:
        payload = {
            "user_id": str(user_to_assign.id),
            "tenant_id": str(tenant.id),
            "role": "agent"
        }
        response = await client.post("/api/v1/admin/assign-tenant", json=payload)
        
        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()
