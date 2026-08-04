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
from app.modules.agents.templates import SEED_TEMPLATES, unknown_placeholders


async def seed(reset: bool = False) -> None:
    async with async_session_factory() as session:
        if reset:
            await _reset_system_templates(session)
            await session.commit()
            print("✓ System templates deleted — re-seeding from scratch")
        await _seed_templates(session)
        await _prune_system_templates(session)


async def _seed_templates(session) -> None:
    """Upsert system templates without ever modifying custom templates.

    There is intentionally no database uniqueness constraint on ``(category,
    name)`` because custom templates are user-owned data. If an older database
    contains duplicate system rows, keep the oldest row and remove only the
    extra system rows for that seed key.
    """
    for tpl_data in SEED_TEMPLATES:
        unknown = unknown_placeholders(tpl_data["content"])
        if unknown:
            raise ValueError(
                f"Template {tpl_data['name']!r} uses unknown placeholders: "
                f"{', '.join(sorted(unknown))}"
            )

        result = await session.execute(
            select(AgentTemplate).where(
                AgentTemplate.category == tpl_data["category"],
                AgentTemplate.name == tpl_data["name"],
                AgentTemplate.is_system.is_(True),
            ).order_by(
                AgentTemplate.created_at,
                AgentTemplate.id,
            )
        )
        matches = list(result.scalars().all())
        existing = matches[0] if matches else None

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

            for duplicate in matches[1:]:
                await session.delete(duplicate)
                print(
                    f"✗ Removed duplicate system template: "
                    f"{duplicate.name} ({duplicate.category})"
                )

    await session.commit()


async def _reset_system_templates(session) -> None:
    """Remove only seeded/system templates; custom templates are protected."""
    await session.execute(
        delete(AgentTemplate).where(AgentTemplate.is_system.is_(True))
    )


async def _prune_system_templates(session) -> None:
    """Delete SYSTEM templates that are no longer part of SEED_TEMPLATES.

    - Only ``is_system=True`` rows are eligible — custom templates created by
      clients (``is_system=False``) are NEVER deleted.
    - Idempotent: running it twice deletes nothing the second time.
    - This is what removed the old emoji/plain duplicate pairs on existing
      databases: the plain variants are not in SEED_TEMPLATES anymore, so a
      normal ``uv run python -m app.seed`` deletes them.

    To remove a category: remove its template from SEED_TEMPLATES and run the
    seed — the system template is pruned; any custom templates, agents and
    tenants in that category keep working untouched.
    """
    seed_keys = {(t["category"], t["name"]) for t in SEED_TEMPLATES}
    result = await session.execute(
        select(AgentTemplate).where(AgentTemplate.is_system.is_(True))
    )
    stale = [t for t in result.scalars().all() if (t.category, t.name) not in seed_keys]

    for template in stale:
        await session.delete(template)
        print(f"✗ Pruned stale system template: {template.name} ({template.category})")

    if stale:
        await session.commit()


if __name__ == "__main__":
    reset = "--reset" in sys.argv
    asyncio.run(seed(reset=reset))
