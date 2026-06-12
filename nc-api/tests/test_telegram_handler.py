"""Tests for Telegram handler — full message processing pipeline."""

from __future__ import annotations

import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

os.environ.setdefault("ENCRYPTION_KEY", "dGhpcyBpcyBhIDE2LWJ5dGUgZXhhbXBsZSBrZXkgISE=")


class TestHandleTelegramIncoming:
    """handle_telegram_incoming processes a Telegram update end-to-end."""

    @pytest.mark.asyncio
    async def test_processes_telegram_message(self, db_session) -> None:
        """Full pipeline: extract, resolve, save, generate, send, outbound."""
        from app.core.tenancy import TenantResolution
        from app.modules.tenants.models import Tenant
        from app.modules.platform_connections.models import PlatformConnection
        from app.core.encryption import encrypt
        from app.modules.conversations.models import Conversation, Message
        from sqlalchemy import select

        # ── Setup ────────────────────────────────────────────────────────
        tenant = Tenant(
            id=__import__("uuid").uuid4(),
            name="Telegram Tenant",
            slug="tg-tenant",
            status="active",
            plan="professional",
            timezone="UTC",
            locale="en",
        )
        db_session.add(tenant)
        await db_session.flush()

        creds = {"bot_token": "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"}
        conn = PlatformConnection(
            id=__import__("uuid").uuid4(),
            tenant_id=tenant.id,
            platform_type="telegram",
            display_name="Test Bot",
            credentials=encrypt(creds),
            status="active",
        )
        db_session.add(conn)
        await db_session.commit()

        update = {
            "update_id": 100,
            "message": {
                "message_id": 42,
                "from": {"id": 56789, "is_bot": False, "first_name": "Alice"},
                "chat": {"id": 56789, "type": "private"},
                "date": 1700000000,
                "text": "Hello from Telegram!",
            },
        }

        # ── Execute ──────────────────────────────────────────────────────
        with (
            patch(
                "app.modules.telegram.handler.TelegramAdapter"
            ) as MockAdapter,
            patch(
                "app.modules.telegram.handler.groq_client.generate",
                new=AsyncMock(
                    return_value="AI response from mocked Groq"
                ),
            ),
        ):
            mock_adapter = MagicMock()
            mock_adapter.send_message = AsyncMock(
                return_value={"ok": True, "result": {"message_id": 100}}
            )
            MockAdapter.return_value = mock_adapter

            from app.modules.telegram.handler import handle_telegram_incoming

            await handle_telegram_incoming(update, conn, db_session)

        # ── Assertions ───────────────────────────────────────────────────
        result = await db_session.execute(
            select(Conversation).where(Conversation.tenant_id == tenant.id)
        )
        convs = result.scalars().all()
        assert len(convs) >= 1
        conv = convs[0]
        assert conv.external_user_id == "56789"
        assert conv.platform == "telegram"
        assert conv.platform_connection_id == conn.id

        result = await db_session.execute(
            select(Message).where(Message.conversation_id == conv.id)
        )
        msgs = result.scalars().all()
        assert len(msgs) >= 1
        inbound = [m for m in msgs if m.direction == "in"]
        outbound = [m for m in msgs if m.direction == "out"]
        assert len(inbound) == 1
        assert inbound[0].external_user_id == "56789"
        assert inbound[0].external_message_id == "42"
        assert inbound[0].platform == "telegram"
        assert inbound[0].content == "Hello from Telegram!"
        assert inbound[0].status == "received"

        assert len(outbound) == 1
        assert outbound[0].external_user_id == "56789"
        assert outbound[0].platform == "telegram"
        assert outbound[0].status == "sent"
        assert outbound[0].content == "AI response from mocked Groq"

        # Verify TelegramAdapter was called with the right connection
        MockAdapter.assert_called_once()
        mock_adapter.send_message.assert_awaited_once_with(
            connection=conn,
            to="56789",
            text="AI response from mocked Groq",
        )

    @pytest.mark.asyncio
    async def test_ignores_non_text_update(self, db_session) -> None:
        """A non-text update (callback_query) is silently ignored."""
        from app.modules.telegram.handler import handle_telegram_incoming

        update = {
            "update_id": 200,
            "callback_query": {
                "id": "cb123",
                "from": {"id": 56789},
                "data": "btn_click",
            },
        }

        await handle_telegram_incoming(update, None, db_session)
        # No crash = success (handler should return early for non-message updates)

    @pytest.mark.asyncio
    async def test_empty_payload_no_crash(self, db_session) -> None:
        """An empty update dict does not crash."""
        from app.modules.telegram.handler import handle_telegram_incoming

        await handle_telegram_incoming({}, None, db_session)
        # No crash = success
