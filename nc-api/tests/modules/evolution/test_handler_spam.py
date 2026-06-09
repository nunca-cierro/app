"""Integration tests for spam detection in the Evolution handler pipeline.

Tests the full handler flow with mocked Groq and adapter.
Requires a PostgreSQL test database (``db_session`` fixture from conftest).
"""

from __future__ import annotations

import os
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

os.environ.setdefault("ENCRYPTION_KEY", "dGhpcyBpcyBhIDE2LWJ5dGUgZXhhbXBsZSBrZXkgISE=")

from app.modules.evolution.handler import handle_evolution_incoming
from app.modules.tenants.models import Tenant
from app.modules.platform_connections.models import PlatformConnection
from app.modules.conversations.models import Message
from app.core.encryption import encrypt
from sqlalchemy import select


# ── Helpers ────────────────────────────────────────────────────────────────


def _make_event(text: str, msg_id: str = "test_msg") -> dict:
    """Create a minimal Evolution API messages.upsert event."""
    return {
        "event": "messages.upsert",
        "instance": "test-instance",
        "data": {
            "key": {
                "remoteJid": "573001234567@s.whatsapp.net",
                "fromMe": False,
                "id": msg_id,
            },
            "pushName": "Test User",
            "message": {"conversation": text},
            "messageType": "conversation",
        },
    }


@pytest.fixture
def mock_groq() -> AsyncMock:
    """Mock groq_client.generate to return a canned response."""
    with patch(
        "app.modules.evolution.handler.groq_client.generate",
        new=AsyncMock(return_value="Mocked AI response"),
    ) as mock:
        yield mock


@pytest.fixture
def mock_adapter() -> MagicMock:
    """Mock EvolutionAdapter.send_message to return success."""
    with patch(
        "app.modules.evolution.handler.EvolutionAdapter",
    ) as mock_cls:
        instance = MagicMock()
        instance.send_message = AsyncMock(
            return_value={"key": {"id": "evo_msg_out_1"}},
        )
        mock_cls.return_value = instance
        yield instance


@pytest.fixture
def mock_rate_limiter() -> AsyncMock:
    """Mock rate_limiter.is_allowed to always return True."""
    with patch(
        "app.modules.evolution.handler.rate_limiter.is_allowed",
        return_value=True,
    ) as mock:
        yield mock


@pytest.fixture
async def tenant(db_session) -> Tenant:
    """Create a test tenant."""
    t = Tenant(
        id=uuid.uuid4(),
        name="Spam Test",
        slug="spam-test",
        status="active",
        plan="basic",
        timezone="UTC",
        locale="en",
    )
    db_session.add(t)
    await db_session.flush()
    return t


@pytest.fixture
async def connection_block(db_session, tenant: Tenant) -> PlatformConnection:
    """Connection with anti-spam in block mode."""
    conn = PlatformConnection(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        platform_type="evolution",
        display_name="Spam Block Test",
        credentials=encrypt({"api_key": "test"}),
        status="active",
        extra_data={
            "anti_spam": {
                "enabled": True,
                "mode": "block",
            },
        },
    )
    db_session.add(conn)
    await db_session.flush()
    return conn


@pytest.fixture
async def connection_log(db_session, tenant: Tenant) -> PlatformConnection:
    """Connection with anti-spam in log mode."""
    conn = PlatformConnection(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        platform_type="evolution",
        display_name="Spam Log Test",
        credentials=encrypt({"api_key": "test"}),
        status="active",
        extra_data={
            "anti_spam": {
                "enabled": True,
                "mode": "log",
            },
        },
    )
    db_session.add(conn)
    await db_session.flush()
    return conn


