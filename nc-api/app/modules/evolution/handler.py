"""Evolution API message handler — end-to-end message processing pipeline.

Receives a raw Evolution API webhook event, extracts the text message,
resolves the tenant from the ``PlatformConnection``, saves the message,
generates an AI response via Groq, and sends it back through Evolution API.

This handler follows the exact same pattern as ``telegram/handler.py``
and reuses the same Groq pipeline and conversation logic.
"""

from __future__ import annotations

import typing as t
from datetime import UTC, datetime, timedelta

from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.rate_limiter import rate_limiter
from app.modules.conversations.models import Conversation, Message
from app.modules.agents.utils import format_business_config
from app.modules.integrations.llm.provider import CONTEXT_WINDOW_SIZE, groq_client
from app.modules.platform_connections.models import PlatformConnection
from app.modules.evolution.webhook import (
    extract_evolution_message,
    extract_evolution_connection_update,
)
from app.modules.evolution.adapter import EvolutionAdapter
from app.modules.evolution.anti_spam import _resolve_anti_spam_config, spam_detector

# ── Constants ────────────────────────────────────────────────────────────────

PAYMENT_KEYWORDS: list[str] = [
    "pago", "pagar", "qr", "daviplata", "bre-b",
]

# ── Helpers ──────────────────────────────────────────────────────────────────


def _has_payment_keyword(text: str) -> bool:
    """Check if *text* contains any payment-related keyword (case-insensitive)."""
    lower = text.lower().strip()
    return any(kw in lower for kw in PAYMENT_KEYWORDS)


# ── Types ───────────────────────────────────────────────────────────────────

EvolutionEventT = dict[str, t.Any]


async def handle_evolution_connection_update(
    event: EvolutionEventT,
    connection: PlatformConnection | None,
    session: AsyncSession,
) -> None:
    """Process a ``connection.update`` event from Evolution API.

    When the user scans the QR and WhatsApp connects, Evolution sends
    a ``connection.update`` with ``state: "open"``. We update the
    connection's ``extra_data.connection_status`` so the dashboard
    can reflect the new state without polling Evolution directly.
    """
    parsed = extract_evolution_connection_update(event)
    if parsed is None:
        return

    if connection is None:
        logger.warning("Connection update event but no connection found")
        return

    state = parsed["connection_state"]

    # Map Evolution state to our status vocabulary
    status_map = {
        "open": "connected",
        "connecting": "connecting",
        "close": "disconnected",
    }
    mapped = status_map.get(state, state)

    extra = dict(connection.extra_data or {})
    extra["connection_status"] = mapped
    connection.extra_data = extra

    # If connected, also set connection status to active
    if mapped == "connected":
        connection.status = "active"

    session.add(connection)
    logger.info(
        "Evolution connection {id} | state={state} → status={status}",
        id=connection.id,
        state=state,
        status=mapped,
    )


