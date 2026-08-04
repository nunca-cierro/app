"""Regression tests for Evolution webhook validation — fail-closed apikey.

The adapter must REJECT webhooks whose `apikey` header is missing or does
not match the stored credential (previously it logged a warning and fell
back to instance-only validation, leaving a forged-webhook vector open).
"""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, patch

import pytest

from app.core.encryption import encrypt
from app.modules.evolution.adapter import EvolutionAdapter
from app.modules.platform_connections.models import PlatformConnection
from app.modules.tenants.models import Tenant


def _make_connection(creds: dict) -> PlatformConnection:
    return PlatformConnection(
        id=uuid.uuid4(),
        tenant_id=uuid.uuid4(),
        platform_type="evolution",
        display_name="Test Evolution",
        credentials=encrypt(creds),
        status="active",
    )


EVO_PAYLOAD: dict = {
    "event": "messages.upsert",
    "instance": "inst-test",
    "data": {
        "key": {
            "remoteJid": "573001234567@s.whatsapp.net",
            "fromMe": False,
            "id": "msg-001",
        },
        "pushName": "Cliente",
        "message": {"conversation": "Hola, ¿qué productos tienen?"},
        "messageType": "conversation",
    },
}


class TestValidateWebhookFailClosed:
    """EvolutionAdapter.validate_webhook — apikey must be enforced."""

    @pytest.mark.asyncio
    async def test_valid_apikey_header_returns_true(self) -> None:
        conn = _make_connection(
            {"base_url": "http://evo:8080", "api_key": "correct-key", "instance_name": "inst-test"}
        )
        adapter = EvolutionAdapter()
        valid = await adapter.validate_webhook(
            EVO_PAYLOAD, {"apikey": "correct-key"}, connection=conn
        )
        assert valid is True

    @pytest.mark.asyncio
    async def test_mismatched_apikey_header_returns_false(self) -> None:
        """Regression: wrong apikey header must be REJECTED (fail-closed)."""
        conn = _make_connection(
            {"base_url": "http://evo:8080", "api_key": "correct-key", "instance_name": "inst-test"}
        )
        adapter = EvolutionAdapter()
        valid = await adapter.validate_webhook(
            EVO_PAYLOAD, {"apikey": "attacker-key"}, connection=conn
        )
        assert valid is False

    @pytest.mark.asyncio
    async def test_missing_apikey_header_returns_false(self) -> None:
        """Regression: missing apikey header must be REJECTED when a key is stored."""
        conn = _make_connection(
            {"base_url": "http://evo:8080", "api_key": "correct-key", "instance_name": "inst-test"}
        )
        adapter = EvolutionAdapter()
        valid = await adapter.validate_webhook(EVO_PAYLOAD, {}, connection=conn)
        assert valid is False

    @pytest.mark.asyncio
    async def test_legacy_connection_without_api_key_still_validates_instance(
        self, monkeypatch
    ) -> None:
        """Backward compat: no own key AND no global key → instance-only validation."""
        from app.core.config import settings

        monkeypatch.setattr(settings, "evo_api_key", "")
        conn = _make_connection({"base_url": "http://evo:8080", "instance_name": "inst-test"})
        adapter = EvolutionAdapter()
        valid = await adapter.validate_webhook(EVO_PAYLOAD, {}, connection=conn)
        assert valid is True

    @pytest.mark.asyncio
    async def test_global_key_is_used_when_connection_has_no_own_key(
        self, monkeypatch
    ) -> None:
        """W3: connection without own key validates against the GLOBAL key."""
        from app.core.config import settings

        monkeypatch.setattr(settings, "evo_api_key", "global-key")
        conn = _make_connection({"base_url": "http://evo:8080", "instance_name": "inst-test"})

        adapter = EvolutionAdapter()
        ok = await adapter.validate_webhook(
            EVO_PAYLOAD, {"apikey": "global-key"}, connection=conn
        )
        bad = await adapter.validate_webhook(
            EVO_PAYLOAD, {"apikey": "wrong-key"}, connection=conn
        )
        assert ok is True
        assert bad is False


class TestEvolutionWebhookEndpoint:
    """POST /webhook/evolution/{id} — auth enforced at the HTTP layer."""

    async def _create_tenant_and_conn(self, db_session):
        tenant = Tenant(
            id=uuid.uuid4(),
            name="Evo Test Tenant",
            slug="evo-test",
            status="active",
            plan="professional",
            timezone="UTC",
            locale="es",
        )
        db_session.add(tenant)
        await db_session.flush()
        conn = PlatformConnection(
            id=uuid.uuid4(),
            tenant_id=tenant.id,
            platform_type="evolution",
            display_name="Evo Conn",
            credentials=encrypt(
                {"base_url": "http://evo:8080", "api_key": "secret-evo-key", "instance_name": "inst-test"}
            ),
            status="active",
        )
        db_session.add(conn)
        await db_session.commit()
        return tenant, conn

    @pytest.mark.asyncio
    async def test_webhook_with_wrong_or_missing_apikey_returns_403(
        self, client, db_session
    ) -> None:
        tenant, conn = await self._create_tenant_and_conn(db_session)
        wrong = await client.post(
            f"/webhook/evolution/{conn.id}",
            json=EVO_PAYLOAD,
            headers={"apikey": "wrong-key"},
        )
        missing = await client.post(f"/webhook/evolution/{conn.id}", json=EVO_PAYLOAD)
        assert wrong.status_code == 403
        assert missing.status_code == 403

    @pytest.mark.asyncio
    async def test_webhook_with_valid_apikey_is_processed(self, client, db_session) -> None:
        tenant, conn = await self._create_tenant_and_conn(db_session)
        with (
            patch(
                "app.modules.evolution.handler.groq_client.generate",
                new=AsyncMock(return_value="AI reply"),
            ),
            patch(
                "app.modules.evolution.adapter.EvolutionAdapter.send_message",
                new=AsyncMock(return_value={"key": {"id": "evo-out-1"}}),
            ),
        ):
            response = await client.post(
                f"/webhook/evolution/{conn.id}",
                json=EVO_PAYLOAD,
                headers={"apikey": "secret-evo-key"},
            )
        assert response.status_code == 200
        assert response.json()["status"] == "ok"