# ── Block mode tests ──────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_spam_auto_reply_blocked(
    db_session,
    tenant: Tenant,
    connection_block: PlatformConnection,
    mock_groq: AsyncMock,
    mock_adapter: MagicMock,
    mock_rate_limiter: AsyncMock,
) -> None:
    """Auto-reply detected in block mode must skip Groq entirely."""
    text = "Gracias por contactarnos, en breve te atenderemos"
    event = _make_event(text, msg_id="spam_ar_1")

    await handle_evolution_incoming(event, connection_block, db_session)

    # Groq must NOT have been called
    mock_groq.assert_not_called()

    # Inbound message must be persisted with spam metadata
    result = await db_session.execute(
        select(Message).where(Message.external_message_id == "spam_ar_1")
    )
    msg = result.scalar_one_or_none()
    assert msg is not None, "Inbound message should be persisted"
    assert msg.payload is not None
    assert msg.payload.get("is_spam") is True
    assert msg.payload.get("spam_reason") == "auto_reply"
    assert msg.payload.get("spam_score") == 90
    assert "auto_reply" in msg.payload.get("detection_layers", [])


@pytest.mark.asyncio
async def test_spam_flood_blocked(
    db_session,
    tenant: Tenant,
    connection_block: PlatformConnection,
    mock_groq: AsyncMock,
    mock_adapter: MagicMock,
    mock_rate_limiter: AsyncMock,
) -> None:
    """6th message in 30s window must be blocked; Groq not called."""
    with patch("app.core.rate_limiter.time.time") as mock_time:
        mock_time.return_value = 1000.0

        # Send 5 legitimate messages (should pass)
        for i in range(5):
            ev = _make_event("Hola, ¿cómo estás?", msg_id=f"flood_ok_{i}")
            await handle_evolution_incoming(ev, connection_block, db_session)

        # 6th message should be blocked
        ev6 = _make_event("Hola, ¿cómo estás?", msg_id="flood_blocked")
        await handle_evolution_incoming(ev6, connection_block, db_session)

    # Groq should NOT have been called for the 6th message
    # (it WAS called for the first 5, so total calls = 5)
    assert mock_groq.await_count == 5

    # 6th message should have flood spam payload
    result = await db_session.execute(
        select(Message).where(Message.external_message_id == "flood_blocked")
    )
    msg = result.scalar_one_or_none()
    assert msg is not None
    assert msg.payload is not None
    assert msg.payload.get("is_spam") is True
    assert msg.payload.get("spam_reason") == "flood"


# ── Log mode tests ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_spam_log_mode_still_calls_groq(
    db_session,
    tenant: Tenant,
    connection_log: PlatformConnection,
    mock_groq: AsyncMock,
    mock_adapter: MagicMock,
    mock_rate_limiter: AsyncMock,
) -> None:
    """Log mode must detect spam but still process through Groq."""
    text = "Gracias por contactarnos, en breve te atenderemos"
    event = _make_event(text, msg_id="spam_log_1")

    await handle_evolution_incoming(event, connection_log, db_session)

    # Groq MUST have been called (log mode continues pipeline)
    mock_groq.assert_awaited_once()

    # Inbound message must have spam metadata
    result = await db_session.execute(
        select(Message).where(Message.external_message_id == "spam_log_1")
    )
    msg = result.scalar_one_or_none()
    assert msg is not None
    assert msg.payload is not None
    assert msg.payload.get("is_spam") is True
    assert msg.payload.get("spam_reason") == "auto_reply"


# ── Normal message tests ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_legitimate_message_passes(
    db_session,
    tenant: Tenant,
    connection_block: PlatformConnection,
    mock_groq: AsyncMock,
    mock_adapter: MagicMock,
    mock_rate_limiter: AsyncMock,
) -> None:
    """Normal customer message must call Groq and send response."""
    text = "Hola, ¿cuánto cuesta el menú ejecutivo?"
    event = _make_event(text, msg_id="normal_1")

    await handle_evolution_incoming(event, connection_block, db_session)

    # Groq must have been called
    mock_groq.assert_awaited_once()

    # Adapter must have been called
    mock_adapter.send_message.assert_awaited_once()

    # Inbound message should not have spam payload
    result = await db_session.execute(
        select(Message).where(Message.external_message_id == "normal_1")
    )
    msg = result.scalar_one_or_none()
    assert msg is not None
    assert msg.payload is None or msg.payload.get("is_spam") is not True
