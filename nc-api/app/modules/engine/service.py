"""Central agnostic conversation orchestrator for all messaging platforms.

Handles the end-to-end incoming message pipeline:
1. PostgreSQL advisory lock serialization per chat (pg_advisory_xact_lock).
2. Admin message detection (from_me) & 72h cooldown marking.
3. 72h admin cooldown evaluation (connection-level & conversation-level).
4. Atomic conversation management & escalation silence gates.
5. Multi-layer anti-spam (auto-reply, distributed Redis flood, repetitive).
6. Distributed rate limiting via Redis ZSETs.
7. Write-time message deduplication (ON CONFLICT DO NOTHING) + early commit.
8. Soft AI cap enforcement with graceful degradation to programmed FAQ/keywords.
9. Human escalation handoff keywords.
10. System prompt assembly with business config & universal formatting.
11. LLM response generation and dispatch through channel-specific adapters.
"""

from __future__ import annotations

import re
import typing as t
import uuid as uuid_pkg
from datetime import UTC, datetime, timedelta

from loguru import logger
from sqlalchemy import func, select, text, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.rate_limiter import redis_rate_limiter
from app.modules.agent_graph import AgentState, run_agent_graph
from app.modules.agents.models import AiAgent, Prompt
from app.modules.agents.utils import (
    _ACCENT_FOLD,
    SPANISH_STOPWORDS,
    _WORD_RE,
    _faq_answer_for,
    _fold_accents,
    _significant_words,
    _matches_escalation_keyword,
    format_business_config,
    universal_format_block,
)
from app.modules.conversations.models import Conversation, Message
from app.modules.engine.schemas import ChannelAdapter, InboundMessage, OutboundMessage
from app.modules.evolution.anti_spam import _resolve_anti_spam_config, spam_detector
from app.modules.integrations.llm.provider import llm_client
from app.modules.plans.capabilities import TRIAL_DAYS, get_plan_limits
from app.modules.platform_connections.models import PlatformConnection
from app.modules.tenants.internal import is_internal_tenant
from app.modules.tenants.models import Tenant

# ── Constants ────────────────────────────────────────────────────────────────

ADMIN_COOLDOWN_HOURS: int = 48
ADMIN_CHAT_COOLDOWNS_KEY: str = "admin_chat_cooldowns"

PAYMENT_KEYWORDS: list[str] = [
    "pago", "pagar", "qr", "daviplata", "bre-b",
]


# ── Text & matching helpers ──────────────────────────────────────────────────


def _has_payment_keyword(text_content: str) -> bool:
    """Check if text contains any payment-related keyword (case-insensitive)."""
    lower = text_content.lower().strip()
    return any(kw in lower for kw in PAYMENT_KEYWORDS)


def _normalize_jid(jid: str) -> str:
    """Normalize a WhatsApp JID to a bare phone number for stable cross-device matching."""
    return jid.split("@")[0] if "@" in jid else jid


