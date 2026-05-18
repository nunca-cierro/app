"""Platform adapters — abstract base and platform-specific implementations.

Each platform (WhatsApp, Telegram, …) implements the ``PlatformAdapter`` ABC
so the rest of the system can interact with it through a uniform interface.
"""

from __future__ import annotations

import hashlib
import hmac
import typing as t
from abc import ABC, abstractmethod

import httpx
from loguru import logger


class PlatformAdapter(ABC):
    """Interface that every platform adapter must implement."""

    @abstractmethod
    async def send_message(
        self,
        connection: t.Any,
        to: str,
        text: str,
        **kwargs: t.Any,
    ) -> dict[str, t.Any]:
        """Send a text message via the platform.

        Args:
            connection: The ``PlatformConnection`` model instance.
            to: Recipient identifier (phone number, chat ID, …).
            text: Message body.
            **kwargs: Platform-specific options.

        Returns:
            The platform API response as a dict.
        """
        ...

    @abstractmethod
    def resolve_credentials(self, connection: t.Any) -> dict[str, t.Any]:
        """Decrypt and return the credentials dict for *connection*.

        Args:
            connection: The ``PlatformConnection`` model instance.

        Returns:
            Decrypted credentials as a plain dict.
        """
        ...

    @abstractmethod
    async def validate_webhook(
        self,
        payload: dict[str, t.Any],
        headers: dict[str, str],
        **kwargs: t.Any,
    ) -> bool:
        """Validate an incoming webhook request.

        Args:
            payload: The parsed JSON body of the webhook request.
            headers: The request headers (e.g. ``X-Hub-Signature-256``).
            **kwargs: Platform-specific validation options (e.g. ``app_secret``).

        Returns:
            ``True`` if the request is valid, ``False`` otherwise.
        """
        ...


class WhatsAppAdapter(PlatformAdapter):
    """WhatsApp Cloud API adapter."""

    # ── Credentials ────────────────────────────────────────────────────────

    def resolve_credentials(self, connection: t.Any) -> dict[str, t.Any]:
        """Decrypt WhatsApp connection credentials."""
        # pylint: disable=import-outside-toplevel
        from app.core.encryption import decrypt

        decrypted = decrypt(connection.credentials)
        if not isinstance(decrypted, dict):
            logger.warning(
                "WhatsApp credentials for connection {id} are not a dict",
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
        """Send a plain-text WhatsApp message via the Cloud API.

        The credentials MUST contain ``phone_number_id`` and ``token``.
        """
        creds = self.resolve_credentials(connection)
        phone_number_id: str = creds.get("phone_number_id", "")
        token: str = creds.get("token", "")

        url = (
            f"https://graph.facebook.com/v22.0"
            f"/{phone_number_id}/messages"
        )
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "text",
            "text": {"body": text},
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            data: dict[str, t.Any] = resp.json()
            msg_id = data.get("messages", [{}])[0].get("id", "?")
            logger.info(
                "WhatsApp message sent to {to} | msg_id={id}",
                to=to,
                id=msg_id,
            )
            return data

    # ── Webhook validation ─────────────────────────────────────────────────

    async def validate_webhook(
        self,
        payload: dict[str, t.Any],
        headers: dict[str, str],
        **kwargs: t.Any,
    ) -> bool:
        """Verify the ``X-Hub-Signature-256`` header.

        Requires ``app_secret`` in *kwargs* (or falls back to settings).
        """
        # Case-insensitive lookup — HTTP transports may normalise header names
        signature = (
            headers.get("X-Hub-Signature-256")
            or headers.get("x-hub-signature-256")
            or ""
        )
        if not signature:
            logger.warning("WhatsApp webhook missing X-Hub-Signature-256 header")
            return False

        # Resolve the app secret
        app_secret: str = kwargs.get("app_secret", "") or self._get_app_secret()

        # Recompute the signature from the payload body
        import json

        body = json.dumps(payload, separators=(",", ":"), ensure_ascii=False)
        expected = hmac.new(
            app_secret.encode("utf-8"),
            body.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        # Extract the hash part from the header value ("sha256=…")
        received = signature.replace("sha256=", "")

        return hmac.compare_digest(expected, received)

    @staticmethod
    def _get_app_secret() -> str:
        """Retrieve the WhatsApp app secret from settings."""
        from app.core.config import settings  # pylint: disable=import-outside-toplevel

        return settings.whatsapp_token or ""
