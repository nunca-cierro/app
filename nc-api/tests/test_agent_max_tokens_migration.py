"""Tests for the agent max_tokens data migration (c2d3e4f5a6b7).

conftest never runs alembic — tests execute the migration's own SQL
statements against a real Postgres test database (same replay approach as
test_agent_model_migration.py for b1c2d3e4f5a6, but importing the
migration's SQL objects directly so the test cannot drift from the
revision it guards).

Covers R8: selective update (only 512 → 1024), idempotency (run twice),
and downgrade restore.
"""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy import select

from app.db.migrations.versions.c2d3e4f5a6b7_bump_agent_max_tokens_to_1024 import (  # noqa: E501
    _DOWNGRADE_SQL,
    _UPGRADE_SQL,
    NEW_DEFAULT,
    OLD_DEFAULT,
)
from app.modules.agents.models import AiAgent
from app.modules.tenants.models import Tenant


async def _seed_agent(db_session, max_tokens: int) -> AiAgent:
    tenant = Tenant(
        id=uuid.uuid4(), name="T", slug=f"t-{uuid.uuid4().hex[:6]}",
        status="active", plan="professional", timezone="UTC", locale="es",
    )
    db_session.add(tenant)
    await db_session.flush()
    agent = AiAgent(
        id=uuid.uuid4(), tenant_id=tenant.id, name="A",
        provider="groq", model="openai/gpt-oss-120b", temperature=0,
        max_tokens=max_tokens,
    )
    db_session.add(agent)
    await db_session.flush()
    return agent


async def _fetch_max_tokens(db_session, agent_id: uuid.UUID) -> int:
    result = await db_session.execute(
        select(AiAgent.max_tokens).where(AiAgent.id == agent_id)
    )
    return result.scalar_one()


class TestMaxTokensMigration:
    """Executes the exact SQL of alembic revision c2d3e4f5a6b7."""

    @pytest.mark.asyncio
    async def test_selective_update_preserves_non_512(self, db_session) -> None:
        legacy = await _seed_agent(db_session, 512)
        custom = await _seed_agent(db_session, 768)

        await db_session.execute(
            _UPGRADE_SQL, {"old": OLD_DEFAULT, "new": NEW_DEFAULT}
        )
        await db_session.commit()

        assert await _fetch_max_tokens(db_session, legacy.id) == 1024
        assert await _fetch_max_tokens(db_session, custom.id) == 768

    @pytest.mark.asyncio
    async def test_migration_is_idempotent(self, db_session) -> None:
        legacy = await _seed_agent(db_session, 512)

        for _ in range(2):
            await db_session.execute(
                _UPGRADE_SQL, {"old": OLD_DEFAULT, "new": NEW_DEFAULT}
            )
        await db_session.commit()

        assert await _fetch_max_tokens(db_session, legacy.id) == 1024

    @pytest.mark.asyncio
    async def test_downgrade_restores_512(self, db_session) -> None:
        legacy = await _seed_agent(db_session, 512)

        await db_session.execute(
            _UPGRADE_SQL, {"old": OLD_DEFAULT, "new": NEW_DEFAULT}
        )
        await db_session.execute(
            _DOWNGRADE_SQL, {"old": OLD_DEFAULT, "new": NEW_DEFAULT}
        )
        await db_session.commit()

        assert await _fetch_max_tokens(db_session, legacy.id) == 512
