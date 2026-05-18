"""Test configuration — shared fixtures for all test modules."""

from __future__ import annotations

import os
import uuid
from collections.abc import AsyncGenerator
from typing import Any

# ── Must be set BEFORE any app imports ────────────────────────────────────
os.environ.setdefault("ENCRYPTION_KEY", "dGhpcyBpcyBhIDE2LWJ5dGUgZXhhbXBsZSBrZXkgISE=")

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import NullPool
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.db.base import Base
from app.db.session import get_session
from app.main import app
from app.modules.auth.models import User
from app.modules.auth.deps import get_current_user

# ── Test database ─────────────────────────────────────────────────────────
# Uses the same DB settings as the app (overridable via DATABASE_URL env var)
TEST_DATABASE_URL = os.environ.get("DATABASE_URL", settings.database_url)

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False, poolclass=NullPool)
test_session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture(loop_scope="session")
async def setup_database() -> AsyncGenerator[None, None]:
    """Create all tables before tests, drop after."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()


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

    async def override_auth() -> User:
        return dummy_user

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = override_auth

    transport = ASGITransport(app=app)  # type: ignore[arg-type]
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