class EngineService:
    """Agnostic core orchestrator for conversation workflows."""

    async def _insert_message_dedup(
        self, session: AsyncSession, **values: t.Any
    ) -> uuid_pkg.UUID | None:
        """Atomic write-time dedup using PostgreSQL ON CONFLICT DO NOTHING."""
        stmt = (
            pg_insert(Message)
            .values(**values)
            .on_conflict_do_nothing(constraint="uq_messages_conn_external_msg")
            .returning(Message.id)
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def _count_ai_responses_this_month(
        self, session: AsyncSession, tenant_id: uuid_pkg.UUID
    ) -> int:
        """Count outbound AI messages for the tenant since UTC month start."""
        month_start = datetime.now(UTC).replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        )
        result = await session.execute(
            select(func.count())
            .select_from(Message)
            .where(
                Message.tenant_id == tenant_id,
                Message.origin == "ai",
                Message.direction == "out",
                Message.created_at >= month_start,
            )
        )
        return int(result.scalar_one() or 0)

    async def process_inbound(
        self,
        inbound: InboundMessage,
        connection: PlatformConnection,
        session: AsyncSession,
        adapter: ChannelAdapter,
        llm: t.Any | None = None,
        count_ai_responses_fn: t.Any | None = None,
    ) -> OutboundMessage | None:
        """Execute the full conversation pipeline for an inbound message."""
        tenant_id = connection.tenant_id

        # ── 1. Advisory lock — serialize concurrent webhooks per chat ─────────
        lock_key = f"{connection.id}:{inbound.external_user_id}"
        await session.execute(
            text("SELECT pg_advisory_xact_lock(hashtext(:key))"), {"key": lock_key}
        )

        logger.info(
            "Engine processing inbound | platform={p} | conn={conn} | from={user} | text={text}",
            p=inbound.platform,
            conn=connection.id,
            user=inbound.external_user_id,
            text=inbound.content[:80],
        )

        # ── 2. Admin message handler (from_me) ────────────────────────────────
        if inbound.from_me:
            conv_result = await session.execute(
                select(Conversation).where(
                    Conversation.tenant_id == tenant_id,
                    Conversation.platform_connection_id == connection.id,
                    Conversation.external_user_id == inbound.external_user_id,
                    Conversation.status.in_(["open", "escalated"]),
                )
            )
            conversation = conv_result.scalar_one_or_none()
            if conversation is None:
                conversation = Conversation(
                    tenant_id=tenant_id,
                    platform_connection_id=connection.id,
                    external_user_id=inbound.external_user_id,
                    status="open",
                )
                session.add(conversation)
                await session.flush()

            admin_msg_id = await self._insert_message_dedup(
                session,
                tenant_id=tenant_id,
                conversation_id=conversation.id,
                platform_connection_id=connection.id,
                direction="out",
                external_user_id=inbound.external_user_id,
                external_message_id=inbound.external_message_id,
                platform=inbound.platform,
                message_type="text",
                content=inbound.content,
                status="sent",
                payload={"source": "admin"},
            )
            if admin_msg_id is None:
                logger.debug(
                    "Skipping bot's own fromMe echo | id={mid}",
                    mid=inbound.external_message_id,
                )
                return None

            extra = dict(conversation.extra_data or {})
            extra["admin_last_active_at"] = datetime.now(UTC).isoformat()
            conversation.extra_data = extra

            chat_jid = _normalize_jid(inbound.remote_jid or inbound.external_user_id)
            if chat_jid:
                conn_extra = dict(connection.extra_data or {})
                cooldowns: dict = dict(conn_extra.get(ADMIN_CHAT_COOLDOWNS_KEY) or {})
                cooldowns[chat_jid] = datetime.now(UTC).isoformat()
                conn_extra[ADMIN_CHAT_COOLDOWNS_KEY] = cooldowns
                connection.extra_data = conn_extra

            conversation.last_message_at = datetime.now(UTC)
            await session.commit()
            logger.info(
                "Admin message saved — 72h cooldown activated | conv={cid} | chat_jid={jid}",
                cid=conversation.id,
                jid=chat_jid,
            )
            return None

        # ── 3. Admin cooldown check (BEFORE conversation creation) ────────────
        chat_jid = _normalize_jid(inbound.external_user_id)
        conn_extra = dict(connection.extra_data or {})
        conn_cooldowns: dict = dict(conn_extra.get(ADMIN_CHAT_COOLDOWNS_KEY) or {})
        conn_admin_ts = conn_cooldowns.get(chat_jid)
        if conn_admin_ts:
            try:
                admin_time = datetime.fromisoformat(conn_admin_ts)
                elapsed = datetime.now(UTC) - admin_time
                if elapsed < timedelta(hours=ADMIN_COOLDOWN_HOURS):
                    conv_result = await session.execute(
                        select(Conversation).where(
                            Conversation.tenant_id == tenant_id,
                            Conversation.platform_connection_id == connection.id,
                            Conversation.external_user_id == inbound.external_user_id,
                            Conversation.status.in_(["open", "escalated"]),
                        )
                    )
                    conversation = conv_result.scalar_one_or_none()
                    if conversation is None:
                        conversation = Conversation(
                            tenant_id=tenant_id,
                            platform_connection_id=connection.id,
                            external_user_id=inbound.external_user_id,
                            status="open",
                        )
                        session.add(conversation)
                        await session.flush()

                    remaining_h = int(
                        (timedelta(hours=ADMIN_COOLDOWN_HOURS) - elapsed).total_seconds() / 3600
                    )
                    silent_id = await self._insert_message_dedup(
                        session,
                        tenant_id=tenant_id,
                        conversation_id=conversation.id,
                        platform_connection_id=connection.id,
                        direction="in",
                        external_user_id=inbound.external_user_id,
                        external_message_id=inbound.external_message_id,
                        platform=inbound.platform,
                        message_type="text",
                        content=inbound.content,
                        status="received",
                    )
                    if silent_id is None:
                        return None
                    conversation.last_message_at = datetime.now(UTC)
                    await session.commit()
                    logger.info(
                        "Admin cooldown (conn-level) — silent save ({h}h remaining) | conv={cid}",
                        h=remaining_h,
                        cid=conversation.id,
                    )
                    return None
            except (ValueError, TypeError):
                pass

        conv_result = await session.execute(
            select(Conversation).where(
                Conversation.tenant_id == tenant_id,
                Conversation.platform_connection_id == connection.id,
                Conversation.external_user_id == inbound.external_user_id,
                Conversation.status.in_(["open", "escalated"]),
            )
        )
        conversation = conv_result.scalar_one_or_none()

        if conversation is not None:
            conv_extra = conversation.extra_data or {}
            admin_last_active = conv_extra.get("admin_last_active_at")
            if admin_last_active:
                try:
                    admin_time = datetime.fromisoformat(admin_last_active)
                    elapsed = datetime.now(UTC) - admin_time
                    if elapsed < timedelta(hours=ADMIN_COOLDOWN_HOURS):
                        remaining_h = int(
                            (timedelta(hours=ADMIN_COOLDOWN_HOURS) - elapsed).total_seconds() / 3600
                        )
                        silent_id = await self._insert_message_dedup(
                            session,
                            tenant_id=tenant_id,
                            conversation_id=conversation.id,
                            platform_connection_id=connection.id,
                            direction="in",
                            external_user_id=inbound.external_user_id,
                            external_message_id=inbound.external_message_id,
                            platform=inbound.platform,
                            message_type="text",
                            content=inbound.content,
                            status="received",
                        )
                        if silent_id is None:
                            return None
                        conversation.last_message_at = datetime.now(UTC)
                        await session.commit()
                        logger.info(
                            "Admin cooldown (conv-level) — silent save ({h}h remaining) | conv={cid}",
                            h=remaining_h,
                            cid=conversation.id,
                        )
                        return None
                except (ValueError, TypeError):
                    pass

        # ── 4. Find or create conversation ────────────────────────────────────
        if conversation is None:
            conversation = Conversation(
                tenant_id=tenant_id,
                platform_connection_id=connection.id,
                external_user_id=inbound.external_user_id,
                status="open",
            )
            session.add(conversation)
            await session.flush()

        # ── 5. Escalation silence gate ────────────────────────────────────────
        if conversation.status == "escalated":
            extra = conversation.extra_data or {}
            if extra.get("escalation_responded"):
                silent_id = await self._insert_message_dedup(
                    session,
                    tenant_id=tenant_id,
                    conversation_id=conversation.id,
                    platform_connection_id=connection.id,
                    direction="in",
                    external_user_id=inbound.external_user_id,
                    external_message_id=inbound.external_message_id,
                    platform=inbound.platform,
                    message_type="text",
                    content=inbound.content,
                    status="received",
                )
                if silent_id is None:
                    return None
                conversation.last_message_at = datetime.now(UTC)
                await session.commit()
                logger.info(
                    "Escalated conversation — silent save | conv={cid}",
                    cid=conversation.id,
                )
                return None

        # ── 6. Anti-spam check (auto-reply + flood) ───────────────────────────
        spam_payload: dict | None = None
        conn_spam_config = (connection.extra_data or {}).get("anti_spam", {})

        spam_result = await spam_detector.full_check_async(
            text=inbound.content,
            user_id=inbound.external_user_id,
            conn_id=str(connection.id),
            config=conn_spam_config,
        )

        if spam_result.is_spam and spam_result.action == "block":
            blocked_id = await self._insert_message_dedup(
                session,
                tenant_id=tenant_id,
                conversation_id=conversation.id,
                platform_connection_id=connection.id,
                direction="in",
                external_user_id=inbound.external_user_id,
                external_message_id=inbound.external_message_id,
                platform=inbound.platform,
                message_type="text",
                content=inbound.content,
                status="received",
                payload=spam_result.to_dict(),
            )
            if blocked_id is None:
                return None
            conversation.last_message_at = datetime.now(UTC)
            await session.commit()
            logger.info(
                "Spam blocked | reason={reason} | score={score}",
                reason=spam_result.spam_reason,
                score=spam_result.spam_score,
            )
            return None

        if spam_result.is_spam:
            spam_payload = spam_result.to_dict()

        # ── 7. Rate limiting check (distributed Redis ZSET) ───────────────────
        rl_key = f"{inbound.external_user_id}:{connection.id}"
        if not await redis_rate_limiter.is_allowed(rl_key):
            logger.warning(
                "Rate limit exceeded | user={user} | conn={conn}",
                user=inbound.external_user_id,
                conn=connection.id,
            )
            await session.commit()
            return None

        # ── 8. Save inbound message (atomic write-time dedup) ─────────────────
        inbound_msg_id = await self._insert_message_dedup(
            session,
            tenant_id=tenant_id,
            conversation_id=conversation.id,
            platform_connection_id=connection.id,
            direction="in",
            external_user_id=inbound.external_user_id,
            external_message_id=inbound.external_message_id,
            platform=inbound.platform,
            message_type="text",
            content=inbound.content,
            status="received",
            payload=spam_payload,
        )
        if inbound_msg_id is None:
            logger.info(
                "Replay — message already processed | id={mid}",
                mid=inbound.external_message_id,
            )
            return None

        # ── 8a. Commit EARLY — release advisory lock before external I/O ──────
        await session.commit()

        # ── 9. Load conversation history ──────────────────────────────────────
        history_result = await session.execute(
            select(Message)
            .where(
                Message.conversation_id == conversation.id,
                Message.id != inbound_msg_id,
            )
            .order_by(Message.created_at.desc())
            .limit(30)
        )
        past_messages = list(reversed(history_result.scalars().all()))
        conversation_history = [
            {
                "role": "user" if m.direction == "in" else "assistant",
                "content": m.content or "",
            }
            for m in past_messages
            if not (m.direction == "out" and (m.payload or {}).get("source") == "admin")
        ]
        is_first_message = len(past_messages) == 0

        # ── 9b. Repetitive spam check ─────────────────────────────────────────
        rep_result = spam_detector.check_repetitive(
            text=inbound.content,
            history=[m.content or "" for m in past_messages],
        )
        if rep_result.is_spam:
            merged_payload = dict(spam_payload) if spam_payload else {}
            merged_payload.update(rep_result.to_dict())
            all_layers = merged_payload.get("detection_layers", [])
            merged_payload["detection_layers"] = list(dict.fromkeys(all_layers))
            await session.execute(
                update(Message)
                .where(Message.id == inbound_msg_id)
                .values(payload=merged_payload)
            )
            rep_mode_config = _resolve_anti_spam_config(conn_spam_config)
            if rep_mode_config.get("mode") == "block" and rep_mode_config.get("enabled", True):
                conversation.last_message_at = datetime.now(UTC)
                await session.commit()
                logger.info(
                    "Spam blocked (repetitive) | score={score}",
                    score=rep_result.spam_score,
                )
                return None

        # ── 10. Load tenant & status guard ────────────────────────────────────
        tenant = await session.get(Tenant, tenant_id)
        if tenant is None:
            logger.warning("Tenant {tid} not found", tid=tenant_id)
            await session.commit()
            return None

        if tenant.status in ("inactive", "suspended"):
            logger.info(
                "Inbound ignored | tenant={tid} | status={status}",
                tid=tenant_id,
                status=tenant.status,
            )
            await session.commit()
            return None

        if tenant.plan == "trial":
            trial_end = tenant.created_at.replace(tzinfo=UTC) + timedelta(days=TRIAL_DAYS)
            if datetime.now(UTC) >= trial_end:
                if tenant.status != "inactive":
                    tenant.status = "inactive"
                    session.add(tenant)
                await session.commit()
                logger.info("Trial expired for tenant {tid}", tid=tenant_id)
                return None

        # ── 11. Payment keyword pre-processing (internal tenant only) ─────────
        send_target = inbound.remote_jid or inbound.external_user_id
        if is_internal_tenant(tenant.slug, settings.internal_tenant_slug) and _has_payment_keyword(
            inbound.content
        ):
            payment_msg = (
                "¡Claro! Puedes pagar tu plan por:\n"
                f"• Bre-B: {settings.payment_breb_number}\n"
                f"Titular: {settings.payment_account_holder}\n\n"
                "También puedes ver los QR y gestionar tu pago desde el dashboard:\n"
                f"{settings.payment_dashboard_url}\n\n"
                "Envíame el comprobante por aquí cuando hayas pagado y activo tu plan enseguida."
            )
            try:
                resp = await adapter.send_message(
                    connection=connection,
                    to=send_target,
                    text=payment_msg,
                )
                msg_id = resp.get("key", {}).get("id") or resp.get("id") or (
                    resp.get("result", {}).get("message_id") if isinstance(resp.get("result"), dict) else None
                )
                out_status = "sent"
            except Exception:
                msg_id = None
                out_status = "failed"

            outbound_msg = Message(
                tenant_id=tenant_id,
                conversation_id=conversation.id,
                platform_connection_id=connection.id,
                direction="out",
                external_user_id=inbound.external_user_id,
                external_message_id=str(msg_id) if msg_id is not None else None,
                platform=inbound.platform,
                message_type="text",
                content=payment_msg,
                status=out_status,
                origin="payment",
            )
            session.add(outbound_msg)
            if conversation.status == "escalated" and out_status == "sent":
                extra = dict(conversation.extra_data or {})
                extra["escalation_responded"] = True
                conversation.extra_data = extra

            conversation.last_message_at = datetime.now(UTC)
            await session.commit()
            return OutboundMessage(
                tenant_id=tenant_id,
                conversation_id=conversation.id,
                platform_connection_id=connection.id,
                platform=inbound.platform,
                external_user_id=inbound.external_user_id,
                content=payment_msg,
                origin="payment",
                status=out_status,
                external_message_id=str(msg_id) if msg_id is not None else None,
            )

        # ── 12. Resolve agent ─────────────────────────────────────────────────
        agent: AiAgent | None = None
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
                select(AiAgent)
                .where(
                    AiAgent.tenant_id == tenant.id,
                    AiAgent.enabled == True,
                )
                .order_by(AiAgent.created_at, AiAgent.id)
                .limit(2)
            )
            candidates = list(agent_result.scalars().all())
            agent = candidates[0] if candidates else None

        # ── 12b. Soft AI cap → programmed responses ───────────────────────────
        ai_cap = get_plan_limits(tenant.plan)["max_conversations_per_month"]
        ai_cap_reached = False
        if ai_cap is not None:
            count_fn = count_ai_responses_fn or self._count_ai_responses_this_month
            ai_usage = await count_fn(session, tenant_id)
            ai_cap_reached = ai_usage >= ai_cap

        if ai_cap_reached:
            biz_config = (agent.business_config or {}) if agent else {}
            faq = biz_config.get("faq") or []
            keywords_to_escalate = biz_config.get("keywords_to_escalate") or []
            matched_answer = None

            if faq:
                matched_answer = _faq_answer_for(inbound.content, faq)

            if not matched_answer and keywords_to_escalate:
                if any(_matches_escalation_keyword(inbound.content, kw) for kw in keywords_to_escalate):
                    conversation.status = "escalated"
                    matched_answer = (
                        "Un asesor nuestro revisará tu mensaje y te contactará "
                        "pronto. Mientras tanto, ¿hay algo más en lo que pueda ayudarte?"
                    )

            if not matched_answer:
                matched_answer = (
                    "Hola, soy el asistente de {name}. Un asesor de nuestro equipo te atenderá "
                    "en breve para responderte con todo el detalle. ¿Hay algún dato adicional de tu consulta que nos quieras compartir?"
                ).format(name=tenant.name)

            try:
                resp = await adapter.send_message(
                    connection=connection,
                    to=send_target,
                    text=matched_answer,
                )
                msg_id = resp.get("key", {}).get("id") or resp.get("id") or (
                    resp.get("result", {}).get("message_id") if isinstance(resp.get("result"), dict) else None
                )
                out_status = "sent"
            except Exception:
                msg_id = None
                out_status = "failed"

            outbound_msg = Message(
                tenant_id=tenant_id,
                conversation_id=conversation.id,
                platform_connection_id=connection.id,
                direction="out",
                external_user_id=inbound.external_user_id,
                external_message_id=str(msg_id) if msg_id is not None else None,
                platform=inbound.platform,
                message_type="text",
                content=matched_answer,
                status=out_status,
                origin="programmed",
            )
            session.add(outbound_msg)
            if conversation.status == "escalated" and out_status == "sent":
                extra = dict(conversation.extra_data or {})
                extra["escalation_responded"] = True
                conversation.extra_data = extra

            conversation.last_message_at = datetime.now(UTC)
            await session.commit()
            return OutboundMessage(
                tenant_id=tenant_id,
                conversation_id=conversation.id,
                platform_connection_id=connection.id,
                platform=inbound.platform,
                external_user_id=inbound.external_user_id,
                content=matched_answer,
                origin="programmed",
                status=out_status,
                external_message_id=str(msg_id) if msg_id is not None else None,
            )

        # ── 13. Build system prompt & Conversational LangGraph execution ──────
        system_prompt = ""
        if agent and agent.business_config:
            biz_text = format_business_config(agent.business_config)
            if biz_text:
                system_prompt = biz_text

        if not system_prompt:
            system_prompt = (
                f"Eres un asistente de atención al cliente para {tenant.name}. "
                "Responde con amabilidad y guía al cliente hacia la acción."
            )

        system_prompt += f"\n\n{universal_format_block()}"

        graph_state: AgentState = {
            "tenant_id": str(tenant_id),
            "conversation_id": str(conversation.id),
            "connection_id": str(connection.id),
            "external_user_id": inbound.external_user_id,
            "platform": inbound.platform,
            "user_query": inbound.content,
            "conversation_history": conversation_history,
            "tenant_name": tenant.name,
            "business_config": (agent.business_config if agent else {}) or {},
            "model": agent.model if agent else None,
            "provider": agent.provider if agent else None,
            "temperature": agent.temperature if agent else None,
            "max_tokens": agent.max_tokens if agent else None,
            "system_prompt_override": system_prompt,
        }

        active_llm = llm or llm_client
        graph_result = await run_agent_graph(
            graph_state,
            custom_llm=active_llm,
            thread_id=str(conversation.id),
        )

        response_text = graph_result.get("final_response") or "Disculpa, no pude procesar tu mensaje."
        is_escalation = graph_result.get("is_handoff_requested", False)
        origin_type = "escalation" if is_escalation else "ai"

        if is_escalation:
            conversation.status = "escalated"

        # ── 14. Send via Adapter & Save Outbound ──────────────────────────────
        try:
            resp = await adapter.send_message(
                connection=connection,
                to=send_target,
                text=response_text,
            )
            msg_id = resp.get("key", {}).get("id") or resp.get("id") or (
                resp.get("result", {}).get("message_id") if isinstance(resp.get("result"), dict) else None
            )
            out_status = "sent"
        except Exception:
            msg_id = None
            out_status = "failed"

        outbound_msg = Message(
            tenant_id=tenant_id,
            conversation_id=conversation.id,
            platform_connection_id=connection.id,
            direction="out",
            external_user_id=inbound.external_user_id,
            external_message_id=str(msg_id) if msg_id is not None else None,
            platform=inbound.platform,
            message_type="text",
            content=response_text,
            status=out_status,
            origin=origin_type,
        )
        session.add(outbound_msg)

        if conversation.status == "escalated" and out_status == "sent":
            extra = dict(conversation.extra_data or {})
            extra["escalation_responded"] = True
            conversation.extra_data = extra

        # ── 15. Checkpoint conversation state in Postgres ────────────────────
        extra = dict(conversation.extra_data or {})
        extra["last_agent_intent"] = graph_result.get("intent")
        extra["is_escalated"] = is_escalation
        conversation.extra_data = extra

        conversation.last_message_at = datetime.now(UTC)
        if conversation.status != "escalated":
            conversation.status = "open"

        await session.commit()
        return OutboundMessage(
            tenant_id=tenant_id,
            conversation_id=conversation.id,
            platform_connection_id=connection.id,
            platform=inbound.platform,
            external_user_id=inbound.external_user_id,
            content=response_text,
            origin=origin_type,
            status=out_status,
            external_message_id=str(msg_id) if msg_id is not None else None,
        )


engine_service = EngineService()


async def _insert_message_dedup(
    session: AsyncSession, **values: t.Any
) -> uuid_pkg.UUID | None:
    """Module-level wrapper for backward-compatibility with tests."""
    return await engine_service._insert_message_dedup(session, **values)


async def _count_ai_responses_this_month(
    session: AsyncSession, tenant_id: uuid_pkg.UUID
) -> int:
    """Module-level wrapper for backward-compatibility with tests."""
    return await engine_service._count_ai_responses_this_month(session, tenant_id)

