"""Message.origin tagging — foundation tests (plan-differentiation, Slice 1).

Slice 1 covers the MODEL + MIGRATION foundation only:
- ``Message.origin`` column exists, ``String(20)``, nullable, NO server default.
- Values are the outbound-response tags ``ai`` / ``programmed`` / ``escalation``.
- Inbound / historical / admin messages keep ``origin = NULL`` (no backfill).

The three outbound HANDLER paths that SET the value land in Phase 2
(``test_message_origin.py`` grows with handler-level scenarios there).
"""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy import String, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.conversations.models import Conversation, Message
from app.modules.evolution.handler import handle_evolution_incoming
from app.modules.plans.capabilities import get_plan_limits
from app.modules.tenants.models import Tenant

ORIGIN_TAGS = ("ai", "programmed", "escalation")


class TestOriginColumnDefinition:
    """Model metadata contract for the nullable origin column (design D2)."""

    def test_origin_column_exists_on_messages_table(self) -> None:
        col = Message.__table__.columns["origin"]
        assert col is not None

    def test_origin_is_string_20_following_direction_pattern(self) -> None:
        col = Message.__table__.columns["origin"]
        assert isinstance(col.type, String)
        assert col.type.length == 20  # same pattern as ``direction`` (String(10))

    def test_origin_is_nullable(self) -> None:
        """NULLABLE, no backfill — historical rows keep NULL (design D2)."""
        col = Message.__table__.columns["origin"]
        assert col.nullable is True

    def test_origin_has_no_server_default(self) -> None:
        """No server_default: the column stays NULL unless the handler tags it."""
        col = Message.__table__.columns["origin"]
        assert col.server_default is None
        assert col.default is None


class TestOriginModelDefaults:
    """In-memory defaults — inbound/historical messages keep origin NULL."""

    def test_origin_defaults_to_none(self) -> None:
        msg = Message(
            tenant_id=uuid.uuid4(),
            conversation_id=uuid.uuid4(),
            direction="in",
            content="Inbound without origin",
        )
        assert msg.origin is None

    def test_accepts_each_origin_tag(self) -> None:
        for tag in ORIGIN_TAGS:
            msg = Message(
                tenant_id=uuid.uuid4(),
                conversation_id=uuid.uuid4(),
                direction="out",
                origin=tag,
                content="tagged",
            )
            assert msg.origin == tag


class TestOriginPersistence:
    """DB round-trip — origin survives persist/reload; NULL stays NULL."""

    async def _seed_conversation(self, db_session) -> Conversation:
        tenant = Tenant(
            id=uuid.uuid4(), name="Origin Co", slug="origin-co", status="active",
            plan="professional", timezone="UTC", locale="es",
        )
        db_session.add(tenant)
        await db_session.flush()
        conv = Conversation(
            tenant_id=tenant.id, external_user_id="573001234567", status="open",
        )
        db_session.add(conv)
        await db_session.flush()
        return conv

    @pytest.mark.asyncio
    async def test_origin_ai_roundtrips(self, db_session) -> None:
        conv = await self._seed_conversation(db_session)
        db_session.add(
            Message(
                tenant_id=conv.tenant_id, conversation_id=conv.id,
                direction="out", origin="ai", content="LLM answer",
            )
        )
        await db_session.commit()

        rows = (await db_session.execute(
            select(Message).where(Message.conversation_id == conv.id)
        )).scalars().all()
        assert len(rows) == 1
        assert rows[0].origin == "ai"

    @pytest.mark.asyncio
    async def test_untagged_message_persists_null(self, db_session) -> None:
        """HistoricalMessagesNull: rows written without origin stay NULL."""
        conv = await self._seed_conversation(db_session)
        db_session.add(
            Message(
                tenant_id=conv.tenant_id, conversation_id=conv.id,
                direction="in", content="pre-migration message",
            )
        )
        await db_session.commit()

        rows = (await db_session.execute(
            select(Message).where(Message.conversation_id == conv.id)
        )).scalars().all()
        assert len(rows) == 1
        assert rows[0].origin is None


# ── Phase 2: handler-level origin tagging ─────────────────────────────────────
# The three tenant outbound paths of handle_evolution_incoming persist the tag:
# programmed (FAQ/keywords), escalation (fallback), ai (LLM). Inbound and
# admin from_me messages stay NULL (they are NOT tenant AI usage).


