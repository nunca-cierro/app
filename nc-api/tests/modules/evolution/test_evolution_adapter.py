"""Tests for EvolutionAdapter JID preservation (LID-number regression).

Production bug: WhatsApp contacts addressed via LID (e.g. ``201442656784510@lid``)
failed with ``400 [object Object]`` on both presence and sendText because the
handler stripped the JID suffix and sent the bare number. Evolution API v2.3.7
resolves bare numbers to ``@s.whatsapp.net``, finds the contact does NOT exist
there (it lives under ``@lid``), and rejects the request.

The fix: pass the full ``remoteJid`` (with suffix) straight through to Evolution.
"""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.modules.evolution.adapter import EvolutionAdapter


# ── Handler-level regression: full JID must reach the adapter ──────────────


class TestEvolutionHandlerPassesFullJid:
    """A LID message must trigger send_message with the FULL remoteJid.

    Regression for production bug: handler passed ``external_user_id``
    (suffix stripped) to the adapter, so Evolution resolved the bare LID
    number to ``@s.whatsapp.net`` and rejected it with 400.
    """

    @staticmethod
    def _lid_event() -> dict:
        return {
            "event": "messages.upsert",
            "instance": "conn-test",
            "data": {
                "key": {
                    "remoteJid": "201442656784510@lid",
                    "fromMe": False,
                    "id": "LIDMSG123",
                },
                "pushName": "Nicolas",
                "message": {"conversation": "Hola, buen día"},
                "messageType": "conversation",
            },
        }

    @pytest.mark.asyncio
    async def test_lid_message_sends_to_full_jid(
        self, client, db_session
    ) -> None:
        """send_message receives the full LID JID, not the stripped number."""
        from app.modules.evolution.handler import handle_evolution_incoming
        from app.modules.tenants.models import Tenant
        from app.modules.platform_connections.models import PlatformConnection
        from app.modules.agents.models import AiAgent

        tenant = Tenant(
            id=uuid.uuid4(),
            name="Test Co",
            slug=f"lid-test-{uuid.uuid4().hex[:6]}",
            plan="professional",
            timezone="America/Bogota",
            locale="es-CO",
        )
        db_session.add(tenant)
        await db_session.flush()

        agent = AiAgent(
            id=uuid.uuid4(),
            tenant_id=tenant.id,
            name="Agent",
            model="llama3-70b",
            enabled=True,
            business_config={},
        )
        db_session.add(agent)
        await db_session.flush()

        connection = PlatformConnection(
            tenant_id=tenant.id,
            agent_id=agent.id,
            platform_type="evolution",
            display_name="Test",
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
            mock_send.return_value = {"key": {"id": "mock-evo-id"}}
            with patch(
                "app.modules.evolution.handler.groq_client.generate",
                new_callable=AsyncMock,
            ) as mock_groq:
                mock_groq.return_value = "¡Hola! ¿En qué puedo ayudarte?"

                await handle_evolution_incoming(
                    event=self._lid_event(),
                    connection=connection,
                    session=db_session,
                )

        assert mock_send.await_count == 1
        sent_to = mock_send.call_args[1]["to"]
        assert sent_to == "201442656784510@lid"

    @pytest.mark.asyncio
    async def test_regular_jid_message_keeps_suffix(
        self, client, db_session
    ) -> None:
        """Regular ``@s.whatsapp.net`` JIDs are also passed with their suffix."""
        from app.modules.evolution.handler import handle_evolution_incoming
        from app.modules.tenants.models import Tenant
        from app.modules.platform_connections.models import PlatformConnection
        from app.modules.agents.models import AiAgent

        tenant = Tenant(
            id=uuid.uuid4(),
            name="Test Co",
            slug=f"jid-test-{uuid.uuid4().hex[:6]}",
            plan="professional",
            timezone="America/Bogota",
            locale="es-CO",
        )
        db_session.add(tenant)
        await db_session.flush()

        agent = AiAgent(
            id=uuid.uuid4(),
            tenant_id=tenant.id,
            name="Agent",
            model="llama3-70b",
            enabled=True,
            business_config={},
        )
        db_session.add(agent)
        await db_session.flush()

        connection = PlatformConnection(
            tenant_id=tenant.id,
            agent_id=agent.id,
            platform_type="evolution",
            display_name="Test",
            credentials="{}",
            status="active",
            is_primary=True,
        )
        db_session.add(connection)
        await db_session.commit()

        event = {
            "event": "messages.upsert",
            "instance": "conn-test",
            "data": {
                "key": {
                    "remoteJid": "573204368765@s.whatsapp.net",
                    "fromMe": False,
                    "id": "REGMSG123",
                },
                "pushName": "Lis",
                "message": {"conversation": "Hola."},
                "messageType": "conversation",
            },
        }

        with patch(
            "app.modules.evolution.handler.EvolutionAdapter.send_message",
            new_callable=AsyncMock,
        ) as mock_send:
            mock_send.return_value = {"key": {"id": "mock-evo-id"}}
            with patch(
                "app.modules.evolution.handler.groq_client.generate",
                new_callable=AsyncMock,
            ) as mock_groq:
                mock_groq.return_value = "¡Hola! ¿En qué puedo ayudarte?"

                await handle_evolution_incoming(
                    event=event,
                    connection=connection,
                    session=db_session,
                )

        assert mock_send.await_count == 1
        sent_to = mock_send.call_args[1]["to"]
        assert sent_to == "573204368765@s.whatsapp.net"


class TestEmptyLlmResponseGuard:
    """A blank LLM response must NOT be sent to Evolution (400 \"Text is required\").

    Production observation: Groq returned an empty string for one message and
    the outbound send failed with ``400 Text is required`` — the handler saved
    a ``failed`` outbound row with empty content and the customer got no reply.
    The handler must substitute a fallback so a send is always attempted.
    """

    @pytest.mark.asyncio
    async def test_empty_llm_response_uses_fallback(
        self, client, db_session
    ) -> None:
        from app.modules.evolution.handler import handle_evolution_incoming
        from app.modules.tenants.models import Tenant
        from app.modules.platform_connections.models import PlatformConnection
        from app.modules.agents.models import AiAgent
        from app.modules.conversations.models import Message
        from sqlalchemy import select as sa_select

        tenant = Tenant(
            id=uuid.uuid4(),
            name="Test Co",
            slug=f"empty-llm-{uuid.uuid4().hex[:6]}",
            plan="professional",
            timezone="America/Bogota",
            locale="es-CO",
        )
        db_session.add(tenant)
        await db_session.flush()

        agent = AiAgent(
            id=uuid.uuid4(),
            tenant_id=tenant.id,
            name="Agent",
            model="llama3-70b",
            enabled=True,
            business_config={},
        )
        db_session.add(agent)
        await db_session.flush()

        connection = PlatformConnection(
            tenant_id=tenant.id,
            agent_id=agent.id,
            platform_type="evolution",
            display_name="Test",
            credentials="{}",
            status="active",
            is_primary=True,
        )
        db_session.add(connection)
        await db_session.commit()

        event = {
            "event": "messages.upsert",
            "instance": "conn-test",
            "data": {
                "key": {
                    "remoteJid": "573204368765@s.whatsapp.net",
                    "fromMe": False,
                    "id": "EMPTYMSG123",
                },
                "pushName": "Lis",
                "message": {"conversation": "Hola."},
                "messageType": "conversation",
            },
        }

        with patch(
            "app.modules.evolution.handler.EvolutionAdapter.send_message",
            new_callable=AsyncMock,
        ) as mock_send:
            mock_send.return_value = {"key": {"id": "mock-evo-id"}}
            with patch(
                "app.modules.evolution.handler.groq_client.generate",
                new_callable=AsyncMock,
            ) as mock_groq:
                # LLM returns blank content — the real production failure
                mock_groq.return_value = "   "

                await handle_evolution_incoming(
                    event=event,
                    connection=connection,
                    session=db_session,
                )

        # A send was still attempted with a NON-EMPTY fallback text
        assert mock_send.await_count == 1
        sent_text = mock_send.call_args[1]["text"]
        assert sent_text.strip() != ""

        # Outbound row content is non-empty
        result = await db_session.execute(
            sa_select(Message).where(
                Message.platform_connection_id == connection.id,
                Message.direction == "out",
            )
        )
        msgs = result.scalars().all()
        assert len(msgs) == 1
        assert msgs[0].content.strip() != ""


class TestEvolutionAdapterPreservesJid:
    """The adapter must send ``to`` exactly as received (full JID, suffix included)."""

    def _make_connection(self, **kwargs) -> MagicMock:
        from app.core.encryption import encrypt
        from app.modules.platform_connections.models import PlatformConnection

        creds = {
            "base_url": "http://evolution.local:8080",
            "api_key": "test-api-key",
            "instance_name": "test-instance",
        }
        conn = PlatformConnection(
            id=uuid.uuid4(),
            tenant_id=uuid.uuid4(),
            platform_type="evolution",
            display_name="Test",
            credentials=encrypt(creds),
            status="active",
            **kwargs,
        )
        return conn

    def _mock_client(self, statuses: list[int] | None = None) -> tuple[AsyncMock, list[MagicMock]]:
        """Return (client, responses) with post() returning a success by default."""
        client = AsyncMock()
        responses = []
        for _ in (statuses or [200, 201]):
            resp = MagicMock()
            resp.is_success = True
            resp.status_code = 200
            resp.json.return_value = {"key": {"id": "mock-msg-123"}, "status": "PENDING"}
            responses.append(resp)
        client.post.side_effect = responses
        return client, responses

    @pytest.mark.asyncio
    async def test_presence_payload_keeps_lid_suffix(self) -> None:
        """Presence request must use the full JID for a LID contact."""
        conn = self._make_connection()
        client, _ = self._mock_client()

        with patch("app.modules.evolution.adapter.httpx") as mock_httpx:
            mock_httpx.AsyncClient.return_value.__aenter__.return_value = client
            await EvolutionAdapter().send_message(
                conn, "201442656784510@lid", "Hola"
            )

        presence_call = client.post.call_args_list[0]
        assert "/chat/sendPresence/test-instance" in presence_call.args[0]
        assert presence_call.kwargs["json"]["number"] == "201442656784510@lid"
        assert presence_call.kwargs["json"]["presence"] == "composing"
        assert presence_call.kwargs["json"]["delay"] > 0

    @pytest.mark.asyncio
    async def test_send_text_payload_keeps_lid_suffix(self) -> None:
        """sendText request must use the full JID for a LID contact."""
        conn = self._make_connection()
        client, _ = self._mock_client()

        with patch("app.modules.evolution.adapter.httpx") as mock_httpx:
            mock_httpx.AsyncClient.return_value.__aenter__.return_value = client
            await EvolutionAdapter().send_message(
                conn, "201442656784510@lid", "Hola"
            )

        text_call = client.post.call_args_list[1]
        assert "/message/sendText/test-instance" in text_call.args[0]
        assert text_call.kwargs["json"]["number"] == "201442656784510@lid"
        assert text_call.kwargs["json"]["text"] == "Hola"

    @pytest.mark.asyncio
    async def test_presence_payload_keeps_regular_jid_suffix(self) -> None:
        """Regular JID (``@s.whatsapp.net``) must also pass through unchanged."""
        conn = self._make_connection()
        client, _ = self._mock_client()

        with patch("app.modules.evolution.adapter.httpx") as mock_httpx:
            mock_httpx.AsyncClient.return_value.__aenter__.return_value = client
            await EvolutionAdapter().send_message(
                conn, "573204368765@s.whatsapp.net", "Hola"
            )

        presence_call = client.post.call_args_list[0]
        assert presence_call.kwargs["json"]["number"] == "573204368765@s.whatsapp.net"

    @pytest.mark.asyncio
    async def test_presence_failure_is_non_fatal(self) -> None:
        """Presence 400 must NOT block the text message send."""
        conn = self._make_connection()

        presence_resp = MagicMock()
        presence_resp.is_success = False
        presence_resp.status_code = 400
        presence_resp.text = '{"status":400,"response":{"message":["[object Object]"]}}'

        text_resp = MagicMock()
        text_resp.is_success = True
        text_resp.status_code = 201
        text_resp.json.return_value = {"key": {"id": "mock-msg-456"}}

        client = AsyncMock()
        client.post.side_effect = [presence_resp, text_resp]

        with patch("app.modules.evolution.adapter.httpx") as mock_httpx:
            mock_httpx.AsyncClient.return_value.__aenter__.return_value = client
            result = await EvolutionAdapter().send_message(
                conn, "201442656784510@lid", "Hola"
            )

        # Text message still went out despite presence 400
        assert client.post.call_count == 2
        assert result["key"]["id"] == "mock-msg-456"
