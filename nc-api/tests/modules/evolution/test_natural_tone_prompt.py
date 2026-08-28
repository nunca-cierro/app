"""Tests for the natural-tone prompt wiring in the Evolution handler.

Covers:
- The first-message hint is SUBORDINATE to business instructions.
- universal_format_block() is appended at the end of the AI system prompt.
- Business instructions appear before the universal fallbacks.
"""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.agents.utils import universal_format_block
from app.modules.evolution.handler import handle_evolution_incoming


async def _make_tenant_agent_connection(
    db_session: AsyncSession,
    business_config: dict | None,
) -> tuple:
    """Create tenant (professional plan) + enabled agent + linked Evolution connection."""
    from app.modules.agents.models import AiAgent
    from app.modules.platform_connections.models import PlatformConnection
    from app.modules.tenants.models import Tenant

    tenant = Tenant(
        id=uuid.uuid4(),
        name="Test Co",
        slug=f"tone-test-{uuid.uuid4().hex[:6]}",
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
        business_config=business_config or {},
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
    return tenant, connection


def _make_event(text: str) -> dict:
    """Build an Evolution API webhook event with a text message."""
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
            "message": {"conversation": text},
            "messageType": "conversation",
        },
    }


async def _capture_system_prompt(
    db_session: AsyncSession,
    connection,
    text: str = "Hola",
) -> str:
    """Run the handler on *text* and return the system_prompt sent to the LLM."""
    with patch(
        "app.modules.evolution.handler.EvolutionAdapter.send_message",
        new_callable=AsyncMock,
    ) as mock_send:
        mock_send.return_value = {"key": {"id": "mock-evo-id"}}
        with patch(
            "app.modules.evolution.handler.groq_client.generate",
            new_callable=AsyncMock,
        ) as mock_groq:
            mock_groq.return_value = "Respuesta."
            await handle_evolution_incoming(
                event=_make_event(text),
                connection=connection,
                session=db_session,
            )
            assert mock_groq.await_count == 1
            return mock_groq.call_args.kwargs["system_prompt"]


class TestNaturalTonePrompt:
    """System prompt wiring: business instructions first, universal fallbacks last."""

    @pytest.mark.asyncio
    async def test_hint_defers_to_business_instructions(
        self, db_session: AsyncSession
    ) -> None:
        """First-message hint is subordinate and business instructions win."""
        instructions = "No te presentes. Responde directo al punto."
        _, connection = await _make_tenant_agent_connection(
            db_session,
            {"instructions": instructions},
        )

        prompt = await _capture_system_prompt(db_session, connection)

        # Subordinate hint wording present (new contract).
        assert "Si las instrucciones del negocio no indican otra cosa" in prompt
        assert "sigue las instrucciones del negocio" in prompt
        assert "asistente de Test Co" in prompt

        # Old imperative hint is gone.
        assert "PRIMER mensaje" not in prompt
        assert "bienvenida" not in prompt

        # Business instructions present and take precedence by position.
        assert instructions in prompt
        universal_block = universal_format_block()
        assert universal_block in prompt
        assert prompt.index("=== INSTRUCCIONES ===") < prompt.index(universal_block)

    @pytest.mark.asyncio
    async def test_universal_block_appended_with_empty_config(
        self, db_session: AsyncSession
    ) -> None:
        """Even with no business_config, the universal block closes the prompt."""
        _, connection = await _make_tenant_agent_connection(db_session, {})

        prompt = await _capture_system_prompt(db_session, connection)

        assert prompt.strip().endswith(universal_format_block())
        assert "Si las instrucciones del negocio no indican otra cosa" in prompt
