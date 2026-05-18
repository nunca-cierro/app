"""Tests for generic webhook endpoint — POST /webhook/{platform}/{connection_id}."""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

os.environ.setdefault("ENCRYPTION_KEY", "dGhpcyBpcyBhIDE2LWJ5dGUgZXhhbXBsZSBrZXkgISE=")

from app.core.encryption import encrypt
from app.modules.platform_connections.models import PlatformConnection
from app.modules.tenants.models import Tenant


async def _create_tenant(db_session) -> Tenant:
    tenant = Tenant(
        id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
        name="Webhook Test Tenant",
        slug="webhook-test",
        status="active",
        plan="basic",
        timezone="UTC",
        locale="en",
    )
    db_session.add(tenant)
    await db_session.commit()
    return tenant


async def _create_connection(
    db_session,
    tenant_id: uuid.UUID,
    platform: str = "telegram",
    status: str = "active",
) -> PlatformConnection:
    creds = {"bot_token": "123456:ABC"} if platform == "telegram" else {"token": "wa-token", "phone_number_id": "12345"}
    conn = PlatformConnection(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        platform_type=platform,
        display_name=f"Test {platform.title()}",
        credentials=encrypt(creds),
        status=status,
    )
    db_session.add(conn)
    await db_session.commit()
    return conn


# ── Telegram webhook ────────────────────────────────────────────────────────


class TestTelegramWebhookEndpoint:
    """POST /webhook/telegram/{connection_id}."""

    @pytest.mark.asyncio
    async def test_telegram_active_connection(self, client, db_session) -> None:
        """Active Telegram connection → 200, message processed."""
        tenant = await _create_tenant(db_session)
        conn = await _create_connection(db_session, tenant.id, "telegram", "active")

        with patch(
            "app.modules.integrations.webhook.groq_client.generate",
            new=AsyncMock(return_value="AI reply"),
        ):
            response = await client.post(
                f"/webhook/telegram/{conn.id}",
                json={
                    "update_id": 100,
                    "message": {
                        "message_id": 42,
                        "from": {"id": 56789, "is_bot": False},
                        "chat": {"id": 56789, "type": "private"},
                        "date": 1700000000,
                        "text": "Hello!",
                    },
                },
            )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"

    @pytest.mark.asyncio
    async def test_telegram_inactive_connection(self, client, db_session) -> None:
        """Inactive Telegram connection → 403."""
        tenant = await _create_tenant(db_session)
        conn = await _create_connection(db_session, tenant.id, "telegram", "inactive")

        response = await client.post(
            f"/webhook/telegram/{conn.id}",
            json={"update_id": 100, "message": {"text": "Hi"}},
        )

        assert response.status_code == 403
        data = response.json()
        assert "inactive" in data["detail"].lower() or "inactive" in str(data)

    @pytest.mark.asyncio
    async def test_telegram_connection_not_found(self, client) -> None:
        """Unknown connection_id → 404."""
        response = await client.post(
            f"/webhook/telegram/{uuid.uuid4()}",
            json={"update_id": 100, "message": {"text": "Hi"}},
        )

        assert response.status_code == 404


# ── WhatsApp webhook ────────────────────────────────────────────────────────


class TestWhatsAppWebhookEndpoint:
    """POST /webhook/whatsapp/{connection_id}."""

    @pytest.mark.asyncio
    async def test_whatsapp_valid_signature(self, client, db_session) -> None:
        """Valid signature + active connection → 200."""
        tenant = await _create_tenant(db_session)
        conn = await _create_connection(db_session, tenant.id, "whatsapp", "active")

        payload = {
            "object": "whatsapp_business_account",
            "entry": [{
                "changes": [{
                    "value": {
                        "messaging_product": "whatsapp",
                        "metadata": {"phone_number_id": "12345"},
                        "messages": [{
                            "from": "573001234567",
                            "id": "wamid.abc",
                            "type": "text",
                            "text": {"body": "Hello WhatsApp!"},
                        }],
                    },
                }],
            }],
        }

        body = json.dumps(payload, separators=(",", ":"), ensure_ascii=False)
        expected_sig = "sha256=" + hmac.new(
            b"test-secret", body.encode("utf-8"), hashlib.sha256
        ).hexdigest()

        with (
            patch(
                "app.core.config.settings.whatsapp_token",
                "test-secret",
            ),
            patch(
                "app.modules.integrations.webhook.groq_client.generate",
                new=AsyncMock(return_value="AI reply"),
            ),
        ):
            response = await client.post(
                f"/webhook/whatsapp/{conn.id}",
                json=payload,
                headers={"X-Hub-Signature-256": expected_sig},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"

    @pytest.mark.asyncio
    async def test_whatsapp_invalid_signature(self, client, db_session) -> None:
        """Invalid signature → 401."""
        tenant = await _create_tenant(db_session)
        conn = await _create_connection(db_session, tenant.id, "whatsapp", "active")

        payload = {"object": "whatsapp_business_account", "entry": []}

        response = await client.post(
            f"/webhook/whatsapp/{conn.id}",
            json=payload,
            headers={"X-Hub-Signature-256": "sha256=0000000000000000000000000000000000000000000000000000000000000000"},
        )

        assert response.status_code == 401
        data = response.json()
        assert "signature" in data["detail"].lower() or "signature" in str(data).lower()

    @pytest.mark.asyncio
    async def test_whatsapp_inactive_connection(self, client, db_session) -> None:
        """Valid signature but inactive connection → 403."""
        tenant = await _create_tenant(db_session)
        conn = await _create_connection(db_session, tenant.id, "whatsapp", "inactive")

        payload = {"object": "whatsapp_business_account", "entry": []}
        body = json.dumps(payload, separators=(",", ":"), ensure_ascii=False)
        expected_sig = "sha256=" + hmac.new(
            b"test-secret", body.encode("utf-8"), hashlib.sha256
        ).hexdigest()

        with patch(
            "app.core.config.settings.whatsapp_token",
            "test-secret",
        ):
            response = await client.post(
                f"/webhook/whatsapp/{conn.id}",
                json=payload,
                headers={"X-Hub-Signature-256": expected_sig},
            )

        assert response.status_code == 403


# ── Unknown platform ────────────────────────────────────────────────────────


class TestUnknownPlatform:
    """POST /webhook/{unknown}/{connection_id}."""

    @pytest.mark.asyncio
    async def test_unknown_platform_returns_400(self, client) -> None:
        """Unknown platform → 400."""
        response = await client.post(
            f"/webhook/instagram/{uuid.uuid4()}",
            json={},
        )
        assert response.status_code == 400


# ── Backward compat — old POST /webhook ─────────────────────────────────────


class TestOldWebhookBackwardCompat:
    """POST /webhook still works for WhatsApp only."""

    @pytest.mark.asyncio
    async def test_old_webhook_still_works(self, client, db_session) -> None:
        """Old POST /webhook endpoint remains functional."""
        payload = {
            "object": "whatsapp_business_account",
            "entry": [{
                "changes": [{
                    "value": {
                        "messaging_product": "whatsapp",
                        "metadata": {"phone_number_id": "unknown_999"},
                        "messages": [{
                            "from": "573009999999",
                            "id": "wamid.skip",
                            "type": "text",
                            "text": {"body": "Skip me"},
                        }],
                    },
                }],
            }],
        }

        with patch("app.modules.integrations.webhook.logger") as mock_logger:
            response = await client.post("/webhook", json=payload)

        assert response.status_code == 200
        mock_logger.warning.assert_called_once()
