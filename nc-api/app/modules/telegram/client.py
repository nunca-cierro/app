"""Telegram Bot API client — send messages and manage webhooks.

Uses ``httpx`` for asynchronous HTTP requests with retry and exponential
backoff on transient failures.
"""

from __future__ import annotations

import asyncio
import typing as t

import httpx
from loguru import logger

API_BASE = "https://api.telegram.org/bot"
MAX_MESSAGE_LENGTH = 4096
TRUNCATION_SUFFIX = "... (truncated)"


class TelegramClient:
    """Low-level Telegram Bot API wrapper.

    All methods accept the ``bot_token`` explicitly rather than storing it,
    so the caller (typically ``TelegramAdapter``) controls credential scope.
    """

    # ── Public API ─────────────────────────────────────────────────────────

    async def getMe(self, bot_token: str) -> dict[str, t.Any]:
        """Test the bot token by calling ``getMe``.

        Args:
            bot_token: The Telegram Bot API token.

        Returns:
            The JSON response from the Bot API.
        """
        url = f"{API_BASE}{bot_token}/getMe"
        return await self._request(url)

    async def setWebhook(
        self, bot_token: str, url: str
    ) -> dict[str, t.Any]:
        """Set the webhook URL for a bot.

        Args:
            bot_token: The Telegram Bot API token.
            url: The public HTTPS URL where Telegram sends updates.

        Returns:
            The JSON response from the Bot API.
        """
        api_url = f"{API_BASE}{bot_token}/setWebhook"
        return await self._request(api_url, json={"url": url})

    async def send_message(
        self,
        bot_token: str,
        chat_id: str,
        text: str,
        **kwargs: t.Any,
    ) -> dict[str, t.Any]:
        """Send a text message to a Telegram chat.

        Args:
            bot_token: The Telegram Bot API token.
            chat_id: The chat (or user) ID to send the message to.
            text: The message body.  Automatically truncated to 4096 chars.
            **kwargs: Additional Telegram parameters such as
                ``parse_mode``, ``reply_to_message_id``, ``disable_notification``.

        Returns:
            The JSON response from the Bot API.
        """
        text = self._truncate(text)
        payload: dict[str, t.Any] = {
            "chat_id": chat_id,
            "text": text,
            **kwargs,
        }

        url = f"{API_BASE}{bot_token}/sendMessage"
        return await self._request(url, json=payload)

    # ── Internal helpers ───────────────────────────────────────────────────

    @staticmethod
    def _truncate(text: str, max_len: int = MAX_MESSAGE_LENGTH) -> str:
        """Truncate *text* to *max_len* characters if it exceeds the limit."""
        if len(text) <= max_len:
            return text
        return text[: max_len - len(TRUNCATION_SUFFIX)] + TRUNCATION_SUFFIX

    async def _request(
        self,
        url: str,
        *,
        json: dict[str, t.Any] | None = None,
    ) -> dict[str, t.Any]:
        """POST to *url* with optional JSON body, retrying on failure.

        Retries up to 3 times with exponential backoff (2s / 4s / 8s).
        """
        last_exc: Exception | None = None
        for attempt in range(3):
            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.post(url, json=json)
                    data: dict[str, t.Any] = resp.json()
                    return data
            except Exception as exc:
                last_exc = exc
                if attempt < 2:
                    delay = 2 ** (attempt + 1)  # 2s, 4s
                    logger.warning(
                        "Telegram API attempt {n} failed: {exc} — "
                        "retrying in {delay}s",
                        n=attempt + 1,
                        exc=exc,
                        delay=delay,
                    )
                    await asyncio.sleep(delay)

        logger.error(
            "Telegram API request failed after 3 attempts: {exc}",
            exc=last_exc,
        )
        raise t.cast(Exception, last_exc)
