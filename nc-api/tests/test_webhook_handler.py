"""Tests for webhook handler refactoring — platform-agnostic message handling."""

from __future__ import annotations

import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

os.environ.setdefault("ENCRYPTION_KEY", "dGhpcyBpcyBhIDE2LWJ5dGUgZXhhbXBsZSBrZXkgISE=")


# ── extract_message ──────────────────────────────────────────────────────


class TestExtractMessage:
    """extract_message still works with WhatsApp payloads (unchanged)."""

    def test_extract_message_whatsapp_text(self) -> None:
        from app.modules.integrations.webhook import extract_message

        payload = {
            "object": "whatsapp_business_account",
            "entry": [{
                "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
                "changes": [{
                    "value": {
                        "messaging_product": "whatsapp",
                        "metadata": {"phone_number_id": "123456789"},
                        "messages": [{
                            "from": "573001234567",
                            "id": "wamid.ABC123",
                            "type": "text",
                            "text": {"body": "Hello!"},
                        }],
                    },
                }],
            }],
        }

        result = extract_message(payload)
        assert result is not None
        assert len(result) == 1
        assert result[0]["phone_number_id"] == "123456789"
        assert result[0]["text"] == "Hello!"
        assert result[0]["phone"] == "573001234567"
        assert result[0]["msg_id"] == "wamid.ABC123"

    def test_extract_message_non_text_ignored(self) -> None:
        from app.modules.integrations.webhook import extract_message

        payload = {
            "object": "whatsapp_business_account",
            "entry": [{
                "changes": [{
                    "value": {
                        "messaging_product": "whatsapp",
                        "metadata": {"phone_number_id": "123"},
                        "messages": [{
                            "from": "573001234567",
                            "id": "wamid.IMG",
                            "type": "image",
                        }],
                    },
                }],
            }],
        }

        result = extract_message(payload)
        assert result is None

    def test_extract_message_empty_payload(self) -> None:
        from app.modules.integrations.webhook import extract_message

        result = extract_message({})
        assert result is None

    def test_extract_message_no_text_messages(self) -> None:
        from app.modules.integrations.webhook import extract_message

        payload = {
            "object": "whatsapp_business_account",
            "entry": [{
                "changes": [{
                    "value": {
                        "messaging_product": "whatsapp",
                        "metadata": {"phone_number_id": "123"},
                        "messages": [],
                    },
                }],
            }],
        }
        result = extract_message(payload)
        assert result is None


# ── handle_incoming ──────────────────────────────────────────────────────


