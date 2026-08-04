"""Tests for inbound message deduplication (objective 5).

Covers:
1. The unique constraint (platform_connection_id, external_message_id)
   rejects duplicate inserts — the DB-level safety net.
2. The Evolution handler skips re-delivered events (retries / echoes)
   before processing, so the same message is answered only once.
"""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select

from app.core.encryption import encrypt
from app.modules.conversations.models import Conversation, Message
from app.modules.platform_connections.models import PlatformConnection
from app.modules.tenants.models import Tenant


async def _seed(db_session) -> tuple[Tenant, PlatformConnection, Conversation]:
    tenant = Tenant(
        id=uuid.uuid4(), name="Dedup Tenant", slug="dedup-test", status="active",
        plan="professional", timezone="UTC", locale="es",
    )
    db_session.add(tenant)
    await db_session.flush()
    conn = PlatformConnection(
        id=uuid.uuid4(), tenant_id=tenant.id, platform_type="evolution",
        display_name="Dedup Conn",
        credentials=encrypt(
            {"base_url": "http://evo:8080", "api_key": "secret-evo-key", "instance_name": "inst-test"}
        ),
        status="active",
    )
    db_session.add(conn)
    await db_session.flush()
    conv = Conversation(
        tenant_id=tenant.id, platform_connection_id=conn.id,
        external_user_id="573001234567", status="open",
    )
    db_session.add(conv)
    await db_session.flush()
    return tenant, conn, conv


def _msg(tenant, conn, conv, *, external_message_id, content, direction="in", status="received"):
    return Message(
        tenant_id=tenant.id, conversation_id=conv.id, platform_connection_id=conn.id,
        direction=direction, external_user_id="573001234567",
        external_message_id=external_message_id, platform="evolution",
        content=content, status=status,
    )


class TestUniqueConstraint:
    """The (platform_connection_id, external_message_id) constraint exists in DB."""

    @pytest.mark.asyncio
    async def test_duplicate_external_message_id_rejected(self, db_session) -> None:
        tenant, conn, conv = await _seed(db_session)
        db_session.add(_msg(tenant, conn, conv, external_message_id="dup-1", content="first"))
        await db_session.flush()
        db_session.add(_msg(tenant, conn, conv, external_message_id="dup-1", content="second"))
        with pytest.raises(IntegrityError):
            await db_session.flush()
        await db_session.rollback()

    @pytest.mark.asyncio
    async def test_null_external_message_id_duplicates_allowed(self, db_session) -> None:
        """NULL ids (e.g. failed outbound sends) are distinct in the constraint."""
        tenant, conn, conv = await _seed(db_session)
        for content in ("a", "b"):
            db_session.add(
                _msg(tenant, conn, conv, external_message_id=None,
                     content=content, direction="out", status="failed")
            )
        await db_session.flush()  # must NOT raise


EVO_PAYLOAD: dict = {
    "event": "messages.upsert",
    "instance": "inst-test",
    "data": {
        "key": {
            "remoteJid": "573001234567@s.whatsapp.net",
            "fromMe": False,
            "id": "msg-dedup-1",
        },
        "pushName": "Cliente",
        "message": {"conversation": "Hola, ¿qué productos tienen?"},
        "messageType": "conversation",
    },
}


class TestHandlerDedup:
    """A re-delivered Evolution event is processed only once."""

    @pytest.mark.asyncio
    async def test_duplicate_webhook_delivery_processed_once(self, client, db_session) -> None:
        tenant, conn, _ = await _seed(db_session)
        await db_session.commit()

        mock_generate = AsyncMock(return_value="AI reply")
        mock_send = AsyncMock(return_value={"key": {"id": "evo-out-1"}})
        with (
            patch("app.modules.evolution.handler.groq_client.generate", new=mock_generate),
            patch("app.modules.evolution.adapter.EvolutionAdapter.send_message", new=mock_send),
        ):
            first = await client.post(
                f"/webhook/evolution/{conn.id}", json=EVO_PAYLOAD,
                headers={"apikey": "secret-evo-key"},
            )
            second = await client.post(
                f"/webhook/evolution/{conn.id}", json=EVO_PAYLOAD,
                headers={"apikey": "secret-evo-key"},
            )

        assert first.status_code == 200 and second.status_code == 200
        result = await db_session.execute(
            select(Message).where(Message.external_message_id == "msg-dedup-1")
        )
        assert len(result.scalars().all()) == 1
        mock_generate.assert_awaited_once()
        mock_send.assert_awaited_once()
