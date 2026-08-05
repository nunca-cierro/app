"""Tests for programmed responses on basic/trial plans (no CAP_AI).

Basic/trial tenants have no ``ai.responses`` capability — the programmed
FAQ/keyword matcher is their ONLY reply path, so matching quality IS product
quality. Covers:

- accent folding in FAQ matching ("atencion" ↔ "atención")
- single-word question support ("Precios" → "precios")
- stopword robustness ("¿Dónde están?" never false-matches)
- escalation keyword matching (phrase keywords + word boundaries)
- courtesy credit NOT consumed when the send fails (bot keeps replying)
- basic plan NEVER awaits Groq (regression guard)
"""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.evolution.handler import (
    _faq_answer_for,
    _fold_accents,
    _matches_escalation_keyword,
    _significant_words,
)


# ── Unit: accent folding ──────────────────────────────────────────────────────


class TestAccentFolding:
    @pytest.mark.parametrize(
        ("text", "expected"),
        [
            ("atención", "atencion"),
            ("ATENCIÓN", "atencion"),
            ("Atención", "atencion"),
            ("áéíóúüñ", "aeiouun"),
            ("ÁÉÍÓÚÜÑ", "aeiouun"),
            ("precios", "precios"),
            ("¿Dónde están?", "¿donde estan?"),
        ],
    )
    def test_fold_accents(self, text: str, expected: str) -> None:
        assert _fold_accents(text) == expected

    def test_significant_words_strips_punctuation_and_stopwords(self) -> None:
        """'¿Cuál es el horario de atención?' keeps only content words."""
        assert _significant_words("¿Cuál es el horario de atención?") == {
            "horario",
            "atencion",
        }

    def test_stopword_only_text_has_no_significant_words(self) -> None:
        assert _significant_words("¿Dónde están?") == set()


# ── Unit: FAQ matching ────────────────────────────────────────────────────────


class TestFaqMatching:
    FAQ = [
        {
            "question": "¿Cuál es el horario de atención?",
            "answer": "Atendemos de 9 a 6.",
        }
    ]

    def test_accent_folding_matches(self) -> None:
        """FIX 1: 'atencion' (no accent) matches a question with 'atención'."""
        assert _faq_answer_for("atencion", self.FAQ) == "Atendemos de 9 a 6."

    def test_single_word_question_matches(self) -> None:
        """FIX 2: 'Precios' matches a FAQ question reduced to 'precios'."""
        faq = [{"question": "precios", "answer": "Desde $10."}]
        assert _faq_answer_for("Precios", faq) == "Desde $10."

    def test_stopword_only_question_never_false_matches(self) -> None:
        """FIX 2: '¿Dónde están?' reduces to ZERO significant words.

        A message about products that happens to contain "dónde" + "están"
        in a different context must NOT false-match the location FAQ.
        """
        faq = [{"question": "¿Dónde están?", "answer": "En la calle 10."}]
        assert (
            _faq_answer_for("me contaron dónde están los productos", faq) is None
        )

    def test_no_answer_without_overlap(self) -> None:
        assert _faq_answer_for("precios", self.FAQ) is None

    def test_empty_faq_returns_none(self) -> None:
        assert _faq_answer_for("hola", []) is None

    def test_question_with_answer_missing_is_skipped(self) -> None:
        faq = [{"question": "precios", "answer": ""}, {"question": "horario", "answer": "9 a 6"}]
        assert _faq_answer_for("horario", faq) == "9 a 6"


# ── Unit: escalation keyword matching ─────────────────────────────────────────


class TestEscalationKeywordMatching:
    def test_phrase_matches_when_all_significant_words_present(self) -> None:
        """FIX 3: 'hablar con asesor' matches 'quiero hablar un asesor'."""
        assert _matches_escalation_keyword("quiero hablar un asesor", "hablar con asesor")

    def test_phrase_does_not_match_partial_significant_words(self) -> None:
        """'hablar de fútbol' has 'hablar' but NOT 'asesor' → no match."""
        assert not _matches_escalation_keyword("hablar de fútbol", "hablar con asesor")

    def test_single_word_matches_on_word_boundary(self) -> None:
        assert _matches_escalation_keyword("tengo una queja", "queja")
        assert _matches_escalation_keyword("queja", "queja")

    def test_single_word_does_not_match_longer_word(self) -> None:
        """FIX 3: 'queja' must NOT match 'quejarnos' (word boundary)."""
        assert not _matches_escalation_keyword("quejarnos", "queja")

    def test_keyword_accents_are_folded(self) -> None:
        assert _matches_escalation_keyword("quiero atencion humana", "atención")

    def test_user_text_accents_are_folded(self) -> None:
        assert _matches_escalation_keyword("quiero atención humana", "atencion")


# ── Integration: courtesy credit + Groq regression guard ─────────────────────


