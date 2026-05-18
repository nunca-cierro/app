"""Webhook payload handler — parses incoming messages and responds using DB.

Replaces the old ``bot/handler.py`` + ``bot/responder.py`` JSON-based flow.

Phase 2 refactoring:
- Accepts an optional ``resolver`` callable (default: ``resolve_by_phone_number_id``).
- Creates Conversation / Message records with new platform-agnostic fields
  when a ``PlatformConnection`` is returned by the resolver.
- Sends responses via ``WhatsAppAdapter`` when a ``PlatformConnection`` is
  available; falls back to ``send_text_message`` for legacy resolution.
"""

from __future__ import annotations

import typing as t
from datetime import UTC, datetime

from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.tenancy import resolve_by_phone_number_id
from app.modules.conversations.models import Conversation, Message
from app.modules.integrations.llm.provider import groq_client
from app.modules.integrations.meta.client import send_text_message
from app.modules.platforms.adapter import WhatsAppAdapter

# ── types ────────────────────────────────────────────────────────────────

WebhookPayload = dict[str, t.Any]
TenantResolutionT = t.Optional[t.Any]  # TenantResolution — avoid circular import


def extract_message(payload: WebhookPayload) -> list[dict[str, t.Any]] | None:
    """Extract text-message entries from a WhatsApp Cloud API webhook payload.

    Returns a list of parsed message dicts (``phone_number_id``, ``text``,
    ``phone``, ``msg_id``), or ``None`` if the payload does not contain a
    valid message.
    """
    entries = payload.get("entry", [])
    if not entries:
        return None

    messages: list[dict[str, t.Any]] = []

    for entry in entries:
        changes = entry.get("changes", [])
        for change in changes:
            value = change.get("value", {})
            if value.get("messaging_product") != "whatsapp":
                continue

            phone_number_id: str = value.get("metadata", {}).get(
                "phone_number_id", ""
            )

            for msg in value.get("messages", []):
                if msg.get("type") != "text":
                    continue

                messages.append({
                    "phone_number_id": phone_number_id,
                    "text": msg["text"]["body"],
                    "phone": msg["from"],
                    "msg_id": msg["id"],
                })

    return messages or None


