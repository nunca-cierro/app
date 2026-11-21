"""Integration tests for EngineService message orchestration.

Tests deduplication, 72h admin cooldown, Evolution, and Telegram inbound routing.
"""

from __future__ import annotations

import os
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy import select

os.environ.setdefault("ENCRYPTION_KEY", "dGhpcyBpcyBhIDE2LWJ5dGUgZXhhbXBsZSBrZXkgISE=")

from app.core.encryption import encrypt
from app.modules.conversations.models import Conversation, Message
from app.modules.engine.schemas import InboundMessage
from app.modules.engine.service import engine_service
from app.modules.evolution.adapter import EvolutionAdapter
from app.modules.platform_connections.models import PlatformConnection
from app.modules.telegram.adapter import TelegramAdapter
from app.modules.tenants.models import Tenant


async def _create_test_tenant(db_session, plan: str = "growth") -> Tenant:
    tenant = Tenant(
        id=uuid.uuid4(),
        name="Engine Test Tenant",
        slug=f"engine-test-{uuid.uuid4().hex[:6]}",
        status="active",
        plan=plan,
        timezone="UTC",
        locale="es",
    )
    db_session.add(tenant)
    await db_session.commit()
    return tenant


async def _create_test_connection(
    db_session, tenant_id: uuid.UUID, platform: str = "evolution"
) -> PlatformConnection:
    creds = (
        {"base_url": "http://evo:8080", "api_key": "key", "instance_name": "test"}
        if platform == "evolution"
        else {"bot_token": "123:ABC"}
    )
    conn = PlatformConnection(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        platform_type=platform,
        display_name=f"Conn {platform}",
        credentials=encrypt(creds),
        status="active",
    )
    db_session.add(conn)
    await db_session.commit()
    return conn


@pytest.fixture
def mock_llm() -> AsyncMock:
    with patch(
        "app.modules.engine.service.llm_client.generate",
        new=AsyncMock(return_value="Respuesta generada por IA"),
    ) as mock:
        yield mock


@pytest.fixture
def mock_evo_adapter() -> MagicMock:
    adapter = MagicMock(spec=EvolutionAdapter)
    adapter.send_message = AsyncMock(return_value={"key": {"id": "outbound-evo-id"}})
    return adapter


@pytest.fixture
def mock_tg_adapter() -> MagicMock:
    adapter = MagicMock(spec=TelegramAdapter)
    adapter.send_message = AsyncMock(
        return_value={"result": {"message_id": 9999}}
    )
    return adapter


