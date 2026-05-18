"""Telegram webhook — convert Telegram Update objects to internal message format.

The Telegram Bot API delivers updates as JSON objects.  This module
extracts the relevant fields from a ``message`` update and transforms
them into the generic message dict used throughout the application.
"""

from __future__ import annotations

import typing as t

from loguru import logger

# ── Types ───────────────────────────────────────────────────────────────────

TelegramUpdate = dict[str, t.Any]
ParsedMessage = dict[str, t.Any] | None

# ── Extraction entry point ──────────────────────────────────────────────────


def extract_telegram_message(update: TelegramUpdate) -> ParsedMessage:
    """Extract a text message from a Telegram Update.

    Ignores updates of type:
    - ``callback_query``
    - ``channel_post``
    - ``edited_message`` / ``edited_channel_post``
    - Non-text content (photo, sticker, voice, etc.)

    Args:
        update: A raw Telegram Update dict from the Bot API.

    Returns:
        A dict with ``external_user_id``, ``external_message_id``,
        ``content``, ``chat_id``, ``reply_to_message_id`` and
        ``has_entities``, or ``None`` if the update does not contain
        a usable text message.
    """
    msg = update.get("message")
    if msg is None:
        logger.debug(
            "Ignoring non-message update type (update_id={uid})",
            uid=update.get("update_id"),
        )
        return None

    # Only process text messages
    text: str | None = msg.get("text")
    if not text:
        logger.debug(
            "Ignoring non-text message (msg_id={mid})",
            mid=msg.get("message_id"),
        )
        return None

    chat = msg.get("chat", {})
    chat_id = str(chat.get("id", ""))
    message_id = str(msg.get("message_id", ""))
    from_user = msg.get("from", {})

    # Build reply_to_message_id if the message is a reply
    reply_to: str | None = None
    if "reply_to_message" in msg:
        reply_to = str(msg["reply_to_message"].get("message_id", ""))

    has_entities = bool(msg.get("entities"))

    logger.info(
        "Telegram message from {user} in chat {chat}: {text}",
        user=from_user.get("id"),
        chat=chat_id,
        text=text[:80],
    )

    return {
        "external_user_id": chat_id,
        "external_message_id": message_id,
        "content": text,
        "chat_id": chat_id,
        "reply_to_message_id": reply_to,
        "has_entities": has_entities,
    }
