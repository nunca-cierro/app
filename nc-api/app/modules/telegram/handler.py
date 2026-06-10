"""Telegram message handler — end-to-end message processing pipeline.

Receives a raw Telegram Update, extracts the text message, resolves
the tenant from the ``PlatformConnection``, saves the message,
generates an AI response, and sends it back via ``TelegramAdapter``.
"""

from __future__ import annotations

import typing as t
from datetime import UTC, datetime

from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.rate_limiter import rate_limiter
from app.modules.conversations.models import Conversation, Message
from app.modules.agents.utils import format_business_config
from app.modules.integrations.llm.provider import CONTEXT_WINDOW_SIZE, groq_client
from app.modules.platform_connections.models import PlatformConnection
from app.modules.platform_connections.service import get_connection
from app.modules.telegram.webhook import extract_telegram_message
from app.modules.telegram.adapter import TelegramAdapter

# ── Types ───────────────────────────────────────────────────────────────────

TelegramUpdateT = dict[str, t.Any]


async def handle_telegram_incoming(
    update: TelegramUpdateT,
    connection: PlatformConnection | None,
    session: AsyncSession,
) -> None:
    """Process a raw Telegram update from the webhook.

    1. Extract the text message (ignore non-message updates)
    2. Resolve tenant from *connection*
    3. Find or create conversation
    4. Save inbound message
    5. Build system prompt from tenant config
    6. Generate response via LLM
    7. Send via TelegramAdapter
    8. Save outbound message
    """
    # ── 1. Extract message ──────────────────────────────────────────────
    parsed = extract_telegram_message(update)
    if parsed is None:
        logger.info("No text message to process in Telegram update")
        return

    if connection is None:
        logger.warning("No connection provided for Telegram update — skipping")
        return

    # ── Rate limiting check ─────────────────────────────────────────────
    rate_limiter.max_requests = settings.rate_limit_max_requests
    rate_limiter.window_seconds = settings.rate_limit_window_seconds

    rl_key = f"{parsed['external_user_id']}:{connection.id}"
    if not rate_limiter.is_allowed(rl_key):
        logger.warning(
            "Rate limit exceeded | user={user} | conn={conn}",
            user=parsed["external_user_id"],
            conn=connection.id,
        )
        await session.commit()
        return

    # ── 2. Resolve tenant ───────────────────────────────────────────────
    tenant_id = connection.tenant_id

    logger.info(
        "Processing Telegram message | conn={conn} | from={user} | text={text}",
        conn=connection.id,
        user=parsed["external_user_id"],
        text=parsed["content"][:80],
    )

    # ── 3. Find or create conversation ──────────────────────────────────
    conv_result = await session.execute(
        select(Conversation).where(
            Conversation.tenant_id == tenant_id,
            Conversation.platform_connection_id == connection.id,
            Conversation.external_user_id == parsed["external_user_id"],
            Conversation.status == "open",
        )
    )
    conversation = conv_result.scalar_one_or_none()
    if conversation is None:
        conversation = Conversation(
            tenant_id=tenant_id,
            platform_connection_id=connection.id,
            external_user_id=parsed["external_user_id"],
            status="open",
        )
        session.add(conversation)
        await session.flush()

    # ── 4. Save inbound message ─────────────────────────────────────────
    inbound_msg = Message(
        tenant_id=tenant_id,
        conversation_id=conversation.id,
        platform_connection_id=connection.id,
        direction="in",
        external_user_id=parsed["external_user_id"],
        external_message_id=parsed["external_message_id"],
        platform="telegram",
        message_type="text",
        content=parsed["content"],
        status="received",
    )
    session.add(inbound_msg)
    await session.flush()  # ensure inbound_msg.id is populated

    # ── 4b. Load conversation history ─────────────────────────────────
    history_result = await session.execute(
        select(Message)
        .where(
            Message.conversation_id == conversation.id,
            Message.id != inbound_msg.id,
        )
        .order_by(Message.created_at.desc())
        .limit(CONTEXT_WINDOW_SIZE)
    )
    past_messages = list(reversed(history_result.scalars().all()))
    conversation_history = [
        {
            "role": "user" if m.direction == "in" else "assistant",
            "content": m.content or "",
        }
        for m in past_messages
    ]

    # ── 5. Load tenant ──────────────────────────────────────────────────
    from app.modules.tenants.models import Tenant

    tenant = await session.get(Tenant, tenant_id)
    if tenant is None:
        logger.warning("Tenant {tid} not found for Telegram message", tid=tenant_id)
        await session.commit()
        return

    # ── 5a. Auto-reply check for Basic/Trial plans ────────────────────────
    from app.modules.auto_reply.models import AutoReply

    if tenant.plan in ("basic", "trial"):
        auto_replies_result = await session.execute(
            select(AutoReply).where(
                AutoReply.tenant_id == tenant.id,
                AutoReply.enabled == True,
            ).order_by(AutoReply.priority.desc())
        )
        auto_replies = list(auto_replies_result.scalars().all())

        if auto_replies:
            user_text = parsed["content"].lower().strip()
            matched_reply = None

            for reply in auto_replies:
                if reply.match_type == "exact":
                    if user_text == reply.response_text.lower().strip():
                        matched_reply = reply
                        break
                elif reply.match_type == "all":
                    if all(kw.lower() in user_text for kw in reply.keywords):
                        matched_reply = reply
                        break
                else:
                    if any(kw.lower() in user_text for kw in reply.keywords):
                        matched_reply = reply
                        break

            if matched_reply:
                adapter = TelegramAdapter()
                try:
                    tg_response = await adapter.send_message(
                        connection=connection,
                        to=parsed["external_user_id"],
                        text=matched_reply.response_text,
                    )
                    tg_msg_id = tg_response.get("result", {}).get("message_id", None)
                    if tg_msg_id is not None:
                        tg_msg_id = str(tg_msg_id)
                    outbound_status = "sent"
                except Exception:
                    tg_msg_id = None
                    outbound_status = "failed"

                outbound_msg = Message(
                    tenant_id=tenant_id,
                    conversation_id=conversation.id,
                    platform_connection_id=connection.id,
                    direction="out",
                    external_user_id=parsed["external_user_id"],
                    external_message_id=tg_msg_id,
                    platform="telegram",
                    message_type="text",
                    content=matched_reply.response_text,
                    status=outbound_status,
                )
                session.add(outbound_msg)
                conversation.last_message_at = datetime.now(UTC)
                await session.commit()
                logger.info("Auto-reply sent | id={id}", id=matched_reply.id)
                return

    # ── 5b. Build system prompt from tenant config ──────────────────────
    from app.modules.agents.models import AiAgent, Prompt

    agent_result = await session.execute(
        select(AiAgent).where(
            AiAgent.tenant_id == tenant.id,
            AiAgent.enabled == True,
        )
    )
    agent = agent_result.scalar_one_or_none()

    prompts_result = await session.execute(
        select(Prompt).where(
            Prompt.tenant_id == tenant.id,
            Prompt.active == True,
        )
    )
    prompts = list(prompts_result.scalars().all())

    # ── 5. Build system prompt ───────────────────────────────────────────
    # Priority: business_config (instructions + data) > custom prompt > default
    system_prompt = (
        f"Eres un asistente de atención al cliente para {tenant.name}."
    )

    model = None
    temperature = None
    max_tokens = None
    if agent:
        model = agent.model
        temperature = agent.temperature
        max_tokens = agent.max_tokens

        biz_text = format_business_config(agent.business_config)
        if biz_text:
            system_prompt = f"{system_prompt}\n\n{biz_text}"
        elif prompts:
            # Backward compat: custom prompt when no business_config
            system_prompt = prompts[0].content

    # ── 6. Generate response via LLM ────────────────────────────────────
    try:
        response = await groq_client.generate(
            system_prompt=system_prompt,
            user_message=f"<user_query>\n{parsed['content']}\n</user_query>",
            conversation_history=conversation_history,
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
        )
    except RuntimeError:
        response = (
            "En este momento tengo problemas técnicos. "
            "Por favor intenta de nuevo en unos minutos. ¡Gracias!"
        )

    # ── 7. Send via TelegramAdapter ─────────────────────────────────────
    adapter = TelegramAdapter()
    try:
        tg_response = await adapter.send_message(
            connection=connection,
            to=parsed["external_user_id"],
            text=response,
        )
        tg_msg_id = (
            tg_response.get("result", {}).get("message_id", None)
        )
        if tg_msg_id is not None:
            tg_msg_id = str(tg_msg_id)
        outbound_status = "sent"
    except Exception:
        tg_msg_id = None
        outbound_status = "failed"

    # ── 8. Save outbound message ────────────────────────────────────────
    outbound_msg = Message(
        tenant_id=tenant_id,
        conversation_id=conversation.id,
        platform_connection_id=connection.id,
        direction="out",
        external_user_id=parsed["external_user_id"],
        external_message_id=tg_msg_id,
        platform="telegram",
        message_type="text",
        content=response,
        status=outbound_status,
    )
    session.add(outbound_msg)

    # ── Update conversation ─────────────────────────────────────────────
    conversation.last_message_at = datetime.now(UTC)
    conversation.status = "open"

    await session.commit()