@pytest.mark.asyncio
class TestEngineServicePipeline:
    """Core test suite for EngineService agnostic message processing."""

    async def test_atomic_deduplication_replay_exit(
        self, db_session, mock_llm, mock_evo_adapter
    ) -> None:
        """Concurrent or repeated delivery of the same message_id exits early on conflict."""
        tenant = await _create_test_tenant(db_session)
        conn = await _create_test_connection(db_session, tenant.id, "evolution")

        inbound1 = InboundMessage(
            platform_connection_id=conn.id,
            platform="evolution",
            external_user_id="573001110001",
            external_message_id="msg-dedup-1",
            content="Hola, primer intento",
            from_me=False,
            remote_jid="573001110001@s.whatsapp.net",
        )

        # 1. First delivery processes successfully
        out1 = await engine_service.process_inbound(
            inbound=inbound1,
            connection=conn,
            session=db_session,
            adapter=mock_evo_adapter,
        )
        assert out1 is not None
        assert out1.content == "Respuesta generada por IA"
        assert mock_llm.call_count == 1
        assert mock_evo_adapter.send_message.call_count == 1

        # 2. Second delivery with the SAME external_message_id is detected as a replay
        inbound2 = InboundMessage(
            platform_connection_id=conn.id,
            platform="evolution",
            external_user_id="573001110001",
            external_message_id="msg-dedup-1",
            content="Hola, segundo intento repetido",
            from_me=False,
            remote_jid="573001110001@s.whatsapp.net",
        )

        out2 = await engine_service.process_inbound(
            inbound=inbound2,
            connection=conn,
            session=db_session,
            adapter=mock_evo_adapter,
        )
        assert out2 is None  # Replay exit
        # LLM and adapter were NOT called a second time
        assert mock_llm.call_count == 1
        assert mock_evo_adapter.send_message.call_count == 1

    async def test_admin_from_me_activates_cooldown_and_skips_ai(
        self, db_session, mock_llm, mock_evo_adapter
    ) -> None:
        """Admin sending a message from WhatsApp app sets 72h cooldown and skips AI."""
        tenant = await _create_test_tenant(db_session)
        conn = await _create_test_connection(db_session, tenant.id, "evolution")

        admin_inbound = InboundMessage(
            platform_connection_id=conn.id,
            platform="evolution",
            external_user_id="573001110002",
            external_message_id="admin-msg-001",
            content="Hola, soy el dueño respondiendo manualmente",
            from_me=True,
            remote_jid="573001110002@s.whatsapp.net",
        )

        out = await engine_service.process_inbound(
            inbound=admin_inbound,
            connection=conn,
            session=db_session,
            adapter=mock_evo_adapter,
        )

        assert out is None
        assert mock_llm.call_count == 0
        assert mock_evo_adapter.send_message.call_count == 0

        # Verify admin message was recorded in database
        result = await db_session.execute(
            select(Message).where(
                Message.platform_connection_id == conn.id,
                Message.external_message_id == "admin-msg-001",
            )
        )
        saved = result.scalar_one_or_none()
        assert saved is not None
        assert saved.direction == "out"
        assert saved.payload == {"source": "admin"}

        # Verify 72h cooldown was recorded on conversation
        conv_res = await db_session.execute(
            select(Conversation).where(
                Conversation.platform_connection_id == conn.id,
                Conversation.external_user_id == "573001110002",
            )
        )
        conv = conv_res.scalar_one()
        assert "admin_last_active_at" in (conv.extra_data or {})

    async def test_admin_cooldown_72h_silent_save_customer_message(
        self, db_session, mock_llm, mock_evo_adapter
    ) -> None:
        """When admin cooldown is active, customer inbound is silently saved without AI response."""
        tenant = await _create_test_tenant(db_session)
        conn = await _create_test_connection(db_session, tenant.id, "evolution")

        # 1. Admin sends message -> marks cooldown
        admin_inbound = InboundMessage(
            platform_connection_id=conn.id,
            platform="evolution",
            external_user_id="573001110003",
            external_message_id="admin-msg-002",
            content="Hola cliente",
            from_me=True,
            remote_jid="573001110003@s.whatsapp.net",
        )
        await engine_service.process_inbound(
            inbound=admin_inbound,
            connection=conn,
            session=db_session,
            adapter=mock_evo_adapter,
        )

        # 2. Customer replies while cooldown is active (< 72h)
        cust_inbound = InboundMessage(
            platform_connection_id=conn.id,
            platform="evolution",
            external_user_id="573001110003",
            external_message_id="cust-msg-002",
            content="Hola admin, gracias por responder",
            from_me=False,
            remote_jid="573001110003@s.whatsapp.net",
        )
        out = await engine_service.process_inbound(
            inbound=cust_inbound,
            connection=conn,
            session=db_session,
            adapter=mock_evo_adapter,
        )

        # AI must NOT reply
        assert out is None
        assert mock_llm.call_count == 0
        assert mock_evo_adapter.send_message.call_count == 0

        # Customer message MUST be stored as received in DB
        result = await db_session.execute(
            select(Message).where(
                Message.platform_connection_id == conn.id,
                Message.external_message_id == "cust-msg-002",
            )
        )
        saved_msg = result.scalar_one_or_none()
        assert saved_msg is not None
        assert saved_msg.direction == "in"
        assert saved_msg.status == "received"

    async def test_telegram_message_processing_via_engine(
        self, db_session, mock_llm, mock_tg_adapter
    ) -> None:
        """Telegram message flows cleanly through engine and dispatches via TelegramAdapter."""
        tenant = await _create_test_tenant(db_session)
        conn = await _create_test_connection(db_session, tenant.id, "telegram")

        inbound = InboundMessage(
            platform_connection_id=conn.id,
            platform="telegram",
            external_user_id="telegram_user_99",
            external_message_id="tg-msg-101",
            content="Hola desde Telegram",
            from_me=False,
        )

        out = await engine_service.process_inbound(
            inbound=inbound,
            connection=conn,
            session=db_session,
            adapter=mock_tg_adapter,
        )

        assert out is not None
        assert out.platform == "telegram"
        assert out.content == "Respuesta generada por IA"
        assert out.status == "sent"
        assert mock_llm.call_count == 1
        assert mock_tg_adapter.send_message.call_count == 1
