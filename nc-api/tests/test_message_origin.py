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

import pytest
from sqlalchemy import String, select

from app.modules.conversations.models import Conversation, Message
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