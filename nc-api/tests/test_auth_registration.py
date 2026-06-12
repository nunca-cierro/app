"""Tests for auth registration — bare user creation, no auto-tenant."""

from __future__ import annotations

import pytest
from httpx import AsyncClient
from jose import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.modules.auth.models import User, UserRole


@pytest.mark.asyncio
async def test_register_creates_user_with_default_role(client: AsyncClient, db_session: AsyncSession):
    payload = {
        "email": "newuser@test.com",
        "password": "securepassword123",
        "name": "New User",
    }
    response = await client.post("/api/v1/auth/register", json=payload)

    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@test.com"
    assert data["role"] == UserRole.CLIENT
    assert data["tenant_id"] is None  # No auto-tenant

    # Verify User in DB
    result = await db_session.execute(select(User).where(User.email == "newuser@test.com"))
    user = result.scalar_one_or_none()
    assert user is not None
    assert user.role == UserRole.CLIENT

    # Verify JWT has no tenant context
    decoded = jwt.decode(data["access_token"], settings.jwt_secret, algorithms=["HS256"])
    assert decoded["role"] == UserRole.CLIENT
    assert decoded["tenant_id"] is None


@pytest.mark.asyncio
async def test_register_with_custom_role(client: AsyncClient, db_session: AsyncSession):
    payload = {
        "email": "agent@test.com",
        "password": "securepassword123",
        "name": "Agent User",
        "role": "agent",
    }
    response = await client.post("/api/v1/auth/register", json=payload)

    assert response.status_code == 201
    data = response.json()
    assert data["role"] == "agent"

    # Verify in DB
    result = await db_session.execute(select(User).where(User.email == "agent@test.com"))
    user = result.scalar_one_or_none()
    assert user is not None
    assert user.role == UserRole.AGENT


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


@pytest.mark.asyncio
async def test_register_short_password_returns_422(client: AsyncClient):
    payload = {
        "email": "short@test.com",
        "password": "12345",
        "name": "Short",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_superadmin_role(client: AsyncClient, db_session: AsyncSession):
    payload = {
        "email": "super@test.com",
        "password": "securepassword123",
        "name": "Super Admin",
        "role": "superadmin",
    }
    response = await client.post("/api/v1/auth/register", json=payload)

    assert response.status_code == 201
    data = response.json()
    assert data["role"] == "superadmin"

    result = await db_session.execute(select(User).where(User.email == "super@test.com"))
    user = result.scalar_one_or_none()
    assert user is not None
    assert user.role == UserRole.SUPERADMIN
