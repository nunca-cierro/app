import pytest
import uuid
from jose import jwt
from app.modules.auth.service import create_access_token
from app.core.config import settings
from app.modules.auth.deps import RoleChecker, get_current_user
from app.modules.auth.models import User, UserRole
from app.modules.auth.user_tenant import UserTenant
from fastapi import HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession

def test_create_access_token_includes_role_and_tenant():
    user_id = str(uuid.uuid4())
    email = "test@example.com"
    role = "admin"
    tenant_id = str(uuid.uuid4())
    
    # This should fail initially as create_access_token doesn't take these args
    token = create_access_token(user_id, email, role=role, tenant_id=tenant_id)
    payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    
    assert payload["sub"] == user_id
    assert payload["email"] == email
    assert payload["role"] == role
    assert payload["tenant_id"] == tenant_id

@pytest.mark.asyncio
async def test_role_checker_allows_correct_role():
    checker = RoleChecker(allowed_roles=[UserRole.ADMIN, UserRole.SUPERADMIN])
    
    # Mock user with admin role
    user = User(id=uuid.uuid4(), email="admin@test.com", name="Admin")
    setattr(user, "current_role", UserRole.ADMIN)
    
    await checker(user=user) # Should not raise

@pytest.mark.asyncio
async def test_role_checker_raises_on_unauthorized_role():
    checker = RoleChecker(allowed_roles=[UserRole.SUPERADMIN])
    user = User(id=uuid.uuid4(), email="agent@test.com", name="Agent")
    setattr(user, "current_role", UserRole.AGENT)
    
from unittest.mock import AsyncMock, MagicMock
from fastapi.security import HTTPAuthorizationCredentials

@pytest.mark.asyncio
async def test_get_current_user_resolves_context():
    user_id = uuid.uuid4()
    email = "test@example.com"
    role = "agent"
    tenant_id = str(uuid.uuid4())
    
    token = create_access_token(str(user_id), email, role=role, tenant_id=tenant_id)
    credentials = MagicMock(spec=HTTPAuthorizationCredentials)
    credentials.credentials = token
    
    session = AsyncMock(spec=AsyncSession)
    user = User(id=user_id, email=email, name="Test")
    session.get.return_value = user
    
    resolved_user = await get_current_user(credentials=credentials, session=session)
    
    assert resolved_user.id == user_id
    assert resolved_user.current_role == role
    assert str(resolved_user.current_tenant_id) == tenant_id
