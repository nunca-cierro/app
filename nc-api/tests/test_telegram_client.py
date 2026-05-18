"""Tests for Telegram client — send_message, getMe, setWebhook."""

from __future__ import annotations

import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

os.environ.setdefault("ENCRYPTION_KEY", "dGhpcyBpcyBhIDE2LWJ5dGUgZXhhbXBsZSBrZXkgISE=")

from app.modules.telegram.client import TelegramClient


BOT_TOKEN = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"


class TestTelegramClient:
    """TelegramClient — send_message."""

    @pytest.mark.asyncio
    async def test_send_message_returns_ok(self) -> None:
        """send_message posts to Bot API and returns the response."""
        client = TelegramClient()
        mock_response = {"ok": True, "result": {"message_id": 42, "chat": {"id": 56789}}}

        with patch("app.modules.telegram.client.httpx") as mock_httpx:
            mock_client = AsyncMock()
            mock_httpx.AsyncClient.return_value.__aenter__.return_value = mock_client
            mock_resp = MagicMock()
            mock_resp.json.return_value = mock_response
            mock_client.post.return_value = mock_resp

            result = await client.send_message(BOT_TOKEN, "56789", "Hello!")

        assert result == mock_response
        mock_client.post.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_message_payload_structure(self) -> None:
        """send_message builds the correct Telegram Bot API payload."""
        client = TelegramClient()

        with patch("app.modules.telegram.client.httpx") as mock_httpx:
            mock_client = AsyncMock()
            mock_httpx.AsyncClient.return_value.__aenter__.return_value = mock_client
            mock_resp = MagicMock()
            mock_resp.json.return_value = {"ok": True, "result": {}}
            mock_client.post.return_value = mock_resp

            await client.send_message(BOT_TOKEN, "56789", "Hello!", parse_mode="HTML")

            call_kwargs = mock_client.post.call_args[1]
            assert call_kwargs["json"]["chat_id"] == "56789"
            assert call_kwargs["json"]["text"] == "Hello!"
            assert call_kwargs["json"]["parse_mode"] == "HTML"

    @pytest.mark.asyncio
    async def test_send_message_truncates_long_text(self) -> None:
        """send_message truncates text longer than 4096 chars."""
        client = TelegramClient()
        long_text = "A" * 5000

        with patch("app.modules.telegram.client.httpx") as mock_httpx:
            mock_client = AsyncMock()
            mock_httpx.AsyncClient.return_value.__aenter__.return_value = mock_client
            mock_resp = MagicMock()
            mock_resp.json.return_value = {"ok": True, "result": {}}
            mock_client.post.return_value = mock_resp

            await client.send_message(BOT_TOKEN, "56789", long_text)

            call_kwargs = mock_client.post.call_args[1]
            sent_text = call_kwargs["json"]["text"]
            assert len(sent_text) <= 4096
            assert sent_text.endswith("... (truncated)")

    @pytest.mark.asyncio
    async def test_send_message_retries_on_failure(self) -> None:
        """send_message retries up to 3 times with exponential backoff."""
        client = TelegramClient()

        with (
            patch("app.modules.telegram.client.httpx") as mock_httpx,
            patch("asyncio.sleep", new=AsyncMock()) as mock_sleep,
        ):
            mock_client = AsyncMock()
            mock_httpx.AsyncClient.return_value.__aenter__.return_value = mock_client
            mock_client.post.side_effect = RuntimeError("Connection error")

            with pytest.raises(RuntimeError, match="Connection error"):
                await client.send_message(BOT_TOKEN, "56789", "Hello!")

            assert mock_client.post.call_count == 3
            assert mock_sleep.call_count == 2  # 3 attempts = 2 sleeps between them

    @pytest.mark.asyncio
    async def test_send_message_reply_to_message_id(self) -> None:
        """send_message supports reply_to_message_id kwarg."""
        client = TelegramClient()

        with patch("app.modules.telegram.client.httpx") as mock_httpx:
            mock_client = AsyncMock()
            mock_httpx.AsyncClient.return_value.__aenter__.return_value = mock_client
            mock_resp = MagicMock()
            mock_resp.json.return_value = {"ok": True, "result": {}}
            mock_client.post.return_value = mock_resp

            await client.send_message(
                BOT_TOKEN, "56789", "Reply!", reply_to_message_id=99
            )

            call_kwargs = mock_client.post.call_args[1]
            assert call_kwargs["json"]["reply_to_message_id"] == 99


class TestTelegramGetMe:
    """TelegramClient.getMe."""

    @pytest.mark.asyncio
    async def test_get_me_valid_token(self) -> None:
        """getMe returns the bot info for a valid token."""
        client = TelegramClient()
        bot_info = {
            "ok": True,
            "result": {
                "id": 123456789,
                "is_bot": True,
                "first_name": "TestBot",
                "username": "test_bot",
            },
        }

        with patch("app.modules.telegram.client.httpx") as mock_httpx:
            mock_client = AsyncMock()
            mock_httpx.AsyncClient.return_value.__aenter__.return_value = mock_client
            mock_resp = MagicMock()
            mock_resp.json.return_value = bot_info
            mock_client.post.return_value = mock_resp

            result = await client.getMe(BOT_TOKEN)
            assert result == bot_info

    @pytest.mark.asyncio
    async def test_get_me_invalid_token_returns_error(self) -> None:
        """getMe returns error response for invalid token."""
        client = TelegramClient()
        error_response = {"ok": False, "error_code": 401, "description": "Unauthorized"}

        with patch("app.modules.telegram.client.httpx") as mock_httpx:
            mock_client = AsyncMock()
            mock_httpx.AsyncClient.return_value.__aenter__.return_value = mock_client
            mock_resp = MagicMock()
            mock_resp.json.return_value = error_response
            mock_client.post.return_value = mock_resp

            result = await client.getMe("invalid_token")
            assert result == error_response


class TestTelegramSetWebhook:
    """TelegramClient.setWebhook."""

    @pytest.mark.asyncio
    async def test_set_webhook_success(self) -> None:
        """setWebhook configures the webhook URL."""
        client = TelegramClient()
        webhook_url = "https://example.com/webhook/telegram/conn_abc"
        expected_response = {"ok": True, "result": True, "description": "Webhook was set"}

        with patch("app.modules.telegram.client.httpx") as mock_httpx:
            mock_client = AsyncMock()
            mock_httpx.AsyncClient.return_value.__aenter__.return_value = mock_client
            mock_resp = MagicMock()
            mock_resp.json.return_value = expected_response
            mock_client.post.return_value = mock_resp

            result = await client.setWebhook(BOT_TOKEN, webhook_url)

            assert result == expected_response
            call_kwargs = mock_client.post.call_args[1]
            assert call_kwargs["json"]["url"] == webhook_url