async def _create_basic_plan_setup(db_session: AsyncSession) -> tuple:
    """Tenant on 'basic' (no CAP_AI) + enabled agent with FAQ/keywords + connection."""
    from app.modules.agents.models import AiAgent
    from app.modules.platform_connections.models import PlatformConnection
    from app.modules.tenants.models import Tenant

    tenant = Tenant(
        id=uuid.uuid4(),
        name="Test Basic",
        slug=f"test-prog-{uuid.uuid4().hex[:6]}",
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
            "faq": [
                {
                    "question": "¿Cuál es el horario de atención?",
                    "answer": "Atendemos de 9 a 6.",
                }
            ],
            "keywords_to_escalate": ["hablar con asesor", "queja"],
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


class TestCourtesyCreditOnSendFailure:
    @pytest.mark.asyncio
    async def test_failed_send_does_not_consume_courtesy_credit(
        self, client: AsyncClient, db_session: AsyncSession
    ) -> None:
        """FIX 4: when send_message raises, escalation_responded stays unset.

        The bot must reply on the next message instead of going permanently
        silent on a courtesy the customer never received.
        """
        from app.modules.conversations.models import Conversation
        from app.modules.evolution.handler import groq_client, handle_evolution_incoming

        tenant, connection = await _create_basic_plan_setup(db_session)

        # Pre-escalated conversation (courtesy not yet delivered)
        conv = Conversation(
            tenant_id=tenant.id,
            platform_connection_id=connection.id,
            external_user_id="573001234567",
            status="escalated",
            extra_data={},
        )
        db_session.add(conv)
        await db_session.commit()

        with patch(
            "app.modules.evolution.handler.EvolutionAdapter.send_message",
            new_callable=AsyncMock,
        ) as mock_send:
            with patch.object(
                groq_client, "generate", new_callable=AsyncMock
            ) as mock_groq:
                # ── First message: phrase keyword escalates, send FAILS ──
                mock_send.side_effect = Exception("Evolution API down")
                await handle_evolution_incoming(
                    event=_make_evolution_event("quiero hablar un asesor"),
                    connection=connection,
                    session=db_session,
                )
                mock_send.assert_awaited_once()
                mock_groq.assert_not_awaited()

                # Conversation escalated, but the credit was NOT consumed
                result = await db_session.execute(
                    select(Conversation).where(Conversation.id == conv.id)
                )
                updated = result.scalar_one()
                assert updated.status == "escalated"
                assert (
                    (updated.extra_data or {}).get("escalation_responded")
                    is not True
                )

                # ── Second message: send succeeds → bot replies ──
                mock_send.side_effect = None
                mock_send.return_value = {"key": {"id": "mock-evo-msg-id"}}
                await handle_evolution_incoming(
                    event=_make_evolution_event("otra consulta"),
                    connection=connection,
                    session=db_session,
                )
                assert mock_send.await_count == 2
                mock_groq.assert_not_awaited()

                # Credit consumed now — a third message must be silent
                mock_send.reset_mock()
                await handle_evolution_incoming(
                    event=_make_evolution_event("una más"),
                    connection=connection,
                    session=db_session,
                )
                mock_send.assert_not_awaited()


class TestBasicPlanNeverUsesGroq:
    @pytest.mark.asyncio
    async def test_basic_plan_faq_response_never_awaits_groq(
        self, client: AsyncClient, db_session: AsyncSession
    ) -> None:
        """Regression guard: basic/trial plans MUST never call Groq.

        Also exercises FIX 1 end-to-end: "atencion" matches the FAQ
        question "¿Cuál es el horario de atención?".
        """
        from app.modules.evolution.handler import groq_client, handle_evolution_incoming

        tenant, connection = await _create_basic_plan_setup(db_session)

        with patch(
            "app.modules.evolution.handler.EvolutionAdapter.send_message",
            new_callable=AsyncMock,
        ) as mock_send:
            mock_send.return_value = {"key": {"id": "mock-evo-msg-id"}}
            with patch.object(
                groq_client, "generate", new_callable=AsyncMock
            ) as mock_groq:
                mock_groq.return_value = "NO DEBERÍA LLAMARSE"

                await handle_evolution_incoming(
                    event=_make_evolution_event("atencion"),
                    connection=connection,
                    session=db_session,
                )

                mock_groq.assert_not_awaited()
                mock_send.assert_awaited_once()
                sent_text = mock_send.call_args[1]["text"]
                assert sent_text == "Atendemos de 9 a 6."

    @pytest.mark.asyncio
    async def test_basic_plan_word_boundary_queja_does_not_escalate(
        self, client: AsyncClient, db_session: AsyncSession
    ) -> None:
        """FIX 3 end-to-end: 'quejarnos' does NOT trigger keyword 'queja'."""
        from app.modules.conversations.models import Conversation
        from app.modules.evolution.handler import groq_client, handle_evolution_incoming

        tenant, connection = await _create_basic_plan_setup(db_session)

        with patch(
            "app.modules.evolution.handler.EvolutionAdapter.send_message",
            new_callable=AsyncMock,
        ) as mock_send:
            mock_send.return_value = {"key": {"id": "mock-evo-msg-id"}}
            with patch.object(
                groq_client, "generate", new_callable=AsyncMock
            ) as mock_groq:
                await handle_evolution_incoming(
                    event=_make_evolution_event("quiero quejarnos de algo"),
                    connection=connection,
                    session=db_session,
                )

                # No escalation — normal programmed reply (default response)
                mock_groq.assert_not_awaited()
                mock_send.assert_awaited_once()

                result = await db_session.execute(
                    select(Conversation).where(
                        Conversation.tenant_id == tenant.id,
                        Conversation.platform_connection_id == connection.id,
                    )
                )
                conv = result.scalar_one()
                assert conv.status != "escalated"