async def _seed_origin_tenant_agent_connection(
    db_session: AsyncSession, *, plan: str, business_config: dict | None = None,
    reach_ai_cap: bool = False,
) -> tuple[Tenant, object]:
    """Tenant + enabled agent (business_config) + linked Evolution connection.

    ``reach_ai_cap=True`` seeds outbound ``origin='ai'`` messages up to the
    plan's monthly cap so the soft-cap fallback (programmed path) is exercised.
    """
    from app.modules.agents.models import AiAgent
    from app.modules.platform_connections.models import PlatformConnection

    tenant = Tenant(
        id=uuid.uuid4(),
        name="Origin Co",
        slug=f"origin-{uuid.uuid4().hex[:6]}",
        status="active",
        plan=plan,
        timezone="UTC",
        locale="es",
    )
    db_session.add(tenant)
    await db_session.flush()

    agent = AiAgent(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        name="Origin Agent",
        model="llama3-70b",
        enabled=True,
        business_config=business_config or {},
    )
    db_session.add(agent)
    await db_session.flush()

    connection = PlatformConnection(
        tenant_id=tenant.id,
        agent_id=agent.id,
        platform_type="evolution",
        display_name="Origin Evo",
        credentials="{}",
        status="active",
        is_primary=True,
    )
    db_session.add(connection)

    if reach_ai_cap:
        cap = get_plan_limits(plan)["max_conversations_per_month"]
        cap_conv = Conversation(
            tenant_id=tenant.id, external_user_id="cap-seed", status="open",
        )
        db_session.add(cap_conv)
        await db_session.flush()
        db_session.add_all(
            Message(
                tenant_id=tenant.id, conversation_id=cap_conv.id,
                direction="out", origin="ai", content=f"ai-{i}", status="sent",
            )
            for i in range(cap)
        )
    await db_session.commit()
    return tenant, connection


def _make_origin_event(text: str, *, from_me: bool = False) -> dict:
    """Realistic Evolution API webhook event (messages.upsert)."""
    return {
        "event": "messages.upsert",
        "instance": "test-instance",
        "data": {
            "key": {
                "remoteJid": "573001234567@s.whatsapp.net",
                "fromMe": from_me,
                "id": f"test-msg-{uuid.uuid4().hex[:8]}",
            },
            "pushName": "Test User",
            "message": {"conversation": text},
            "messageType": "conversation",
        },
    }


