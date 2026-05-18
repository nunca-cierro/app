"""Tests for TelegramAdapter — PlatformAdapter implementation."""

from __future__ import annotations

import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

os.environ.setdefault("ENCRYPTION_KEY", "dGhpcyBpcyBhIDE2LWJ5dGUgZXhhbXBsZSBrZXkgISE=")

from app.modules.platforms.adapter import PlatformAdapter
from app.modules.telegram.adapter import TelegramAdapter


class TestTelegramAdapterABC:
    """TelegramAdapter implements PlatformAdapter contract."""

    def test_can_instantiate(self) -> None:
        """TelegramAdapter can be instantiated (all abstract methods implemented)."""
        adapter = TelegramAdapter()
        assert isinstance(adapter, PlatformAdapter)

    def test_class_name(self) -> None:
        assert TelegramAdapter.__name__ == "TelegramAdapter"


class TestTelegramAdapterResolveCredentials:
    """TelegramAdapter.resolve_credentials."""

    def test_resolve_credentials_returns_bot_token(self) -> None:
        """resolve_credentials decrypts and returns bot_token from connection."""
        import uuid

        from app.core.encryption import encrypt
        from app.modules.platform_connections.models import PlatformConnection

        creds = {"bot_token": "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"}
        conn = PlatformConnection(
            id=uuid.uuid4(),
            tenant_id=uuid.uuid4(),
            platform_type="telegram",
            display_name="Test Bot",
            credentials=encrypt(creds),
            status="active",
        )
        adapter = TelegramAdapter()
        result = adapter.resolve_credentials(conn)
        assert result == creds

    def test_resolve_credentials_empty_dict(self) -> None:
        """resolve_credentials handles empty credentials gracefully."""
        import uuid

        from app.core.encryption import encrypt
        from app.modules.platform_connections.models import PlatformConnection

        conn = PlatformConnection(
            id=uuid.uuid4(),
            tenant_id=uuid.uuid4(),
            platform_type="telegram",
            display_name="Empty Bot",
            credentials=encrypt({}),
            status="active",
        )
        adapter = TelegramAdapter()
        result = adapter.resolve_credentials(conn)
        assert result == {}


class TestTelegramAdapterValidateWebhook:
    """TelegramAdapter.validate_webhook."""

    @pytest.mark.asyncio
    async def test_validate_webhook_active_connection(self) -> None:
        """validate_webhook returns True when connection is active."""
        adapter = TelegramAdapter()
        result = await adapter.validate_webhook(
            payload={},
            headers={},
            connection_status="active",
        )
        assert result is True

    @pytest.mark.asyncio
    async def test_validate_webhook_inactive_connection(self) -> None:
        """validate_webhook returns False when connection is inactive."""
        adapter = TelegramAdapter()
        result = await adapter.validate_webhook(
            payload={},
            headers={},
            connection_status="inactive",
        )
        assert result is False

    @pytest.mark.asyncio
    async def test_validate_webhook_default_inactive(self) -> None:
        """validate_webhook defaults to False when no status is provided."""
        adapter = TelegramAdapter()
        result = await adapter.validate_webhook(payload={}, headers={})
        assert result is False


class TestTelegramAdapterSendMessage:
    """TelegramAdapter.send_message delegates to TelegramClient."""

    @pytest.mark.asyncio
    async def test_send_message_delegates_to_client(self) -> None:
        """send_message calls TelegramClient.send_message with correct args."""
        import uuid

        from app.core.encryption import encrypt
        from app.modules.platform_connections.models import PlatformConnection

        creds = {"bot_token": "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"}
        conn = PlatformConnection(
            id=uuid.uuid4(),
            tenant_id=uuid.uuid4(),
            platform_type="telegram",
            display_name="Test Bot",
            credentials=encrypt(creds),
            status="active",
        )

        mock_response = {"ok": True, "result": {"message_id": 42}}
        adapter = TelegramAdapter()

        with patch(
            "app.modules.telegram.adapter.TelegramClient"
        ) as MockClient:
            mock_client = AsyncMock()
            MockClient.return_value = mock_client
            mock_client.send_message.return_value = mock_response

            result = await adapter.send_message(
                connection=conn,
                to="56789",
                text="Hello from adapter!",
            )

        assert result == mock_response
        mock_client.send_message.assert_awaited_once_with(
            "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11",
            "56789",
            "Hello from adapter!",
        )

    @pytest.mark.asyncio
    async def test_send_message_passes_kwargs(self) -> None:
        """send_message passes extra kwargs like parse_mode to client."""
        import uuid

        from app.core.encryption import encrypt
        from app.modules.platform_connections.models import PlatformConnection

        creds = {"bot_token": "token:abc"}
        conn = PlatformConnection(
            id=uuid.uuid4(),
            tenant_id=uuid.uuid4(),
            platform_type="telegram",
            display_name="Test",
            credentials=encrypt(creds),
            status="active",
        )

        adapter = TelegramAdapter()
        with patch(
            "app.modules.telegram.adapter.TelegramClient"
        ) as MockClient:
            mock_client = AsyncMock()
            MockClient.return_value = mock_client

            await adapter.send_message(
                connection=conn,
                to="56789",
                text="Bold text",
                parse_mode="Markdown",
            )

            mock_client.send_message.assert_awaited_once_with(
                "token:abc",
                "56789",
                "Bold text",
                parse_mode="Markdown",
            )
