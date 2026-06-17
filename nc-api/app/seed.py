"""Seed script — create/update initial agent templates.

Run once after ``alembic upgrade head``::

    uv run python -m app.seed

To delete all templates and re-seed from scratch::

    uv run python -m app.seed --reset
"""

from __future__ import annotations

import asyncio
import sys

from sqlalchemy import delete, select

from app.db.models import AgentTemplate  # noqa: F401 — register model
from app.db.session import async_session_factory
from app.modules.agents.templates import SEED_TEMPLATES


async def seed(reset: bool = False) -> None:
    async with async_session_factory() as session:
        if reset:
            await session.execute(delete(AgentTemplate))
            await session.commit()
            print("✓ All templates deleted — re-seeding from scratch")
        await _seed_templates(session)


async def _seed_templates(session) -> None:
    """Upsert seed templates by (category, name) — updates content if changed."""
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
            print(f"✓ Template created: {tpl_data['name']} ({tpl_data['category']})")
        else:
            # Update existing template with latest seed content
            changed = False
            for key, value in tpl_data.items():
                if getattr(existing, key) != value:
                    setattr(existing, key, value)
                    changed = True
            if changed:
                print(f"✓ Template updated: {tpl_data['name']} ({tpl_data['category']})")
            else:
                print(f"  Template unchanged: {tpl_data['name']} ({tpl_data['category']})")

    await session.commit()


if __name__ == "__main__":
    reset = "--reset" in sys.argv
    asyncio.run(seed(reset=reset))