async def handle_incoming(
    payload: WebhookPayload,
    session: AsyncSession,
    *,
    resolver: (
        t.Callable[..., t.Awaitable[TenantResolutionT]] | None
    ) = None,
    resolver_kwargs: dict[str, t.Any] | None = None,
) -> None:
    """Process all messages in a webhook payload using the database.

    1. Extract messages
    2. Resolve tenant — uses *resolver* if provided, otherwise defaults to
       ``resolve_by_phone_number_id`` (backward compat).
    3. Find / create conversation (new platform-agnostic fields when the
       resolver returns a ``PlatformConnection``).
    4. Save inbound message.
    5. Build system prompt from tenant config.
    6. Generate response via LLM.
    7. Send response via platform adapter (``WhatsAppAdapter``) or legacy
       ``send_text_message``.
    8. Save outbound message.
    """
    parsed = extract_message(payload)
    if not parsed:
        logger.info("No text messages to process")
        return

    for msg in parsed:
        # ── 2. Resolve tenant ────────────────────────────────────────────
        if resolver is not None:
            kwargs = dict(resolver_kwargs or {})
            resolution = await resolver(**kwargs)
        else:
            resolution = await resolve_by_phone_number_id(
                session, msg["phone_number_id"]
            )

        if resolution is None:
            logger.warning(
                "Unknown phone_number_id={pid} — skipping",
                pid=msg["phone_number_id"],
            )
            continue

        tenant = resolution.tenant

        logger.info(
            "Processing message | tenant={slug} | from={phone} | text={text}",
            slug=tenant.slug,
            phone=msg["phone"],
            text=msg["text"][:80],
        )

        # ── 3. Find or create conversation ───────────────────────────────
        #   *new path*  → platform_connection is present
        #   *old path*  → whatsapp_number is present (backward compat)
        # ─────────────────────────────────────────────────────────────────
        pc = resolution.platform_connection  # new path
        wn = resolution.whatsapp_number      # legacy path

        if pc is not None:
            conv_result = await session.execute(
                select(Conversation).where(
                    Conversation.tenant_id == tenant.id,
                    Conversation.platform_connection_id == pc.id,
                    Conversation.external_user_id == msg["phone"],
                    Conversation.status == "open",
                )
            )
            conversation = conv_result.scalar_one_or_none()
            if conversation is None:
                conversation = Conversation(
                    tenant_id=tenant.id,
                    platform_connection_id=pc.id,
                    external_user_id=msg["phone"],
                    status="open",
                )
                session.add(conversation)
                await session.flush()
        else:
            conv_result = await session.execute(
                select(Conversation).where(
                    Conversation.tenant_id == tenant.id,
                    Conversation.whatsapp_number_id == wn.id,
                    Conversation.wa_user_id == msg["phone"],
                    Conversation.status == "open",
                )
            )
            conversation = conv_result.scalar_one_or_none()
            if conversation is None:
                conversation = Conversation(
                    tenant_id=tenant.id,
                    whatsapp_number_id=wn.id,
                    wa_user_id=msg["phone"],
                    status="open",
                )
                session.add(conversation)
                await session.flush()

        # ── 4. Save inbound message ──────────────────────────────────────
        if pc is not None:
            inbound_msg = Message(
                tenant_id=tenant.id,
                conversation_id=conversation.id,
                platform_connection_id=pc.id,
                direction="in",
                external_user_id=msg["phone"],
                external_message_id=msg["msg_id"],
                platform="whatsapp",
                message_type="text",
                content=msg["text"],
                status="received",
            )
        else:
            inbound_msg = Message(
                tenant_id=tenant.id,
                conversation_id=conversation.id,
                whatsapp_number_id=wn.id,
                direction="in",
                wa_message_id=msg["msg_id"],
                wa_user_id=msg["phone"],
                message_type="text",
                content=msg["text"],
                status="received",
            )
        session.add(inbound_msg)

        # ── 5. Build system prompt from tenant config ────────────────────
        system_prompt = (
            f"Eres un asistente de atención al cliente para {tenant.name}. "
            "Responde de forma amable, clara y concisa."
        )
        if resolution.prompts:
            active_prompt = resolution.prompts[0]
            system_prompt = active_prompt.content

        model = None
        temperature = None
        max_tokens = None
        if resolution.agent:
            model = resolution.agent.model
            temperature = resolution.agent.temperature
            max_tokens = resolution.agent.max_tokens

        # ── 6. Generate response via LLM ─────────────────────────────────
        try:
            response = await groq_client.generate(
                system_prompt=system_prompt,
                user_message=msg["text"],
                model=model,
                max_tokens=max_tokens,
                temperature=temperature,
            )
        except RuntimeError:
            response = (
                "En este momento tengo problemas técnicos. "
                "Por favor intenta de nuevo en unos minutos. ¡Gracias!"
            )

        # ── 7. Send via platform API ─────────────────────────────────────
        if pc is not None:
            adapter = WhatsAppAdapter()
            try:
                wa_response = await adapter.send_message(
                    connection=pc,
                    to=msg["phone"],
                    text=response,
                )
                wa_msg_id = (
                    wa_response.get("messages", [{}])[0].get("id", None)
                )
                outbound_status = "sent"
            except Exception:
                wa_msg_id = None
                outbound_status = "failed"
        else:
            try:
                wa_response = await send_text_message(
                    to=msg["phone"],
                    text=response,
                    phone_number_id=wn.phone_number_id,
                )
                wa_msg_id = (
                    wa_response.get("messages", [{}])[0].get("id", None)
                )
                outbound_status = "sent"
            except Exception:
                wa_msg_id = None
                outbound_status = "failed"

        # ── 8. Save outbound message ─────────────────────────────────────
        if pc is not None:
            outbound_msg = Message(
                tenant_id=tenant.id,
                conversation_id=conversation.id,
                platform_connection_id=pc.id,
                direction="out",
                external_user_id=msg["phone"],
                external_message_id=wa_msg_id,
                platform="whatsapp",
                message_type="text",
                content=response,
                status=outbound_status,
            )
        else:
            outbound_msg = Message(
                tenant_id=tenant.id,
                conversation_id=conversation.id,
                whatsapp_number_id=wn.id,
                direction="out",
                wa_message_id=wa_msg_id,
                wa_user_id=msg["phone"],
                message_type="text",
                content=response,
                status=outbound_status,
            )
        session.add(outbound_msg)

        # ── Update conversation ──────────────────────────────────────────
        conversation.last_message_at = datetime.now(UTC)
        conversation.status = "open"

        await session.commit()
