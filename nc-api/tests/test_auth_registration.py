import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.auth.models import User, UserRole
from sqlalchemy import select

@pytest.mark.asyncio
async def test_register_creates_client_without_tenant(client: AsyncClient, db_session: AsyncSession):
    payload = {
        "email": "newuser@test.com",
        "password": "securepassword123",
        "name": "New User"
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@test.com"
    
    # Verify in DB
    result = await db_session.execute(select(User).where(User.email == "newuser@test.com"))
    user = result.scalar_one_or_none()
    assert user is not None
    assert user.role == UserRole.CLIENT
    
    # Verify no tenants
    from app.modules.auth.user_tenant import UserTenant
    tenant_result = await db_session.execute(select(UserTenant).where(UserTenant.user_id == user.id))
    assocs = tenant_result.scalars().all()
    assert len(assocs) == 0
