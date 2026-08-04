"""Tests for health/readiness probes — GET /health and GET /ready."""

from __future__ import annotations

import pytest

import app.main as main_mod


class _StubEngine:
    """Async engine stub: connect() returns self; execute() ok/fails per `ok`."""

    def __init__(self, ok: bool) -> None:
        self.ok = ok

    def connect(self) -> "_StubEngine":
        return self

    async def __aenter__(self) -> "_StubEngine":
        return self

    async def __aexit__(self, *args: object) -> bool:
        return False

    async def execute(self, *args: object, **kwargs: object) -> None:
        if not self.ok:
            raise RuntimeError("database down")


class TestHealth:
    """GET /health — pure liveness, no dependency checks."""

    @pytest.mark.asyncio
    async def test_health_returns_200(self, client) -> None:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "service" in data and "version" in data


class TestReady:
    """GET /ready — verifies only the database (SELECT 1)."""

    @pytest.mark.asyncio
    async def test_ready_200_when_db_ok(self, client, monkeypatch) -> None:
        monkeypatch.setattr(main_mod, "engine", _StubEngine(ok=True))
        response = await client.get("/ready")
        assert response.status_code == 200
        assert response.json() == {"status": "ready", "database": "ok"}

    @pytest.mark.asyncio
    async def test_ready_503_when_db_down(self, client, monkeypatch) -> None:
        monkeypatch.setattr(main_mod, "engine", _StubEngine(ok=False))
        response = await client.get("/ready")
        assert response.status_code == 503
        assert response.json() == {"status": "not_ready", "database": "error"}


class TestSafeExc:
    """Exception messages must never leak DSN credentials into logs."""

    def test_redacts_url_credentials(self) -> None:
        exc = RuntimeError(
            "connection failed: postgresql+asyncpg://postgres:super-secret@localhost:5432/db"
        )
        safe = main_mod._safe_exc(exc)
        assert "super-secret" not in safe
        assert "postgres:super-secret@" not in safe
        assert "://***@" in safe

    def test_plain_message_untouched(self) -> None:
        exc = RuntimeError("database not reachable")
        assert main_mod._safe_exc(exc) == "database not reachable"
