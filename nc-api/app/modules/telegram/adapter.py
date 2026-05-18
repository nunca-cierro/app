"""Telegram adapter — PlatformAdapter implementation for Telegram Bot API.

Wraps ``TelegramClient`` (HTTP) and credential handling so the rest of
the system can interact with Telegram through the uniform
``PlatformAdapter`` interface.
"""

from __future__ import annotations

import typing as t

from loguru import logger

from app.modules.platforms.adapter import PlatformAdapter
from app.modules.telegram.client import TelegramClient


class TelegramAdapter(PlatformAdapter):
    """Platform adapter for the Telegram Bot API.

    Credentials are expected to contain a ``bot_token`` key
    (stored encrypted in ``PlatformConnection.credentials``).
    """

    # ── Credentials ────────────────────────────────────────────────────────

    def resolve_credentials(self, connection: t.Any) -> dict[str, t.Any]:
        """Decrypt Telegram connection credentials.

        Returns the decrypted credentials dict (expected to contain
        ``bot_token``), or an empty dict on failure.
        """
        from app.core.encryption import decrypt  # lazy import

        decrypted = decrypt(connection.credentials)
        if not isinstance(decrypted, dict):
            logger.warning(
                "Telegram credentials for connection {id} are not a dict",
                id=connection.id,
            )
            return {}
        return decrypted

    # ── Sending ────────────────────────────────────────────────────────────

    async def send_message(
        self,
        connection: t.Any,
        to: str,
        text: str,
        **kwargs: t.Any,
    ) -> dict[str, t.Any]:
        """Send a text message via Telegram.

        Args:
            connection: The ``PlatformConnection`` model instance.
            to: Chat ID to send the message to.
            text: Message body.
            **kwargs: Additional Telegram parameters (parse_mode, etc.).

        Returns:
            The Bot API response dict.
        """
        creds = self.resolve_credentials(connection)
        bot_token: str = creds.get("bot_token", "")

        client = TelegramClient()
        return await client.send_message(bot_token, to, text, **kwargs)

    # ── Webhook validation ─────────────────────────────────────────────────

    async def validate_webhook(
        self,
        payload: dict[str, t.Any],
        headers: dict[str, str],
        **kwargs: t.Any,
    ) -> bool:
        """Validate an incoming Telegram webhook request.

        Telegram does not sign its webhook payloads, so validation
        is a simple check that the referenced connection is active.

        Args:
            payload: The parsed JSON body (unused for Telegram).
            headers: The request headers (unused for Telegram).
            **kwargs: Must include ``connection_status``.

        Returns:
            ``True`` if the connection is active, ``False`` otherwise.
        """
        status = kwargs.get("connection_status", "")
        if status == "active":
            return True

        logger.warning(
            "Telegram webhook validation failed: connection_status={status}",
            status=status,
        )
        return False
