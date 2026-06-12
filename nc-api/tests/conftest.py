"""Test configuration — shared fixtures for all test modules."""

from __future__ import annotations

import os
import urllib.parse
import uuid
from collections.abc import AsyncGenerator
from typing import Any

# ── Must be set BEFORE any app imports ────────────────────────────────────
os.environ.setdefault("ENCRYPTION_KEY", "dGhpcyBpcyBhIDE2LWJ5dGUgZXhhbXBsZSBrZXkgISE=")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret-not-production")
os.environ.setdefault("PAYMENT_NEQUI_NUMBER", "3001234567")
os.environ.setdefault("PAYMENT_BREB_NUMBER", "3007654321")
os.environ.setdefault("PAYMENT_ACCOUNT_HOLDER", "NuncaCierro SAS")

import asyncpg
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import NullPool
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.db.base import Base
from app.db.session import get_session
from app.main import app
from app.modules.auth.models import User, UserRole
from app.modules.auth.deps import get_current_user

# ── Test database ─────────────────────────────────────────────────────────
# Uses a SEPARATE database (nuncacierro_test) to avoid dropping dev data.
# Falls back to DATABASE_URL if TEST_DATABASE_URL is not set.

def _build_test_db_url() -> str:
    """Derive test DB URL — uses TEST_DATABASE_URL env or appends _test to the db name."""
    # 1. Explicit env var wins
    env_url = os.environ.get("TEST_DATABASE_URL")
    if env_url:
        return env_url

    # 2. Settings override (from .env)
    if settings.test_database_url:
        return settings.test_database_url

    # 3. Derive from DATABASE_URL: .../nuncacierro → .../nuncacierro_test
    base = settings.database_url
    raw = base.replace("+asyncpg", "")
    parsed = urllib.parse.urlparse(raw)
    db_name = parsed.path.lstrip("/")
    if db_name.endswith("_test"):
        return base  # already a test DB

    new_path = f"/{db_name}_test"
    new_parsed = parsed._replace(path=new_path)
    new_url = urllib.parse.urlunparse(new_parsed)
    # Restore +asyncpg driver
    if "+asyncpg" in base:
        new_url = new_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return new_url


TEST_DATABASE_URL = _build_test_db_url()


async def _ensure_test_database() -> str:
    """Create the test database if it doesn't exist. Returns the test DB URL."""
    # Parse the main URL to extract connection params (without +asyncpg)
    raw = TEST_DATABASE_URL.replace("+asyncpg", "")
    parsed = urllib.parse.urlparse(raw)
    test_db_name = parsed.path.lstrip("/")

    # Connect to the maintenance 'postgres' database to create/drop test DBs
    conn = await asyncpg.connect(
        host=parsed.hostname or "localhost",
        port=parsed.port or 5432,
        user=parsed.username or "postgres",
        password=parsed.password or "",
        database="postgres",
    )
    try:
        exists = await conn.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = $1", test_db_name
        )
        if not exists:
            await conn.execute(f'CREATE DATABASE "{test_db_name}"')
    finally:
        await conn.close()

    return TEST_DATABASE_URL


async def _drop_test_database() -> None:
    """Drop the test database after tests complete."""
    raw = TEST_DATABASE_URL.replace("+asyncpg", "")
    parsed = urllib.parse.urlparse(raw)
    test_db_name = parsed.path.lstrip("/")

    conn = await asyncpg.connect(
        host=parsed.hostname or "localhost",
        port=parsed.port or 5432,
        user=parsed.username or "postgres",
        password=parsed.password or "",
        database="postgres",
    )
    try:
        # Terminate any lingering connections (like our own engine)
        await conn.execute(f"""
            SELECT pg_terminate_backend(pg_stat_activity.pid)
            FROM pg_stat_activity
            WHERE pg_stat_activity.datname = '{test_db_name}'
              AND pid <> pg_backend_pid()
        """)
        await conn.execute(f'DROP DATABASE IF EXISTS "{test_db_name}"')
    except Exception:
        pass  # Best-effort cleanup — don't fail teardown
    finally:
        await conn.close()


test_engine = create_async_engine(TEST_DATABASE_URL, echo=False, poolclass=NullPool)
test_session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture(loop_scope="session")
async def setup_database() -> AsyncGenerator[None, None]:
    """Create the test DB, all tables before tests, drop after."""
    await _ensure_test_database()
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Teardown: close engine then drop the test database
    await test_engine.dispose()
    await _drop_test_database()


@pytest_asyncio.fixture
async def db_session(setup_database: Any) -> AsyncGenerator[AsyncSession, None]:
    """Provide a test DB session."""
    async with test_session_factory() as session:
        yield session


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """FastAPI test client with overridden DB session and auth bypass."""

    async def override_session() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    # Override auth to return a dummy user
    dummy_user = User(
        id=uuid.uuid4(),
        email="test@example.com",
        password_hash="not-a-real-hash",
        name="Test User",
    )
    # Dynamically attach role context (normally done by get_current_user from JWT)
    dummy_user.current_role = UserRole.SUPERADMIN
    dummy_user.current_tenant_id = None

    async def override_auth() -> User:
        return dummy_user

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = override_auth

    transport = ASGITransport(app=app)  # type: ignore[arg-type]
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