class TestHandleIncoming:
    """handle_incoming supports custom resolver + new model fields."""

    @pytest.mark.asyncio
    async def test_backward_compat_default_resolver(self, db_session) -> None:
        """Default path uses resolve_by_phone_number_id internally."""
        from app.modules.integrations.webhook import handle_incoming

        payload = {
            "object": "whatsapp_business_account",
            "entry": [{
                "changes": [{
                    "value": {
                        "messaging_product": "whatsapp",
                        "metadata": {"phone_number_id": "unknown_999"},
                        "messages": [{
                            "from": "573009999999",
                            "id": "wamid.skip",
                            "type": "text",
                            "text": {"body": "Skip me"},
                        }],
                    },
                }],
            }],
        }

        with patch("app.modules.integrations.webhook.logger") as mock_logger:
            await handle_incoming(payload, db_session)
            mock_logger.warning.assert_called_once()

    @pytest.mark.asyncio
    async def test_empty_payload_no_crash(self, db_session) -> None:
        """handle_incoming handles empty payload gracefully."""
        from app.modules.integrations.webhook import handle_incoming

        await handle_incoming({}, db_session)
        # No crash = success

    @pytest.mark.asyncio
    async def test_custom_resolver_uses_new_fields(self, db_session) -> None:
        """Custom resolver creates conversations with new platform-agnostic fields."""
        from app.modules.integrations.webhook import handle_incoming
        from app.modules.tenants.models import Tenant
        from app.modules.platform_connections.models import PlatformConnection
        from app.core.encryption import encrypt
        from app.modules.conversations.models import Conversation, Message
        from sqlalchemy import select

        # ── Setup ────────────────────────────────────────────────────────
        tenant = Tenant(
            id=__import__("uuid").uuid4(),
            name="Test",
            slug="test-custom-resolver",
            status="active",
            plan="basic",
            timezone="UTC",
            locale="en",
        )
        db_session.add(tenant)
        await db_session.flush()

        creds = {"phone_number_id": "777888", "token": "test-token"}
        conn = PlatformConnection(
            id=__import__("uuid").uuid4(),
            tenant_id=tenant.id,
            platform_type="whatsapp",
            display_name="Custom Resolver Conn",
            credentials=encrypt(creds),
            status="active",
        )
        db_session.add(conn)
        await db_session.commit()

        # ── Resolver that returns a TenantResolution with platform_connection
        from app.core.tenancy import TenantResolution

        async def fake_resolver(platform: str, credentials: dict) -> TenantResolution:
            return TenantResolution(
                tenant=tenant,
                agent=None,
                prompts=[],
                platform_connection=conn,
                whatsapp_number=None,
            )

        payload = {
            "object": "whatsapp_business_account",
            "entry": [{
                "changes": [{
                    "value": {
                        "messaging_product": "whatsapp",
                        "metadata": {"phone_number_id": "777888"},
                        "messages": [{
                            "from": "573001234567",
                            "id": "wamid.custom",
                            "type": "text",
                            "text": {"body": "Custom resolver test"},
                        }],
                    },
                }],
            }],
        }

        with (
            patch(
                "app.modules.integrations.webhook.WhatsAppAdapter"
            ) as MockAdapter,
            patch(
                "app.modules.integrations.webhook.groq_client.generate",
                new=AsyncMock(
                    return_value="AI response from mocked Groq"
                ),
            ),
        ):
            mock_adapter = MagicMock()
            mock_adapter.send_message = AsyncMock(
                return_value={"messages": [{"id": "wamid.sent"}]}
            )
            MockAdapter.return_value = mock_adapter

            await handle_incoming(
                payload,
                db_session,
                resolver=fake_resolver,
                resolver_kwargs={
                    "platform": "whatsapp",
                    "credentials": {"phone_number_id": "777888"},
                },
            )

        # ── Assertions ───────────────────────────────────────────────────
        result = await db_session.execute(
            select(Conversation).where(Conversation.tenant_id == tenant.id)
        )
        convs = result.scalars().all()
        assert len(convs) >= 1
        conv = convs[0]
        assert conv.external_user_id == "573001234567"
        assert conv.platform == "whatsapp"
        assert conv.platform_connection_id == conn.id

        result = await db_session.execute(
            select(Message).where(Message.conversation_id == conv.id)
        )
        msgs = result.scalars().all()
        assert len(msgs) >= 1
        inbound = [m for m in msgs if m.direction == "in"]
        outbound = [m for m in msgs if m.direction == "out"]
        assert len(inbound) == 1
        assert inbound[0].external_user_id == "573001234567"
        assert inbound[0].external_message_id == "wamid.custom"
        assert inbound[0].platform == "whatsapp"

        # Old wa_* fields should remain None when using new fields
        assert inbound[0].wa_user_id is None
        assert inbound[0].wa_message_id is None

        assert len(outbound) == 1
        assert outbound[0].external_user_id == "573001234567"
        assert outbound[0].platform == "whatsapp"
        assert outbound[0].status == "sent"

        # Verify WhatsAppAdapter was called with the right connection
        MockAdapter.assert_called_once()
        mock_adapter.send_message.assert_awaited_once_with(
            connection=conn,
            to="573001234567",
            text="AI response from mocked Groq",
        )
