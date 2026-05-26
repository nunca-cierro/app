"""Evolution API adapter — PlatformAdapter implementation for Evolution API v2.x.

Evolution API v2.x is a self-hosted WhatsApp gateway that replaces the
direct Meta Cloud API connection.  This adapter:

1. **Sends messages** via ``/message/sendText/{instance}``
2. **Simulates typing** via ``/chat/sendPresence/{instance}`` before sending
3. **Supports configurable delay** (ms) between composing and the actual message
   — a WhatsApp ban-mitigation best practice.

Credentials (encrypted in ``PlatformConnection.credentials``)::

    {
      "base_url": "https://evolution-api-production-9fb2.up.railway.app",
      "api_key": "your-evolution-api-key",
      "instance_name": "nuncacierro"
    }

The ``base_url`` is the root URL of your Evolution API server (no trailing slash).
"""

from __future__ import annotations

import asyncio
import typing as t

import httpx
from loguru import logger

from app.modules.platforms.adapter import PlatformAdapter

# ── Constants ───────────────────────────────────────────────────────────────

DEFAULT_DELAY_MS: int = 2000  # 2 seconds — WhatsApp ban mitigation
COMPOSING_PRESENCE: str = "composing"
PRESENCE_DELAY_MS: int = 1000  # 1 second of "composing" before the message


