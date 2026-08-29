"""Tests: SSRF guards and role gates on platform-connection fetch endpoints.

- GET /evolution-fetch-instances: restricted to operator roles and validated
  against SSRF (the server fetches the URL and reflects the body, so
  private/loopback/link-local/reserved targets are rejected). The configured
  Evolution API host is allowlisted.
- POST /validate-telegram-token: requires the same operator capability as
  the other connection-mutation endpoints.
"""

from __future__ import annotations

import uuid

import httpx
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.main import app
from app.modules.auth.deps import get_current_user
from app.modules.auth.models import User, UserRole


def _override_auth(user: User) -> None:
    async def override_auth() -> User:
        return user

    app.dependency_overrides[get_current_user] = override_auth


def _client_role_user() -> User:
    user = User(
        id=uuid.uuid4(),
        email="client-ssrf@test.com",
        password_hash="hash",
        name="Client Role",
        role=UserRole.CLIENT,
    )
    setattr(user, "current_role", UserRole.CLIENT)
    setattr(user, "current_tenant_id", None)
    return user


def _superadmin_user() -> User:
    user = User(
        id=uuid.uuid4(),
        email="superadmin-ssrf@test.com",
        password_hash="hash",
        name="Superadmin SSRF",
        role=UserRole.SUPERADMIN,
    )
    setattr(user, "current_role", UserRole.SUPERADMIN)
    setattr(user, "current_tenant_id", None)
    return user


FETCH_INSTANCES_URL = "/api/v1/platform-connections/evolution-fetch-instances"


@pytest.mark.asyncio
async def test_fetch_instances_forbidden_for_client_role(
    client: AsyncClient, db_session: AsyncSession,
):
    """Client-role users must not reach the server-side Evolution fetch."""
    _override_auth(_client_role_user())
    try:
        response = await client.get(
            FETCH_INSTANCES_URL,
            params={"base_url": "http://evolution-api:8080"},
        )
        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()


@pytest.mark.parametrize(
    "base_url",
    [
        "http://169.254.169.254/latest/meta-data",  # cloud metadata (link-local)
        "http://127.0.0.1:9200/_cluster/health",  # loopback
        "http://10.1.2.3:8080",  # private range
        "http://192.168.1.50:8080",  # private range
    ],
)
@pytest.mark.asyncio
async def test_fetch_instances_rejects_internal_targets(
    client: AsyncClient, db_session: AsyncSession, base_url: str,
):
    """base_url hosts resolving to private/loopback/link-local/reserved
    ranges are rejected before any outbound request is made."""
    _override_auth(_superadmin_user())
    try:
        response = await client.get(FETCH_INSTANCES_URL, params={"base_url": base_url})
        assert response.status_code == 400, response.text
        assert "private" in response.json()["detail"].lower()
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_fetch_instances_rejects_non_http_scheme(
    client: AsyncClient, db_session: AsyncSession,
):
    _override_auth(_superadmin_user())
    try:
        response = await client.get(
            FETCH_INSTANCES_URL,
            params={"base_url": "ftp://evolution-api:8080"},
        )
        assert response.status_code == 422
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_fetch_instances_allows_configured_evolution_host(
    client: AsyncClient, db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch,
):
    """The configured Evolution API host is allowlisted; the outbound fetch
    is mocked to prove the request goes through with the apikey header."""
    _override_auth(_superadmin_user())
    captured: dict = {}
    orig_get = httpx.AsyncClient.get

    class _FakeResponse:
        is_success = True
        status_code = 200
        text = ""

        def json(self) -> list[dict]:
            return [{"instanceName": "sales", "state": "open"}]

    async def fake_get(self, url, headers=None, **kwargs):
        # The ASGI test client is itself an httpx.AsyncClient; delegate its
        # internal request (relative "/api/..." path) to the real transport
        # and only intercept the outbound Evolution fetch (absolute URL).
        if str(url).startswith("/api/"):
            return await orig_get(self, url, headers=headers, **kwargs)
        captured["url"] = str(url)
        captured["headers"] = headers
        return _FakeResponse()

    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)
    try:
        response = await client.get(
            FETCH_INSTANCES_URL,
            params={"base_url": settings.evo_api_base_url, "api_key": "test-key"},
        )
        assert response.status_code == 200, response.text
        assert response.json() == [{"instanceName": "sales", "state": "open"}]
        assert captured["url"] == f"{settings.evo_api_base_url}/instance/fetchInstances"
        assert captured["headers"] == {"apikey": "test-key"}
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_validate_telegram_token_forbidden_for_client_role(
    client: AsyncClient, db_session: AsyncSession,
):
    """Client-role users must not make the server hit api.telegram.org."""
    _override_auth(_client_role_user())
    try:
        response = await client.post(
            "/api/v1/platform-connections/validate-telegram-token",
            json={"bot_token": "123456:ABC-DEF-test"},
        )
        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()
