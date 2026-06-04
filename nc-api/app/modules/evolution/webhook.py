"""Evolution API webhook — convert Evolution API events to internal message format.

Evolution API v2.x delivers WhatsApp messages as ``messages.upsert`` events.
This module extracts the relevant fields and transforms them into the
generic message dict used throughout the application.

Evolution API webhook payload (messages.upsert)::

    {
      "event": "messages.upsert",
      "instance": "my-instance",
      "data": {
        "key": {
          "remoteJid": "573001234567@s.whatsapp.net",
          "fromMe": false,
          "id": "BAN_MSG_ID"
        },
        "pushName": "Contact Name",
        "message": {
          "conversation": "Hola, quiero info"
        },
        "messageType": "conversation"
      }
    }
"""

from __future__ import annotations

import typing as t

from loguru import logger

# ── Types ───────────────────────────────────────────────────────────────────

EvolutionEvent = dict[str, t.Any]
ParsedMessage = dict[str, t.Any] | None

# ── Constants ───────────────────────────────────────────────────────────────

SUPPORTED_EVENTS = {"messages.upsert"}
CONNECTION_EVENTS = {"connection.update"}
TEXT_MESSAGE_TYPES = {"conversation", "extendedTextMessage"}

# ── Extraction ──────────────────────────────────────────────────────────────


def extract_evolution_message(event: EvolutionEvent) -> ParsedMessage:
    """Extract a text message from an Evolution API webhook event.

    Ignores:
    - Events other than ``messages.upsert``
    - Messages sent by the bot itself (``fromMe == true``)
    - Non-text message types (image, audio, document, etc.)

    Args:
        event: A raw Evolution API webhook payload.

    Returns:
        A dict with ``external_user_id`` (cleaned phone number),
        ``external_message_id``, ``content``, ``remote_jid`` (full JID),
        ``instance_name``, and ``push_name`` — or ``None`` if the event
        does not contain a usable text message.
    """
    # ── 1. Validate event type ───────────────────────────────────────────
    event_name = event.get("event", "")
    if event_name not in SUPPORTED_EVENTS:
        logger.debug(
            "Ignoring unsupported Evolution event type={evt}",
            evt=event_name,
        )
        return None

    instance_name: str = event.get("instance", "") or ""

    # ── 2. Extract data payload ──────────────────────────────────────────
    data = event.get("data") or {}
    key = data.get("key") or {}

    remote_jid: str = key.get("remoteJid", "") or ""
    from_me: bool = key.get("fromMe", False)
    message_id: str = key.get("id", "") or ""

    if not remote_jid or not message_id:
        logger.debug("Ignoring Evolution event with missing key fields")
        return None

    # ── 3. Skip own messages ─────────────────────────────────────────────
    if from_me:
        logger.debug(
            "Ignoring own message (fromMe=True) | jid={jid}",
            jid=remote_jid,
        )
        return None

    # ── 4. Extract text content ──────────────────────────────────────────
    message = data.get("message") or {}
    message_type: str = data.get("messageType", "") or ""

    if message_type not in TEXT_MESSAGE_TYPES:
        logger.debug(
            "Ignoring non-text message type={mtype} | jid={jid}",
            mtype=message_type,
            jid=remote_jid,
        )
        return None

    # ``messages.upsert`` delivers text in different shapes:
    #   - "conversation"    → direct text string
    #   - "extendedTextMessage" → nested object with "text" field
    text: str = ""
    if message_type == "conversation":
        text = (message.get("conversation") or "").strip()
    elif message_type == "extendedTextMessage":
        ext = message.get("extendedTextMessage") or {}
        text = (ext.get("text") or "").strip()

    if not text:
        logger.debug("Ignoring empty text message | jid={jid}", jid=remote_jid)
        return None

    # ── 5. Normalise remoteJid — strip WhatsApp suffix ───────────────────
    # "573001234567@s.whatsapp.net" → "573001234567"
    clean_number = remote_jid.split("@")[0]
    push_name: str = data.get("pushName", "") or ""

    logger.info(
        "Evolution message from {num} ({name}): {text}",
        num=clean_number,
        name=push_name or "?",
        text=text[:80],
    )

    return {
        "external_user_id": clean_number,
        "external_message_id": message_id,
        "content": text,
        "remote_jid": remote_jid,
        "instance_name": instance_name,
        "push_name": push_name,
    }


def extract_evolution_connection_update(
    event: EvolutionEvent,
) -> dict[str, str] | None:
    """Extract connection state change from a ``connection.update`` event.

    Evolution API sends this when the WhatsApp session state changes:
    QR scanned → state becomes "open", the instance is connected.
    Phone lost network → state becomes "close", instance disconnected.

    Payload::

        {
          "event": "connection.update",
          "instance": "my-instance",
          "data": {
            "state": "open"       # open | connecting | close
          }
        }

    Returns a dict with ``instance_name`` and ``connection_state``,
    or ``None`` if the event is not a connection update.
    """
    event_name = event.get("event", "")
    if event_name not in CONNECTION_EVENTS:
        return None

    instance_name: str = event.get("instance", "") or ""
    data = event.get("data") or {}
    state: str = data.get("state", "") or ""

    if not instance_name or not state:
        return None

    logger.info(
        "Evolution connection update | instance={inst} state={state}",
        inst=instance_name,
        state=state,
    )

    return {
        "instance_name": instance_name,
        "connection_state": state,
    }
