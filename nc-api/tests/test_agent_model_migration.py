"""Tests for the deprecated-agent-model transition (C2).

Covers:
1. Data migration logic: only rows storing an EXACT deprecated/retired Groq
   model id are rewritten to the new default; custom models are never
   touched. Idempotent + reversible.
2. Runtime defense: the LLM provider routes ANY deprecated model id to the
   configured default at call time, while custom models pass through.
"""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy import select, text

from app.core.config import DEFAULT_GROQ_MODEL, DEPRECATED_GROQ_MODELS, settings
from app.modules.agents.models import AiAgent
from app.modules.tenants.models import Tenant

# Same SQL the alembic migration b1c2d3e4f5a6 executes (kept in sync with
# DEPRECATED_GROQ_MODELS so the test guards the migration's hardcoded list).
_DEPRECATED_LITERAL = "', '".join(DEPRECATED_GROQ_MODELS)
MIGRATION_UPGRADE_SQL = (
    f"UPDATE ai_agents SET model = :new WHERE model IN ('{_DEPRECATED_LITERAL}')"
)
MIGRATION_DOWNGRADE_SQL = (
    "UPDATE ai_agents SET model = :old WHERE model = :new"
)


async def _seed_agent(db_session, model: str) -> AiAgent:
    tenant = Tenant(
        id=uuid.uuid4(), name="T", slug=f"t-{uuid.uuid4().hex[:6]}",
        status="active", plan="professional", timezone="UTC", locale="es",
    )
    db_session.add(tenant)
    await db_session.flush()
    agent = AiAgent(
        id=uuid.uuid4(), tenant_id=tenant.id, name="A",
        provider="groq", model=model, temperature=0, max_tokens=512,
    )
    db_session.add(agent)
    await db_session.flush()
    return agent


class TestDataMigration:
    """Same SQL the alembic migration b1c2d3e4f5a6 executes."""

    @pytest.mark.asyncio
    async def test_all_deprecated_models_are_rewritten(self, db_session) -> None:
        deprecated = [await _seed_agent(db_session, m) for m in DEPRECATED_GROQ_MODELS]
        custom = await _seed_agent(db_session, "gpt-4o")
        fresh = await _seed_agent(db_session, DEFAULT_GROQ_MODEL)

        await db_session.execute(text(MIGRATION_UPGRADE_SQL), {"new": DEFAULT_GROQ_MODEL})
        await db_session.commit()
        # populate_existing refreshes identity-map objects (async-safe)
        result = await db_session.execute(
            select(AiAgent)
            .where(AiAgent.id.in_([a.id for a in deprecated] + [custom.id, fresh.id]))
            .execution_options(populate_existing=True)
        )
        by_id = {a.id: a.model for a in result.scalars().all()}
        for agent in deprecated:
            assert by_id[agent.id] == DEFAULT_GROQ_MODEL, f"{agent.model} not migrated"
        assert by_id[custom.id] == "gpt-4o"          # custom untouched
        assert by_id[fresh.id] == DEFAULT_GROQ_MODEL  # already default

    @pytest.mark.asyncio
    async def test_migration_is_idempotent(self, db_session) -> None:
        deprecated = await _seed_agent(db_session, DEPRECATED_GROQ_MODELS[0])
        for _ in range(2):
            await db_session.execute(text(MIGRATION_UPGRADE_SQL), {"new": DEFAULT_GROQ_MODEL})
        await db_session.commit()
        result = await db_session.execute(
            select(AiAgent)
            .where(AiAgent.id == deprecated.id)
            .execution_options(populate_existing=True)
        )
        assert result.scalar_one().model == DEFAULT_GROQ_MODEL

    @pytest.mark.asyncio
    async def test_downgrade_restores_deprecated_value(self, db_session) -> None:
        agent = await _seed_agent(db_session, DEFAULT_GROQ_MODEL)
        await db_session.execute(
            text(MIGRATION_DOWNGRADE_SQL),
            {"old": DEPRECATED_GROQ_MODELS[0], "new": DEFAULT_GROQ_MODEL},
        )
        await db_session.commit()
        result = await db_session.execute(
            select(AiAgent)
            .where(AiAgent.id == agent.id)
            .execution_options(populate_existing=True)
        )
        assert result.scalar_one().model == DEPRECATED_GROQ_MODELS[0]


class _FakeUsage:
    total_tokens = 10


class _FakeMessage:
    content = "hi"


class _FakeChoice:
    message = _FakeMessage()


class _FakeCompletion:
    choices = [_FakeChoice()]
    usage = _FakeUsage()


class TestRuntimeDefense:
    """provider.generate() routes deprecated model ids to the default."""

    async def _generate(self, model):
        from app.modules.integrations.llm.provider import groq_client

        mock_client = MagicMock()
        mock_client.chat.completions.create = AsyncMock(return_value=_FakeCompletion())
        with patch.object(groq_client, "_client", mock_client):
            await groq_client.generate("sys", "user", model=model)
        return mock_client.chat.completions.create.call_args.kwargs["model"]

    @pytest.mark.asyncio
    @pytest.mark.parametrize("deprecated", DEPRECATED_GROQ_MODELS)
    async def test_every_deprecated_model_routed_to_default(self, deprecated) -> None:
        used = await self._generate(deprecated)
        assert used == settings.groq_model  # the configured default

    @pytest.mark.asyncio
    async def test_custom_model_passes_through(self) -> None:
        used = await self._generate("gpt-4o")
        assert used == "gpt-4o"

    @pytest.mark.asyncio
    async def test_none_model_uses_default(self) -> None:
        used = await self._generate(None)
        assert used == settings.groq_model
