"""Tests for WhatsApp payment keyword detection and post-activation confirmation."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.modules.evolution.handler import _has_payment_keyword


# ── Unit: _has_payment_keyword ──────────────────────────────────────────────


class TestPaymentKeywordDetection:
    """Direct unit tests for the keyword helper function."""

    @pytest.mark.parametrize(
        ("text", "expected"),
        [
            ("quiero pagar mi plan", True),
            ("PAGO", True),
            ("pagar", True),
            ("bre-b", True),
            ("daviplata", True),
            ("bre-b", True),
            ("bre b", False),  # without hyphen doesn't match
            ("QR", True),
            ("qr", True),
            ("me interesa el horario", False),
            ("hola buen dia", False),
            ("", False),
            ("   ", False),
            ("pago daviplata", True),
            ("pagar con bre-b", True),
        ],
    )
    def test_has_payment_keyword(self, text: str, expected: bool) -> None:
        assert _has_payment_keyword(text) is expected

    @pytest.mark.parametrize(
        ("text", "expected"),
        [
            ("pago", True),
            ("pagando", False),  # "pago" not in "pagando"
            ("pagador", False),  # "pagar" not in "pagador"
            ("bre-btransfer", True),  # substring match
            ("pago$", True),  # special chars handled
        ],
    )
    def test_has_payment_keyword_substring(self, text: str, expected: bool) -> None:
        assert _has_payment_keyword(text) is expected


# ── Integration: handler with keywords ───────────────────────────────────────


class TestHandlerPaymentKeywords:
    """Integration tests for keyword pre-processing in the Evolution handler."""

    @pytest.mark.asyncio
    async def test_keyword_returns_payment_info(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """When a payment keyword is detected, payment info is returned and AI is NOT called."""
        tenant, connection = await _create_test_evolution_connection(db_session)

        # Mock the EvolutionAdapter.send_message to avoid real API calls
        with patch(
            "app.modules.evolution.handler.EvolutionAdapter.send_message",
            new_callable=AsyncMock,
        ) as mock_send:
            mock_send.return_value = {"key": {"id": "mock-evo-msg-id"}}

            # Also mock groq_client.generate to ensure it's NOT called
            with patch(
                "app.modules.evolution.handler.groq_client.generate",
                new_callable=AsyncMock,
            ) as mock_groq:
                # Simulate a webhook event with "pago" keyword
                from app.modules.evolution.handler import handle_evolution_incoming

                event = _make_evolution_event("quiero pagar mi plan ahora")
                await handle_evolution_incoming(
                    event=event,
                    connection=connection,
                    session=db_session,
                )

                # Verify the payment info was sent
                mock_send.assert_awaited_once()
                sent_text = mock_send.call_args[1]["text"]
                assert "Bre-B" in sent_text
                assert "Bre-B" in sent_text
                assert "dashboard" in sent_text.lower()

                # Verify Groq was NOT called (early return)
                mock_groq.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_non_keyword_passes_through(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """When no payment keyword is detected, the message flows to AI normally."""
        tenant, connection = await _create_test_evolution_connection(db_session)

        with patch(
            "app.modules.evolution.handler.EvolutionAdapter.send_message",
            new_callable=AsyncMock,
        ) as mock_send:
            mock_send.return_value = {"key": {"id": "mock-evo-msg-id"}}

            with patch(
                "app.modules.evolution.handler.groq_client.generate",
                new_callable=AsyncMock,
            ) as mock_groq:
                mock_groq.return_value = "Hola, soy un asistente."

                from app.modules.evolution.handler import handle_evolution_incoming

                event = _make_evolution_event("me gustaria saber el horario")
                await handle_evolution_incoming(
                    event=event,
                    connection=connection,
                    session=db_session,
                )

                # Verify Groq WAS called (no early return)
                mock_groq.assert_awaited_once()

                # Verify the AI response was sent back
                mock_send.assert_awaited_once()
                sent_text = mock_send.call_args[1]["text"]
                assert sent_text == "Hola, soy un asistente."

    @pytest.mark.asyncio
    async def test_keyword_saves_outbound_message(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """Payment keyword response saves the outbound message in the DB."""
        tenant, connection = await _create_test_evolution_connection(db_session)

        with patch(
            "app.modules.evolution.handler.EvolutionAdapter.send_message",
            new_callable=AsyncMock,
        ) as mock_send:
            mock_send.return_value = {"key": {"id": "mock-evo-msg-id"}}

            from app.modules.evolution.handler import handle_evolution_incoming

            event = _make_evolution_event("quiero pagar con bre-b")
            await handle_evolution_incoming(
                event=event,
                connection=connection,
                session=db_session,
            )

            # Verify the outbound message was saved
            from app.modules.conversations.models import Message
            from sqlalchemy import select as sa_select

            result = await db_session.execute(
                sa_select(Message).where(
                    Message.platform_connection_id == connection.id,
                    Message.direction == "out",
                )
            )
            msgs = result.scalars().all()
            assert len(msgs) == 1
            assert "Bre-B" in msgs[0].content

    @pytest.mark.asyncio
    async def test_keyword_breb_only(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """Just 'bre-b' as the message also triggers payment response."""
        tenant, connection = await _create_test_evolution_connection(db_session)

        with patch(
            "app.modules.evolution.handler.EvolutionAdapter.send_message",
            new_callable=AsyncMock,
        ) as mock_send:
            mock_send.return_value = {"key": {"id": "mock-evo-msg-id"}}

            with patch(
                "app.modules.evolution.handler.groq_client.generate",
                new_callable=AsyncMock,
            ) as mock_groq:
                from app.modules.evolution.handler import handle_evolution_incoming

                event = _make_evolution_message_event("bre-b")
                await handle_evolution_incoming(
                    event=event,
                    connection=connection,
                    session=db_session,
                )

                mock_send.assert_awaited_once()
                mock_groq.assert_not_awaited()


# ── Post-activation WhatsApp confirmation ────────────────────────────────────


class TestActivationWhatsAppConfirmation:
    """Tests for the fire-and-forget WhatsApp confirmation on plan activation."""

    @pytest.mark.asyncio
    async def test_activation_sends_whatsapp(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """Activating a plan sends a WhatsApp confirmation."""
        from app.modules.tenants.models import Tenant

        tenant = Tenant(
            id=uuid.uuid4(),
            name="Test Co",
            slug="wa-act-test",
            plan="trial",
            timezone="America/Bogota",
            locale="es-CO",
        )
        db_session.add(tenant)
        await db_session.commit()

        # Also create a WhatsAppNumber for this tenant
        from app.modules.whatsapp.models import WhatsAppNumber

        wa = WhatsAppNumber(
            tenant_id=tenant.id,
            phone_number_id="12345",
            waba_id="67890",
            display_phone_number="573001234567",
            verified_name="Test Co",
            is_primary=True,
        )
        db_session.add(wa)

        # Also create an Evolution PlatformConnection for sending
        from app.modules.platform_connections.models import PlatformConnection

        conn = PlatformConnection(
            tenant_id=tenant.id,
            platform_type="evolution",
            display_name="Test Evolution",
            credentials="{}",
            status="active",
            is_primary=True,
        )
        db_session.add(conn)
        await db_session.commit()

        with patch(
            "app.modules.evolution.adapter.EvolutionAdapter",
            autospec=True,
        ) as MockAdapter:
            mock_instance = MockAdapter.return_value
            mock_instance.send_message = AsyncMock(
                return_value={"key": {"id": "mock-id"}}
            )

            from app.modules.tenants.service import activate_tenant_plan

            result = await activate_tenant_plan(
                tenant_id=tenant.id,
                plan="professional",
                session=db_session,
            )

            assert result.plan == "professional"
            assert result.payment_status == "active"

            # Verify WhatsApp was called
            mock_instance.send_message.assert_awaited_once()
            call_kwargs = mock_instance.send_message.call_args[1]
            assert "Test Co" in call_kwargs["text"]
            assert "Profesional" in call_kwargs["text"]

    @pytest.mark.asyncio
    async def test_activation_whatsapp_failure_does_not_rollback(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """If WhatsApp send fails, activation is NOT rolled back."""
        from app.modules.tenants.models import Tenant

        tenant = Tenant(
            id=uuid.uuid4(),
            name="Test Co",
            slug="wa-fail-test",
            plan="trial",
            timezone="America/Bogota",
            locale="es-CO",
        )
        db_session.add(tenant)
        await db_session.commit()

        # No WhatsAppNumber — should log warning and skip gracefully
        with patch(
            "app.modules.evolution.adapter.EvolutionAdapter.send_message",
            new_callable=AsyncMock,
            side_effect=Exception("WA API down"),
        ):
            # Should NOT raise — fire-and-forget
            from app.modules.tenants.service import activate_tenant_plan

            result = await activate_tenant_plan(
                tenant_id=tenant.id,
                plan="basic",
                session=db_session,
            )

            assert result.plan == "basic"
            assert result.payment_status == "active"

    @pytest.mark.asyncio
    async def test_activation_without_whatsapp_number_skips(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """If tenant has no WhatsApp number, skip confirmation gracefully."""
        from app.modules.tenants.models import Tenant

        tenant = Tenant(
            id=uuid.uuid4(),
            name="No WANum",
            slug="no-wa-num",
            plan="trial",
            timezone="America/Bogota",
            locale="es-CO",
        )
        db_session.add(tenant)
        await db_session.commit()

        from app.modules.tenants.service import activate_tenant_plan

        # Should complete without error despite no WhatsApp number
        result = await activate_tenant_plan(
            tenant_id=tenant.id,
            plan="basic",
            session=db_session,
        )
        assert result.plan == "basic"
        assert result.payment_status == "active"


# ── Post-escalation silence ───────────────────────────────────────────────────


class TestEscalationSilence:
    """Tests for post-escalation behavior: 1 courtesy reply then silence."""

    @pytest.mark.asyncio
    async def test_escalated_first_message_gets_response(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """When escalated but NOT yet responded, bot responds (uses credit)."""
        tenant, connection = await _create_test_evolution_connection(db_session)

        from app.modules.conversations.models import Conversation

        conv = Conversation(
            tenant_id=tenant.id,
            platform_connection_id=connection.id,
            external_user_id="573001234567",
            status="escalated",
            extra_data={},  # NOT escalation_responded
        )
        db_session.add(conv)
        await db_session.commit()

        with patch(
            "app.modules.evolution.handler.EvolutionAdapter.send_message",
            new_callable=AsyncMock,
        ) as mock_send:
            mock_send.return_value = {"key": {"id": "mock-evo-msg-id"}}

            with patch(
                "app.modules.evolution.handler.groq_client.generate",
                new_callable=AsyncMock,
            ) as mock_groq:
                mock_groq.return_value = "Respuesta de cortesía."

                from app.modules.evolution.handler import handle_evolution_incoming

                event = _make_evolution_event("hola")
                await handle_evolution_incoming(
                    event=event,
                    connection=connection,
                    session=db_session,
                )

                # Bot responded (used the courtesy credit)
                mock_send.assert_awaited_once()
                mock_groq.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_escalated_second_message_silence(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """When escalated AND already responded, bot saves silently."""
        from datetime import datetime, timezone

        tenant, connection = await _create_test_evolution_connection(db_session)

        from app.modules.conversations.models import Conversation, Message

        conv = Conversation(
            tenant_id=tenant.id,
            platform_connection_id=connection.id,
            external_user_id="573001234567",
            status="escalated",
            extra_data={
                "escalation_responded": True,
                "escalated_at": datetime.now(timezone.utc).isoformat(),
            },
        )
        db_session.add(conv)
        await db_session.flush()

        # A prior outbound (courtesy response already sent)
        prior_out = Message(
            tenant_id=tenant.id,
            conversation_id=conv.id,
            platform_connection_id=connection.id,
            direction="out",
            external_user_id="573001234567",
            platform="evolution",
            message_type="text",
            content="Un asesor te contactará.",
            status="sent",
        )
        db_session.add(prior_out)
        await db_session.commit()

        with patch(
            "app.modules.evolution.handler.EvolutionAdapter.send_message",
            new_callable=AsyncMock,
        ) as mock_send:
            with patch(
                "app.modules.evolution.handler.groq_client.generate",
                new_callable=AsyncMock,
            ) as mock_groq:
                mock_groq.return_value = "NO DEBERÍA LLAMARSE"

                from app.modules.evolution.handler import handle_evolution_incoming

                event = _make_evolution_event("otro mensaje")
                await handle_evolution_incoming(
                    event=event,
                    connection=connection,
                    session=db_session,
                )

                # Bot did NOT respond
                mock_send.assert_not_awaited()
                mock_groq.assert_not_awaited()

                # But inbound message WAS saved
                from sqlalchemy import select as sa_select

                result = await db_session.execute(
                    sa_select(Message).where(
                        Message.conversation_id == conv.id,
                        Message.direction == "in",
                    )
                )
                in_msgs = result.scalars().all()
                assert any(m.content == "otro mensaje" for m in in_msgs)

    @pytest.mark.asyncio
    async def test_non_escalated_normal_flow_unaffected(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """Non-escalated conversation continues working normally."""
        tenant, connection = await _create_test_evolution_connection(db_session)

        with patch(
            "app.modules.evolution.handler.EvolutionAdapter.send_message",
            new_callable=AsyncMock,
        ) as mock_send:
            mock_send.return_value = {"key": {"id": "mock-evo-msg-id"}}

            with patch(
                "app.modules.evolution.handler.groq_client.generate",
                new_callable=AsyncMock,
            ) as mock_groq:
                mock_groq.return_value = "Hola, soy un asistente."

                from app.modules.evolution.handler import handle_evolution_incoming

                event = _make_evolution_event("me gustaria saber el horario")
                await handle_evolution_incoming(
                    event=event,
                    connection=connection,
                    session=db_session,
                )

                mock_groq.assert_awaited_once()
                mock_send.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_basic_trial_escalation_sets_status_and_second_silent(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """Basic/Trial: escalate keywords set status + responded flag; next msg silent."""
        from app.modules.tenants.models import Tenant
        from app.modules.platform_connections.models import PlatformConnection
        from app.modules.agents.models import AiAgent
        from app.modules.conversations.models import Conversation, Message

        tenant = Tenant(
            id=uuid.uuid4(),
            name="Test Basic",
            slug=f"test-basic-{uuid.uuid4().hex[:6]}",
            plan="basic",
            timezone="America/Bogota",
            locale="es-CO",
        )
        db_session.add(tenant)
        await db_session.flush()

        agent = AiAgent(
            id=uuid.uuid4(),
            tenant_id=tenant.id,
            name="Test Agent",
            model="llama3-70b",
            enabled=True,
            business_config={
                "faq": [],
                "keywords_to_escalate": ["hablar con asesor", "humano", "contactar"],
            },
        )
        db_session.add(agent)
        await db_session.flush()

        connection = PlatformConnection(
            tenant_id=tenant.id,
            agent_id=agent.id,
            platform_type="evolution",
            display_name="Test Evolution",
            credentials="{}",
            status="active",
            is_primary=True,
        )
        db_session.add(connection)
        await db_session.commit()

        with patch(
            "app.modules.evolution.handler.EvolutionAdapter.send_message",
            new_callable=AsyncMock,
        ) as mock_send:
            mock_send.return_value = {"key": {"id": "mock-evo-msg-id"}}

            from app.modules.evolution.handler import handle_evolution_incoming

            # ── First message: escalation trigger ──────────────────
            event = _make_evolution_event("necesito contactar un asesor")
            await handle_evolution_incoming(
                event=event,
                connection=connection,
                session=db_session,
            )

            # Bot sent response (courtesy)
            mock_send.assert_awaited_once()

            # Verify escalation state
            from sqlalchemy import select as sa_select

            result = await db_session.execute(
                sa_select(Conversation).where(
                    Conversation.tenant_id == tenant.id,
                )
            )
            conv = result.scalar_one()
            assert conv.status == "escalated"
            assert conv.extra_data is not None
            assert conv.extra_data.get("escalation_responded") is True

            # ── Second message: should be silent ───────────────────
            mock_send.reset_mock()
            event2 = _make_evolution_event("otra consulta")
            await handle_evolution_incoming(
                event=event2,
                connection=connection,
                session=db_session,
            )
            mock_send.assert_not_awaited()

            # Verify second inbound was saved
            result2 = await db_session.execute(
                sa_select(Message).where(
                    Message.conversation_id == conv.id,
                    Message.direction == "in",
                )
            )
            in_msgs = result2.scalars().all()
            assert any(m.content == "otra consulta" for m in in_msgs)


# ── Helpers ──────────────────────────────────────────────────────────────────


async def _create_test_evolution_connection(
    db_session: AsyncSession,
) -> tuple:
    """Create a tenant + Evolution PlatformConnection for testing."""
    from app.modules.tenants.models import Tenant
    from app.modules.platform_connections.models import PlatformConnection

    tenant = Tenant(
        id=uuid.uuid4(),
        name="Test Co",
        slug=f"test-evo-{uuid.uuid4().hex[:6]}",
        plan="professional",
        timezone="America/Bogota",
        locale="es-CO",
    )
    db_session.add(tenant)
    await db_session.flush()

    connection = PlatformConnection(
        tenant_id=tenant.id,
        platform_type="evolution",
        display_name="Test Evolution",
        credentials="{}",  # no real creds needed for mocked tests
        status="active",
        is_primary=True,
    )
    db_session.add(connection)
    await db_session.commit()

    return tenant, connection


def _make_evolution_event(text: str) -> dict:
    """Build a realistic Evolution API webhook event with a text message."""
    return {
        "event": "messages.upsert",
        "instance": "test-instance",
        "data": {
            "key": {
                "remoteJid": "573001234567@s.whatsapp.net",
                "fromMe": False,
                "id": f"test-msg-{uuid.uuid4().hex[:8]}",
            },
            "pushName": "Test User",
            "message": {
                "conversation": text,
            },
            "messageType": "conversation",
        },
    }


def _make_evolution_message_event(text: str) -> dict:
    """Build an Evolution API event where message uses extendedTextMessage format."""
    return {
        "event": "messages.upsert",
        "instance": "test-instance",
        "data": {
            "key": {
                "remoteJid": "573001234567@s.whatsapp.net",
                "fromMe": False,
                "id": f"test-msg-{uuid.uuid4().hex[:8]}",
            },
            "pushName": "Test User",
            "message": {
                "extendedTextMessage": {
                    "text": text,
                },
            },
            "messageType": "extendedTextMessage",
        },
    }
