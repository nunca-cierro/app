"""Tests for the legacy provider/model default transition (Slice 2).

Covers the data migration ``c0d1e2f3a4b5`` (llm-multi-provider):

1. Rows storing the legacy default (``provider='groq'`` with model
   ``openai/gpt-oss-120b`` or ``openai/gpt-oss-20b``) are rewritten to the
   new default ``openai``/``gpt-4o-mini``.
2. Rows with a genuinely custom Groq model are left untouched (dormant — the
   runtime routes them to the active default with a warning).
3. The migration is idempotent and reversible: downgrade restores the legacy
   default for rows holding the new default.

The SQL is imported from the migration module itself (single source of truth)
and replayed against the test DB — same pattern as ``test_agent_model_migration.py``.
"""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy import select

from app.db.migrations.versions.c0d1e2f3a4b5_llm_multi_provider_defaults import (
    _DOWNGRADE_SQL,
    _UPGRADE_SQL,
    LEGACY_GROQ_DEFAULT_MODELS,
)
from app.modules.agents.models import AiAgent
from app.modules.tenants.models import Tenant

NEW_DEFAULT_PROVIDER = "openai"
NEW_DEFAULT_MODEL = "gpt-4o-mini"
LEGACY_PROVIDER = "groq"
CUSTOM_GROQ_MODEL = "qwen/qwen3.6-27b"
CUSTOM_OPENAI_MODEL = "gpt-4o"


async def _seed_agent(db_session, *, provider: str, model: str) -> AiAgent:
    tenant = Tenant(
        id=uuid.uuid4(), name="T", slug=f"t-{uuid.uuid4().hex[:6]}",
        status="active", plan="professional", timezone="UTC", locale="es",
    )
    db_session.add(tenant)
    await db_session.flush()
    agent = AiAgent(
        id=uuid.uuid4(), tenant_id=tenant.id, name="A",
        provider=provider, model=model, temperature=0, max_tokens=512,
    )
    db_session.add(agent)
    await db_session.flush()
    return agent


async def _fetch(db_session, agent: AiAgent) -> AiAgent:
    """Refetch an agent, refreshing the ORM identity map after raw SQL."""
    result = await db_session.execute(
        select(AiAgent)
        .where(AiAgent.id == agent.id)
        .execution_options(populate_existing=True)
    )
    return result.scalar_one()


class TestDataMigration:
    """Replay of the c0d1e2f3a4b5 migration SQL against a seeded DB."""

    @pytest.mark.asyncio
    async def test_legacy_default_rows_rewritten_to_openai_default(self, db_session) -> None:
        legacy = [
            await _seed_agent(db_session, provider=LEGACY_PROVIDER, model=m)
            for m in LEGACY_GROQ_DEFAULT_MODELS
        ]
        await db_session.commit()

        await db_session.execute(_UPGRADE_SQL)
        await db_session.commit()

        for agent in legacy:
            row = await _fetch(db_session, agent)
            assert row.provider == NEW_DEFAULT_PROVIDER
            assert row.model == NEW_DEFAULT_MODEL

    @pytest.mark.asyncio
    async def test_custom_groq_rows_stay_dormant(self, db_session) -> None:
        custom = await _seed_agent(
            db_session, provider=LEGACY_PROVIDER, model=CUSTOM_GROQ_MODEL
        )
        await db_session.commit()

        await db_session.execute(_UPGRADE_SQL)
        await db_session.commit()

        row = await _fetch(db_session, custom)
        assert row.provider == LEGACY_PROVIDER
        assert row.model == CUSTOM_GROQ_MODEL

    @pytest.mark.asyncio
    async def test_migration_is_idempotent(self, db_session) -> None:
        legacy = await _seed_agent(
            db_session, provider=LEGACY_PROVIDER, model=LEGACY_GROQ_DEFAULT_MODELS[0]
        )
        await db_session.commit()

        first = await db_session.execute(_UPGRADE_SQL)
        await db_session.commit()
        assert getattr(first, "rowcount", None) == 1

        second = await db_session.execute(_UPGRADE_SQL)
        await db_session.commit()
        assert getattr(second, "rowcount", None) == 0

        row = await _fetch(db_session, legacy)
        assert row.provider == NEW_DEFAULT_PROVIDER
        assert row.model == NEW_DEFAULT_MODEL

    @pytest.mark.asyncio
    async def test_downgrade_restores_legacy_default(self, db_session) -> None:
        rewritten = await _seed_agent(
            db_session, provider=NEW_DEFAULT_PROVIDER, model=NEW_DEFAULT_MODEL
        )
        custom_openai = await _seed_agent(
            db_session, provider=NEW_DEFAULT_PROVIDER, model=CUSTOM_OPENAI_MODEL
        )
        await db_session.commit()

        await db_session.execute(_DOWNGRADE_SQL)
        await db_session.commit()

        legacy_row = await _fetch(db_session, rewritten)
        assert legacy_row.provider == LEGACY_PROVIDER
        assert legacy_row.model == LEGACY_GROQ_DEFAULT_MODELS[0]

        custom_row = await _fetch(db_session, custom_openai)
        assert custom_row.provider == NEW_DEFAULT_PROVIDER
        assert custom_row.model == CUSTOM_OPENAI_MODEL
