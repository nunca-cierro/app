"""Seed script — create/update initial agent templates.

Run once after ``alembic upgrade head``::

    uv run python -m app.seed

To delete all templates and re-seed from scratch::

    uv run python -m app.seed --reset
"""

from __future__ import annotations

import asyncio
import sys
import uuid

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
        await bootstrap_platform_integrity(session)


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


async def bootstrap_platform_integrity(session) -> tuple[int, int]:
    """Self-heal role / primary-association corruption (idempotent).

    Repairs the fallout of a prod incident where tenant creation downgraded a
    global superadmin's ``users.role`` and could leave duplicate primary
    associations (which made login fail with MultipleResultsFound → 500):

    1. Platform operator restore: any user holding an admin/superadmin
       membership on the internal tenant must have ``users.role=superadmin``.
    2. Single-primary invariant: each user keeps at most ONE
       ``is_primary=True`` UserTenant — duplicates beyond the oldest are
       demoted to False.

    Safe to run repeatedly: a second run changes nothing and returns zeros.
    Returns ``(users_elevated, primaries_demoted)``.
    """
    from loguru import logger

    from app.core.config import settings
    from app.modules.auth.models import User, UserRole
    from app.modules.auth.user_tenant import UserTenant
    from app.modules.tenants.models import Tenant

    # ── 1. Restore the platform operator from internal-tenant memberships ──
    elevated = 0
    if settings.internal_tenant_slug:
        result = await session.execute(
            select(UserTenant, User)
            .join(Tenant, UserTenant.tenant_id == Tenant.id)
            .join(User, UserTenant.user_id == User.id)
            .where(
                Tenant.slug == settings.internal_tenant_slug,
                UserTenant.role.in_(
                    [UserRole.ADMIN.value, UserRole.SUPERADMIN.value]
                ),
            )
        )
        for _, user in result.all():
            if user.role != UserRole.SUPERADMIN.value:
                user.role = UserRole.SUPERADMIN
                elevated += 1

    # ── 2. Demote duplicate primaries globally — keep the oldest per user ──
    demoted = 0
    result = await session.execute(
        select(UserTenant)
        .where(UserTenant.is_primary.is_(True))
        .order_by(UserTenant.user_id, UserTenant.created_at, UserTenant.tenant_id)
    )
    primaries_by_user: dict[uuid.UUID, list] = {}
    for ut in result.scalars().all():
        primaries_by_user.setdefault(ut.user_id, []).append(ut)
    for rows in primaries_by_user.values():
        for stale in rows[1:]:
            stale.is_primary = False
            demoted += 1

    if elevated or demoted:
        await session.commit()

    logger.info(
        "Seed bootstrap: elevated {elevated} internal-tenant operator(s) to "
        "superadmin, demoted {demoted} duplicate primary association(s)",
        elevated=elevated,
        demoted=demoted,
    )
    return elevated, demoted


if __name__ == "__main__":
    reset = "--reset" in sys.argv
    asyncio.run(seed(reset=reset))
