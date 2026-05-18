"""WhatsApp Cloud API client — send messages and verify webhooks.

In Phase 1 (single WABA), tokens come from env settings.
In Phase 3 (Embedded Signup), tokens come from per-tenant ``integrations``.
"""

from __future__ import annotations

import typing as t

import httpx
from loguru import logger

from app.core.config import settings


async def send_text_message(
    to: str,
    text: str,
    phone_number_id: str,
    token: str | None = None,
) -> dict[str, t.Any]:
    """Send a plain-text WhatsApp message.

    Args:
        to: Recipient phone number (incl. country code, e.g. 573001234567).
        text: Message body.
        phone_number_id: WhatsApp Phone Number ID (from Meta).
        token: Access token. Falls back to ``settings.whatsapp_token``.

    Returns:
        The JSON response from the WhatsApp Cloud API.
    """
    token = token or settings.whatsapp_token
    url = (
        f"{settings.whatsapp_base_url}/{settings.whatsapp_api_version}"
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

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            data: dict[str, t.Any] = resp.json()
            msg_id = data.get("messages", [{}])[0].get("id", "?")
            logger.info(
                "Message sent to {to} | msg_id={id}",
                to=to,
                id=msg_id,
            )
            return data
    except httpx.HTTPStatusError as exc:
        logger.error(
            "WhatsApp API error | status={status} | body={body}",
            status=exc.response.status_code,
            body=exc.response.text,
        )
        raise
    except httpx.RequestError as exc:
        logger.error("WhatsApp API request failed | {error}", error=str(exc))
        raise


async def verify_webhook(mode: str, token: str, challenge: str) -> str | None:
    """Verify the WhatsApp webhook during setup.

    Returns the challenge string on success, or ``None`` on failure.
    """
    if mode == "subscribe" and token == settings.whatsapp_verify_token:
        logger.info("Webhook verified successfully")
        return challenge

    logger.warning(
        "Webhook verification failed | mode={mode} | token_match={match}",
        mode=mode,
        match=(token == settings.whatsapp_verify_token),
    )
    return None
