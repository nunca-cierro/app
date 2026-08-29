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

        Two checks (fail-closed):

        1. **Secret token** — Telegram echoes the ``secret_token`` configured
           via ``setWebhook`` in the ``X-Telegram-Bot-Api-Secret-Token``
           header. We compare it (constant-time) against the deterministic
           per-connection secret derived from ``JWT_SECRET``. A missing or
           wrong header means the request was not sent by Telegram.
        2. **Connection status** — the referenced connection must be active.

        Args:
            payload: The parsed JSON body (unused for validation).
            headers: The request headers (must contain the secret header).
            **kwargs: Must include ``connection`` (the PlatformConnection).

        Returns:
            ``True`` only when both checks pass.
        """
        import hmac as hmac_mod

        from app.modules.telegram.security import (
            HEADER_NAME,
            telegram_webhook_secret,
        )

        connection = kwargs.get("connection")
        if connection is None or getattr(connection, "id", None) is None:
            logger.warning("Telegram webhook validation failed: no connection")
            return False

        expected_secret = telegram_webhook_secret(connection.id)

        # Case-insensitive header lookup — transports may vary casing
        received = (
            headers.get(HEADER_NAME)
            or headers.get(HEADER_NAME.lower())
            or ""
        )
        if not received or not hmac_mod.compare_digest(received, expected_secret):
            logger.warning(
                "Telegram webhook rejected: secret token mismatch | conn={cid}",
                cid=connection.id,
            )
            return False

        status = kwargs.get("connection_status", "")
        if status != "active":
            logger.warning(
                "Telegram webhook validation failed: connection_status={status}",
                status=status,
            )
            return False

        return True