async def handle_evolution_incoming(
    event: EvolutionEventT,
    connection: PlatformConnection | None,
    session: AsyncSession,
) -> None:
    """Process a raw Evolution API webhook event.

    1. Detect event type — route ``connection.update`` to separate handler
    2. Extract the text message (ignore non-text / own messages)
    3. Resolve tenant from *connection*
    4. Find or create conversation
    5. Save inbound message
    6. Build system prompt from tenant config
    7. Generate response via LLM (Groq)
    8. Send via EvolutionAdapter (with composing + delay)
    9. Save outbound message
    """
    # ── 0. Route connection.update events ───────────────────────────────
    if event.get("event") == "connection.update":
        await handle_evolution_connection_update(event, connection, session)
        return

    # ── 1. Extract message ──────────────────────────────────────────────
    parsed = extract_evolution_message(event)
    if parsed is None:
        logger.info("No text message to process in Evolution event")
        return

    if connection is None:
        logger.warning(
            "No connection provided for Evolution event — skipping"
        )
        return

    # ── 2. Resolve tenant ───────────────────────────────────────────────
    tenant_id = connection.tenant_id

    logger.info(
        "Processing Evolution message | conn={conn} | from={user} | text={text}",
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

    # ── 1.5. Anti-spam check (auto-reply + flood) ───────────────────────
    spam_payload: dict | None = None
    conn_spam_config = (connection.extra_data or {}).get("anti_spam", {})

    spam_result = spam_detector.full_check(
        text=parsed["content"],
        user_id=parsed["external_user_id"],
        conn_id=str(connection.id),
        config=conn_spam_config,
    )

    if spam_result.is_spam and spam_result.action == "block":
        inbound_msg = Message(
            tenant_id=tenant_id,
            conversation_id=conversation.id,
            platform_connection_id=connection.id,
            direction="in",
            external_user_id=parsed["external_user_id"],
            external_message_id=parsed["external_message_id"],
            platform="evolution",
            message_type="text",
            content=parsed["content"],
            status="received",
            payload=spam_result.to_dict(),
        )
        session.add(inbound_msg)
        conversation.last_message_at = datetime.now(UTC)
        await session.commit()
        logger.info(
            "Spam blocked (auto_reply/flood) | reason={reason} | score={score}",
            reason=spam_result.spam_reason,
            score=spam_result.spam_score,
        )
        return

    if spam_result.is_spam:
        spam_payload = spam_result.to_dict()
        logger.info(
            "Spam logged (auto_reply/flood) | reason={reason} | score={score}",
            reason=spam_result.spam_reason,
            score=spam_result.spam_score,
        )

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

    # ── 4. Save inbound message ─────────────────────────────────────────
    inbound_msg = Message(
        tenant_id=tenant_id,
        conversation_id=conversation.id,
        platform_connection_id=connection.id,
        direction="in",
        external_user_id=parsed["external_user_id"],
        external_message_id=parsed["external_message_id"],
        platform="evolution",
        message_type="text",
        content=parsed["content"],
        status="received",
        payload=spam_payload,
    )
    session.add(inbound_msg)
    await session.flush()  # ensure inbound_msg.id is populated

    # ── 4b. Load conversation history ──────────────────────────────────
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

    # ── 4c. Repetitive check ───────────────────────────────────────────
    rep_result = spam_detector.check_repetitive(
        text=parsed["content"],
        history=[m.content or "" for m in past_messages],
    )
    if rep_result.is_spam:
        # Ensure payload dict exists
        if inbound_msg.payload is None:
            inbound_msg.payload = {}
        inbound_msg.payload.update(rep_result.to_dict())
        # Merge detection layers (deduplicate)
        all_layers = inbound_msg.payload.get("detection_layers", [])
        inbound_msg.payload["detection_layers"] = list(dict.fromkeys(all_layers))

        # Resolve mode for this connection
        rep_mode_config = _resolve_anti_spam_config(conn_spam_config)
        if rep_mode_config.get("mode") == "block" and rep_mode_config.get("enabled", True):
            conversation.last_message_at = datetime.now(UTC)
            await session.commit()
            logger.info(
                "Spam blocked (repetitive) | score={score}",
                score=rep_result.spam_score,
            )
            return

        logger.info(
            "Spam logged (repetitive) | score={score}",
            score=rep_result.spam_score,
        )

    # ── 4d. Payment keyword pre-processing ───────────────────────────────
    # If the user is asking about payment (pagos, QR, Nequi, etc.), reply
    # with account info immediately and skip the AI pipeline entirely.
    if _has_payment_keyword(parsed["content"]):
        payment_msg = (
            "¡Claro! Podés pagar tu plan por:\n"
            f"• Bre-B: {settings.payment_breb_number}\n"
            f"Titular: {settings.payment_account_holder}\n\n"
            "También podés ver los QR y gestionar tu pago desde el dashboard:\n"
            f"{settings.payment_dashboard_url}\n\n"
            "Envíame el comprobante por acá cuando hayas pagado y activo tu plan enseguida."
        )

        adapter = EvolutionAdapter()
        try:
            evo_response = await adapter.send_message(
                connection=connection,
                to=parsed["external_user_id"],
                text=payment_msg,
            )
            evo_msg_id = evo_response.get("key", {}).get("id") or evo_response.get("id")
            outbound_status = "sent"
        except Exception:
            evo_msg_id = None
            outbound_status = "failed"

        outbound_msg = Message(
            tenant_id=tenant_id,
            conversation_id=conversation.id,
            platform_connection_id=connection.id,
            direction="out",
            external_user_id=parsed["external_user_id"],
            external_message_id=evo_msg_id,
            platform="evolution",
            message_type="text",
            content=payment_msg,
            status=outbound_status,
        )
        session.add(outbound_msg)
        conversation.last_message_at = datetime.now(UTC)
        await session.commit()
        logger.info(
            "Payment info sent | conn={conn} | user={user} | matched_keyword={kw}",
            conn=connection.id,
            user=parsed["external_user_id"],
            kw=parsed["content"][:80],
        )
        return

    # ── 5. Load tenant ──────────────────────────────────────────────────
    from app.modules.tenants.models import Tenant

    tenant = await session.get(Tenant, tenant_id)
    if tenant is None:
        logger.warning(
            "Tenant {tid} not found for Evolution message", tid=tenant_id
        )
        await session.commit()
        return

    # ── 5a. Resolve agent (needed for both AI and programmed plans) ────
    from app.modules.agents.models import AiAgent

    agent = None
    if connection.agent_id:
        agent_result = await session.execute(
            select(AiAgent).where(
                AiAgent.id == connection.agent_id,
                AiAgent.tenant_id == tenant.id,
                AiAgent.enabled == True,
            )
        )
        agent = agent_result.scalar_one_or_none()

    if agent is None:
        agent_result = await session.execute(
            select(AiAgent).where(
                AiAgent.tenant_id == tenant.id,
                AiAgent.enabled == True,
            )
        )
        agent = agent_result.scalar_one_or_none()

    # ── 5b. Trial expiration check ──────────────────────────────────────
    TRIAL_DAYS = 7
    
    if tenant.plan == "trial":
        trial_end = tenant.created_at.replace(tzinfo=UTC) + timedelta(days=TRIAL_DAYS)
        if datetime.now(UTC) >= trial_end:
            if tenant.status != "inactive":
                tenant.status = "inactive"
                session.add(tenant)
            await session.commit()
            logger.info("Trial expired for tenant {tid}, message ignored", tid=tenant_id)
            return

    # ── 5c. Programmed responses for Basic/Trial plans ──────────────────────
    if tenant.plan in ("basic", "trial"):
        # Use agent's business_config FAQ + keywords for matching
        biz_config = agent.business_config if agent else {}
        faq = biz_config.get("faq") or []
        keywords_to_escalate = biz_config.get("keywords_to_escalate") or []
        user_text = parsed["content"].lower().strip()
        matched_answer = None

        # 1. Check FAQ: match user message against FAQ questions
        if faq:
            user_words = set(user_text.split())
            best_match = None
            best_score = 0
            
            for item in faq:
                q = (item.get("question") or item.get("q", "")).lower()
                a = item.get("answer") or item.get("a", "")
                if not q or not a:
                    continue
                q_words = set(q.split())
                # Score: how many question words appear in user message
                score = len(user_words & q_words)
                if score > best_score:
                    best_score = score
                    best_match = a
            
            if best_score >= 2 and best_match:
                matched_answer = best_match
        
        # 2. Check escalate keywords (human handoff)
        if not matched_answer and keywords_to_escalate:
            if any(kw.lower() in user_text for kw in keywords_to_escalate):
                matched_answer = (
                    "Un asesor nuestro revisará tu mensaje y te contactará "
                    "pronto. Mientras tanto, ¿hay algo más en lo que pueda ayudarte?"
                )

        # 3. Default response
        if not matched_answer:
            matched_answer = (
                "¡Hola! 👋 Soy el asistente automático de {name}. "
                "Estoy aquí para ayudarte con información sobre horarios, "
                "productos, precios y servicios. "
                "¿En qué puedo ayudarte hoy?"
            ).format(name=tenant.name)

        # Send and return
        adapter = EvolutionAdapter()
        try:
            evo_response = await adapter.send_message(
                connection=connection,
                to=parsed["external_user_id"],
                text=matched_answer,
            )
            evo_msg_id = evo_response.get("key", {}).get("id") or evo_response.get("id")
            outbound_status = "sent"
        except Exception:
            evo_msg_id = None
            outbound_status = "failed"

        outbound_msg = Message(
            tenant_id=tenant_id,
            conversation_id=conversation.id,
            platform_connection_id=connection.id,
            direction="out",
            external_user_id=parsed["external_user_id"],
            external_message_id=evo_msg_id,
            platform="evolution",
            message_type="text",
            content=matched_answer,
            status=outbound_status,
        )
        session.add(outbound_msg)
        conversation.last_message_at = datetime.now(UTC)
        await session.commit()
        logger.info(
            "Programmed response sent | tenant={t} | plan={p}",
            t=tenant_id, p=tenant.plan,
        )
        return

    # ── 6. Build system prompt from tenant config ──────────────────────
    from app.modules.agents.models import Prompt

    # agent already resolved in step 5a — reused here

    prompts_result = await session.execute(
        select(Prompt).where(
            Prompt.tenant_id == tenant.id,
            Prompt.active == True,
        )
    )
    prompts = list(prompts_result.scalars().all())

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

    # ── 7. Send via EvolutionAdapter (composing + delay + text) ─────────
    adapter = EvolutionAdapter()
    try:
        evo_response = await adapter.send_message(
            connection=connection,
            to=parsed["external_user_id"],
            text=response,
        )
        # Evolution API returns the message key in the response
        evo_msg_id = (
            evo_response.get("key", {}).get("id", None)
        )
        if evo_msg_id is None:
            evo_msg_id = evo_response.get("id", None)
        outbound_status = "sent"
    except Exception:
        evo_msg_id = None
        outbound_status = "failed"

    # ── 8. Save outbound message ────────────────────────────────────────
    outbound_msg = Message(
        tenant_id=tenant_id,
        conversation_id=conversation.id,
        platform_connection_id=connection.id,
        direction="out",
        external_user_id=parsed["external_user_id"],
        external_message_id=evo_msg_id,
        platform="evolution",
        message_type="text",
        content=response,
        status=outbound_status,
    )
    session.add(outbound_msg)

    # ── Update conversation ─────────────────────────────────────────────
    conversation.last_message_at = datetime.now(UTC)
    conversation.status = "open"

    await session.commit()