class TestOriginHandlerPaths:
    """Design D2 — FAQ→programmed, escalación→escalation, LLM→ai; NULL elsewhere."""

    async def _outbound_rows(self, db_session: AsyncSession) -> list[Message]:
        rows = (await db_session.execute(
            select(Message).where(
                Message.direction == "out",
                # Exclude the seeded AI-cap consumption messages (their
                # conversation uses the "cap-seed" external user id).
                Message.external_user_id != "cap-seed",
            )
        )).scalars().all()
        return list(rows)

    @pytest.mark.asyncio
    async def test_faq_programmed_outbound_tagged_inbound_null(
        self, db_session: AsyncSession,
    ) -> None:
        """ProgrammedOriginTagged: at-cap basic tenant FAQ answer → origin='programmed'.

        Also locks the inbound counterpart: the SAME pipeline persists the
        customer message with origin=NULL (never counted as AI).
        """
        tenant, connection = await _seed_origin_tenant_agent_connection(
            db_session,
            plan="basic",
            reach_ai_cap=True,
            business_config={
                "faq": [
                    {
                        "question": "¿Cuál es el horario de atención?",
                        "answer": "Atendemos de 9 a 6.",
                    }
                ]
            },
        )
        with patch(
            "app.modules.evolution.handler.EvolutionAdapter.send_message",
            new_callable=AsyncMock,
        ) as mock_send, patch(
            "app.modules.evolution.handler.llm_client.generate",
            new_callable=AsyncMock,
        ) as mock_groq:
            mock_send.return_value = {"key": {"id": "mock-evo-id"}}
            await handle_evolution_incoming(
                event=_make_origin_event("atencion"),
                connection=connection,
                session=db_session,
            )

        mock_groq.assert_not_awaited()
        outbound = await self._outbound_rows(db_session)
        assert len(outbound) == 1
        assert outbound[0].origin == "programmed"

        inbound = (await db_session.execute(
            select(Message).where(Message.direction == "in")
        )).scalars().all()
        assert len(inbound) == 1
        assert inbound[0].origin is None

    @pytest.mark.asyncio
    async def test_escalation_outbound_tagged(self, db_session: AsyncSession) -> None:
        """EscalationOriginTagged: professional fallback → origin='escalation'."""
        tenant, connection = await _seed_origin_tenant_agent_connection(
            db_session,
            plan="professional",
            business_config={
                "keywords_to_escalate": ["hablar con asesor"],
                "fallback_message": "Un asesor te contactará en breve.",
            },
        )
        with patch(
            "app.modules.evolution.handler.EvolutionAdapter.send_message",
            new_callable=AsyncMock,
        ) as mock_send, patch(
            "app.modules.evolution.handler.llm_client.generate",
            new_callable=AsyncMock,
        ) as mock_groq:
            mock_send.return_value = {"key": {"id": "mock-evo-id"}}
            await handle_evolution_incoming(
                event=_make_origin_event("quiero hablar un asesor"),
                connection=connection,
                session=db_session,
            )

        # Escalation short-circuits the AI — only the fallback is persisted.
        mock_groq.assert_not_awaited()
        outbound = await self._outbound_rows(db_session)
        assert len(outbound) == 1
        assert outbound[0].origin == "escalation"
        assert outbound[0].content == "Un asesor te contactará en breve."

    @pytest.mark.asyncio
    async def test_llm_outbound_tagged(self, db_session: AsyncSession) -> None:
        """AiOriginTagged: professional tenant answered via LLM → origin='ai'."""
        tenant, connection = await _seed_origin_tenant_agent_connection(
            db_session,
            plan="professional",
            business_config={},
        )
        with patch(
            "app.modules.evolution.handler.EvolutionAdapter.send_message",
            new_callable=AsyncMock,
        ) as mock_send, patch(
            "app.modules.evolution.handler.llm_client.generate",
            new_callable=AsyncMock,
        ) as mock_groq:
            mock_send.return_value = {"key": {"id": "mock-evo-id"}}
            mock_groq.return_value = "Respuesta generada por IA"
            await handle_evolution_incoming(
                event=_make_origin_event("¿cuánto cuesta?"),
                connection=connection,
                session=db_session,
            )

        mock_groq.assert_awaited_once()
        outbound = await self._outbound_rows(db_session)
        assert len(outbound) == 1
        assert outbound[0].origin == "ai"
        assert outbound[0].content == "Respuesta generada por IA"

    @pytest.mark.asyncio
    async def test_enterprise_at_cap_degrades_to_programmed(
        self, db_session: AsyncSession,
    ) -> None:
        """AtCapDegradesToProgrammed: enterprise at 100.000 AI responses →
        programmed FAQ path, origin='programmed', no LLM call.

        Patches the monthly counter instead of seeding 100K rows (absurdly
        slow — design: at-cap handler test strategy). The soft gate reads
        ``tenant.plan`` only, so the same degrade applies to superadmin users
        (NoSuperadminBypass holds by construction).
        """
        tenant, connection = await _seed_origin_tenant_agent_connection(
            db_session, plan="enterprise", business_config={},
        )
        with patch(
            "app.modules.evolution.handler._count_ai_responses_this_month",
            new_callable=AsyncMock,
            return_value=100000,
        ) as mock_count, patch(
            "app.modules.evolution.handler.EvolutionAdapter.send_message",
            new_callable=AsyncMock,
        ) as mock_send, patch(
            "app.modules.evolution.handler.llm_client.generate",
            new_callable=AsyncMock,
        ) as mock_groq:
            mock_send.return_value = {"key": {"id": "mock-evo-id"}}
            await handle_evolution_incoming(
                event=_make_origin_event("hola"),
                connection=connection,
                session=db_session,
            )

        mock_count.assert_awaited_once()
        mock_groq.assert_not_awaited()
        outbound = await self._outbound_rows(db_session)
        assert len(outbound) == 1
        assert outbound[0].origin == "programmed"

    @pytest.mark.asyncio
    async def test_enterprise_below_cap_ai_still_works(
        self, db_session: AsyncSession,
    ) -> None:
        """BelowCapAiStillWorks: enterprise at 99.999 AI responses → normal
        LLM flow, origin='ai' (counter patched below the 100.000 cap)."""
        tenant, connection = await _seed_origin_tenant_agent_connection(
            db_session, plan="enterprise", business_config={},
        )
        with patch(
            "app.modules.evolution.handler._count_ai_responses_this_month",
            new_callable=AsyncMock,
            return_value=99999,
        ) as mock_count, patch(
            "app.modules.evolution.handler.EvolutionAdapter.send_message",
            new_callable=AsyncMock,
        ) as mock_send, patch(
            "app.modules.evolution.handler.llm_client.generate",
            new_callable=AsyncMock,
        ) as mock_groq:
            mock_send.return_value = {"key": {"id": "mock-evo-id"}}
            mock_groq.return_value = "Respuesta generada por IA"
            await handle_evolution_incoming(
                event=_make_origin_event("¿cuánto cuesta?"),
                connection=connection,
                session=db_session,
            )

        mock_count.assert_awaited_once()
        mock_groq.assert_awaited_once()
        outbound = await self._outbound_rows(db_session)
        assert len(outbound) == 1
        assert outbound[0].origin == "ai"

    @pytest.mark.asyncio
    async def test_admin_from_me_outbound_origin_null(
        self, db_session: AsyncSession,
    ) -> None:
        """Admin outbound (from_me) stays NULL — it is NOT tenant AI usage."""
        tenant, connection = await _seed_origin_tenant_agent_connection(
            db_session, plan="professional",
        )
        await handle_evolution_incoming(
            event=_make_origin_event("hola, escribo desde el negocio", from_me=True),
            connection=connection,
            session=db_session,
        )

        outbound = await self._outbound_rows(db_session)
        assert len(outbound) == 1
        assert (outbound[0].payload or {}).get("source") == "admin"
        assert outbound[0].origin is None