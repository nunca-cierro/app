"""Tests for auth registration — atomic tenant creation with admin role."""

from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient
from jose import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.modules.auth.models import User, UserRole
from app.modules.tenants.models import Tenant


@pytest.mark.asyncio
async def test_register_creates_admin_with_tenant(client: AsyncClient, db_session: AsyncSession):
    payload = {
        "email": "newuser@test.com",
        "password": "securepassword123",
        "name": "New User",
    }
    response = await client.post("/api/v1/auth/register", json=payload)

    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@test.com"
    assert data["role"] == UserRole.ADMIN
    assert data["tenant_id"] is not None

    # Verify User in DB
    result = await db_session.execute(select(User).where(User.email == "newuser@test.com"))
    user = result.scalar_one_or_none()
    assert user is not None
    assert user.role == UserRole.ADMIN

    # Verify Tenant was created
    assert data["tenant_id"] is not None
    tenant_result = await db_session.execute(
        select(Tenant).where(Tenant.id == uuid.UUID(data["tenant_id"]))
    )
    tenant = tenant_result.scalar_one_or_none()
    assert tenant is not None
    assert tenant.name == "New User"

    # Verify UserTenant association
    from app.modules.auth.user_tenant import UserTenant

    assoc_result = await db_session.execute(
        select(UserTenant).where(
            UserTenant.user_id == user.id,
            UserTenant.tenant_id == tenant.id,
        )
    )
    ut = assoc_result.scalar_one_or_none()
    assert ut is not None
    assert ut.role == UserRole.ADMIN
    assert ut.is_primary is True

    # Verify JWT includes admin role and tenant_id
    decoded = jwt.decode(data["access_token"], settings.jwt_secret, algorithms=["HS256"])
    assert decoded["role"] == UserRole.ADMIN
    assert decoded["tenant_id"] == data["tenant_id"]


@pytest.mark.asyncio
async def test_register_with_custom_tenant_name(client: AsyncClient, db_session: AsyncSession):
    payload = {
        "email": "custom@test.com",
        "password": "securepassword123",
        "name": "Custom User",
        "tenant_name": "My Business",
    }
    response = await client.post("/api/v1/auth/register", json=payload)

    assert response.status_code == 201
    data = response.json()

    # Verify tenant name matches custom
    tenant_result = await db_session.execute(
        select(Tenant).where(Tenant.id == uuid.UUID(data["tenant_id"]))
    )
    tenant = tenant_result.scalar_one_or_none()
    assert tenant is not None
    assert tenant.name == "My Business"


@pytest.mark.asyncio
async def test_register_duplicate_email_returns_409(client: AsyncClient, db_session: AsyncSession):
    payload = {
        "email": "dup@test.com",
        "password": "securepassword123",
        "name": "Dup User",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201

    response2 = await client.post("/api/v1/auth/register", json=payload)
    assert response2.status_code == 409