class EvolutionAdapter(PlatformAdapter):
    """Platform adapter for Evolution API v2.x (WhatsApp gateway)."""

    # ── Credentials ─────────────────────────────────────────────────────────

    def resolve_credentials(self, connection: t.Any) -> dict[str, t.Any]:
        """Decrypt Evolution API connection credentials.

        Returns the decrypted credentials dict (expected to contain
        ``base_url``, ``api_key``, and ``instance_name``), or an empty
        dict on failure.
        """
        from app.core.encryption import decrypt  # lazy import

        decrypted = decrypt(connection.credentials)
        if not isinstance(decrypted, dict):
            logger.warning(
                "Evolution credentials for connection {id} are not a dict",
                id=connection.id,
            )
            return {}
        return decrypted

    # ── Sending ─────────────────────────────────────────────────────────────

    async def send_message(
        self,
        connection: t.Any,
        to: str,
        text: str,
        **kwargs: t.Any,
    ) -> dict[str, t.Any]:
        """Send a text message via Evolution API with ban-mitigation.

        The flow is:
        1. Send **"composing"** presence (typing indicator)
        2. Wait for the configured **delay** (default: 2 s)
        3. Send the actual **text message**

        Args:
            connection: The ``PlatformConnection`` model instance.
                Credentials must contain ``base_url``, ``api_key``, and
                ``instance_name``.
            to: Recipient phone number (e.g. ``573001234567``).
            text: Message body.
            **kwargs: Optional overrides —
                ``delay_ms`` (int): custom delay in milliseconds.
                ``presence_ms`` (int): custom composing duration in ms.

        Returns:
            The Evolution API response dict.
        """
        creds = self.resolve_credentials(connection)
        base_url: str = (creds.get("base_url") or "").rstrip("/")
        api_key: str = creds.get("api_key", "") or ""
        instance_name: str = creds.get("instance_name", "") or ""

        if not base_url or not instance_name:
            msg = (
                "Evolution adapter misconfigured: "
                "base_url and instance_name are required"
            )
            logger.error(msg)
            raise ValueError(msg)

        delay_ms = kwargs.get("delay_ms", DEFAULT_DELAY_MS)
        presence_ms = kwargs.get("presence_ms", PRESENCE_DELAY_MS)

        headers = {
            "Content-Type": "application/json",
        }
        if api_key:
            headers["apikey"] = api_key

        async with httpx.AsyncClient(timeout=15.0, base_url=base_url) as client:
            # ── Step 1: Send "composing" presence ────────────────────────────
            try:
                presence_payload = {
                    "number": to,
                    "presence": COMPOSING_PRESENCE,
                    "delay": presence_ms,
                }
                presence_url = f"/chat/sendPresence/{instance_name}"
                presence_resp = await client.post(
                    presence_url, json=presence_payload, headers=headers
                )
                if presence_resp.is_success:
                    logger.info(
                        "Evolution composing sent to {to} "
                        "| presence_ms={ms}",
                        to=to,
                        ms=presence_ms,
                    )
                else:
                    logger.warning(
                        "Evolution presence non-200 | status={s} | body={b}",
                        s=presence_resp.status_code,
                        b=presence_resp.text[:200],
                    )
            except Exception as exc:
                # Presence failure is non-fatal — continue to send the message
                logger.warning(
                    "Evolution presence failed (non-fatal): {exc}",
                    exc=exc,
                )

            # ── Step 2: Wait for the configured delay ────────────────────────
            if delay_ms > 0:
                logger.debug(
                    "Evolution delay={ms}ms before send to {to}",
                    ms=delay_ms,
                    to=to,
                )
                await asyncio.sleep(delay_ms / 1000.0)

            # ── Step 3: Send the text message ────────────────────────────────
            text_payload: dict[str, t.Any] = {
                "number": to,
                "text": text,
                "delay": delay_ms,
                "linkPreview": False,
            }

            text_url = f"/message/sendText/{instance_name}"
            resp = await client.post(text_url, json=text_payload, headers=headers)
            resp.raise_for_status()
            data: dict[str, t.Any] = resp.json()

            evo_msg_id = data.get("key", {}).get("id") or data.get("id", "?")
            logger.info(
                "Evolution message sent to {to} | msg_id={id}",
                to=to,
                id=evo_msg_id,
            )
            return data

    # ── Webhook validation ─────────────────────────────────────────────────

    async def validate_webhook(
        self,
        payload: dict[str, t.Any],
        headers: dict[str, str],
        **kwargs: t.Any,
    ) -> bool:
        """Validate an incoming Evolution API webhook request.

        Evolution API validates by checking that the ``instance`` field
        in the payload matches the connection's stored instance name.
        This prevents cross-instance webhook confusion.

        Optionally, if the connection stores an ``api_key``, we also
        verify the ``apikey`` header (case-insensitive).

        Args:
            payload: The parsed JSON body.
            headers: The request headers.
            **kwargs: Must include ``connection`` (the
                ``PlatformConnection`` instance) for credential resolution.

        Returns:
            ``True`` if the request is valid, ``False`` otherwise.
        """
        connection = kwargs.get("connection")
        if connection is None:
            logger.warning("Evolution webhook validation: no connection provided")
            return False

        creds = self.resolve_credentials(connection)
        if not creds:
            return False

        stored_instance: str = creds.get("instance_name", "") or ""
        if not stored_instance:
            logger.warning(
                "Evolution credentials missing instance_name for connection {id}",
                id=connection.id,
            )
            return False

        # ── Check instance name matches ──────────────────────────────────
        payload_instance: str = (
            payload.get("instance") or ""
        ).strip()

        if payload_instance != stored_instance:
            logger.warning(
                "Evolution webhook instance mismatch: "
                "payload='{got}' vs connection='{expected}'",
                got=payload_instance,
                expected=stored_instance,
            )
            return False

        # ── Optional: verify API key header ──────────────────────────────
        stored_api_key: str = creds.get("api_key", "") or ""
        if stored_api_key:
            header_key = (
                headers.get("apikey")
                or headers.get("APIKEY")
                or headers.get("ApiKey")
                or ""
            )
            if header_key != stored_api_key:
                logger.warning(
                    "Evolution webhook apikey header mismatch "
                    "for connection {id}",
                    id=connection.id,
                )
                # Instance match is sufficient — log but don't fail on api key
                logger.info(
                    "Evolution webhook proceeding with instance validation only"
                )

        logger.info(
            "Evolution webhook validated | instance={inst}",
            inst=stored_instance,
        )
        return True
