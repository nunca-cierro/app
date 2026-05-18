"""Tests for PlatformAdapter ABC and WhatsAppAdapter implementation."""

from __future__ import annotations

import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

os.environ.setdefault("ENCRYPTION_KEY", "dGhpcyBpcyBhIDE2LWJ5dGUgZXhhbXBsZSBrZXkgISE=")

from app.modules.platforms.adapter import PlatformAdapter, WhatsAppAdapter


class TestPlatformAdapter:
    """Verify the ABC contract."""

    def test_cannot_instantiate_abc(self) -> None:
        """PlatformAdapter cannot be instantiated directly."""
        with pytest.raises(TypeError, match="Can't instantiate abstract class"):
            PlatformAdapter()  # type: ignore[abstract]

    def test_has_abstract_methods(self) -> None:
        """PlatformAdapter defines three abstract methods."""
        abstract_methods = PlatformAdapter.__abstractmethods__
        assert "send_message" in abstract_methods
        assert "resolve_credentials" in abstract_methods
        assert "validate_webhook" in abstract_methods


class TestWhatsAppAdapter:
    """Verify WhatsAppAdapter implements the ABC contract."""

    def test_implements_all_abstract_methods(self) -> None:
        """WhatsAppAdapter can be instantiated (all methods implemented)."""
        adapter = WhatsAppAdapter()
        assert isinstance(adapter, PlatformAdapter)

    def test_class_name(self) -> None:
        assert WhatsAppAdapter.__name__ == "WhatsAppAdapter"

    # ── resolve_credentials ───────────────────────────────────────────────

    def test_resolve_credentials_with_mock_connection(self) -> None:
        """resolve_credentials decrypts and returns credentials from a connection."""
        import uuid

        from app.core.encryption import encrypt
        from app.modules.platform_connections.models import PlatformConnection

        creds = {"phone_number_id": "12345", "token": "test-token-abc"}
        conn = PlatformConnection(
            id=uuid.uuid4(),
            tenant_id=uuid.uuid4(),
            platform_type="whatsapp",
            display_name="Test",
            credentials=encrypt(creds),
            status="active",
        )
        adapter = WhatsAppAdapter()
        result = adapter.resolve_credentials(conn)
        assert result == creds

    def test_resolve_credentials_empty_dict(self) -> None:
        """resolve_credentials handles empty credentials."""
        import uuid

        from app.core.encryption import encrypt
        from app.modules.platform_connections.models import PlatformConnection

        conn = PlatformConnection(
            id=uuid.uuid4(),
            tenant_id=uuid.uuid4(),
            platform_type="whatsapp",
            display_name="Test Empty",
            credentials=encrypt({}),
            status="active",
        )
        adapter = WhatsAppAdapter()
        result = adapter.resolve_credentials(conn)
        assert result == {}

    # ── validate_webhook ───────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_validate_webhook_valid_signature(self) -> None:
        """validate_webhook returns True for a valid SHA256 signature."""
        import hashlib
        import hmac
        import json

        adapter = WhatsAppAdapter()

        payload = {"object": "whatsapp_business_account", "entry": []}
        # Use the same serialization as the adapter
        body = json.dumps(payload, separators=(",", ":"), ensure_ascii=False)

        app_secret = "test_app_secret"
        expected_sig = "sha256=" + hmac.new(
            app_secret.encode("utf-8"),
            body.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        headers = {"X-Hub-Signature-256": expected_sig}
        result = await adapter.validate_webhook(payload, headers, app_secret=app_secret)
        assert result is True

    @pytest.mark.asyncio
    async def test_validate_webhook_invalid_signature(self) -> None:
        """validate_webhook returns False for an invalid signature."""
        adapter = WhatsAppAdapter()

        payload = {"object": "whatsapp_business_account"}
        headers = {
            "X-Hub-Signature-256": "sha256=0000000000000000000000000000000000000000000000000000000000000000"
        }
        result = await adapter.validate_webhook(payload, headers, app_secret="test_secret")
        assert result is False

    @pytest.mark.asyncio
    async def test_validate_webhook_missing_signature(self) -> None:
        """validate_webhook returns False when signature header is missing."""
        adapter = WhatsAppAdapter()
        payload = {"object": "whatsapp_business_account"}
        headers: dict = {}
        result = await adapter.validate_webhook(payload, headers, app_secret="test_secret")
        assert result is False

    # ── send_message ───────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_send_message_returns_dict(self) -> None:
        """send_message calls the WhatsApp API and returns a response dict."""
        import uuid

        from app.core.encryption import encrypt
        from app.modules.platform_connections.models import PlatformConnection

        creds = {"phone_number_id": "12345", "token": "test-token-abc"}
        conn = PlatformConnection(
            id=uuid.uuid4(),
            tenant_id=uuid.uuid4(),
            platform_type="whatsapp",
            display_name="Test",
            credentials=encrypt(creds),
            status="active",
        )

        mock_response = {"messages": [{"id": "wamid.test123"}]}
        mock_resp = MagicMock()
        mock_resp.json.return_value = mock_response

        adapter = WhatsAppAdapter()
        with patch("app.modules.platforms.adapter.httpx") as mock_httpx:
            mock_client = AsyncMock()
            mock_httpx.AsyncClient.return_value.__aenter__.return_value = mock_client
            mock_client.post.return_value = mock_resp

            result = await adapter.send_message(conn, "573001234567", "Hello!")

        assert result == mock_response
        mock_client.post.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_message_payload_structure(self) -> None:
        """send_message builds the correct WhatsApp Cloud API payload."""
        import uuid

        from app.core.encryption import encrypt
        from app.modules.platform_connections.models import PlatformConnection

        creds = {"phone_number_id": "555666", "token": "my-token"}
        conn = PlatformConnection(
            id=uuid.uuid4(),
            tenant_id=uuid.uuid4(),
            platform_type="whatsapp",
            display_name="Test",
            credentials=encrypt(creds),
            status="active",
        )

        mock_resp = MagicMock()
        mock_resp.json.return_value = {"messages": [{"id": "x"}]}

        adapter = WhatsAppAdapter()
        with patch("app.modules.platforms.adapter.httpx") as mock_httpx:
            mock_client = AsyncMock()
            mock_httpx.AsyncClient.return_value.__aenter__.return_value = mock_client
            mock_client.post.return_value = mock_resp

            await adapter.send_message(conn, "573001234567", "Hello!")

            call_kwargs = mock_client.post.call_args[1]
            assert call_kwargs["json"]["messaging_product"] == "whatsapp"
            assert call_kwargs["json"]["to"] == "573001234567"
            assert call_kwargs["json"]["text"]["body"] == "Hello!"
            assert call_kwargs["headers"]["Authorization"] == "Bearer my-token"
