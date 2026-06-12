"""Seed script — create initial agent templates.

Run once after ``alembic upgrade head``::

    uv run python -m app.seed
"""

from __future__ import annotations

import asyncio

from sqlalchemy import select

from app.db.models import AgentTemplate  # noqa: F401 — register model
from app.db.session import async_session_factory
from app.modules.agents.templates import SEED_TEMPLATES


async def seed() -> None:
    async with async_session_factory() as session:
        await _seed_templates(session)


async def _seed_templates(session) -> None:
    """Upsert seed templates by (category, name) — idempotent, re-runnable."""
    for tpl_data in SEED_TEMPLATES:
        result = await session.execute(
            select(AgentTemplate).where(
                AgentTemplate.category == tpl_data["category"],
                AgentTemplate.name == tpl_data["name"],
            )
        )
        existing = result.scalar_one_or_none()

        if not existing:
            template = AgentTemplate(**tpl_data)
            session.add(template)
            print(f"Template created: {tpl_data['name']} ({tpl_data['category']})")
        else:
            print(f"Template already exists: {tpl_data['name']} ({tpl_data['category']})")

    await session.commit()


if __name__ == "__main__":
    asyncio.run(seed())
