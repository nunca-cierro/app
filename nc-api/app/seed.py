"""Seed script — create the initial admin user.

Run once after ``alembic upgrade head``::

    uv run python -m app.seed
"""

from __future__ import annotations

import asyncio

from sqlalchemy import select

from app.core.config import settings
from app.db.models import (  # noqa: F401 — register all models for relationships
    User, UserTenant, Tenant, AgentTemplate,
)
from app.modules.auth.models import UserRole
from app.db.session import async_session_factory
from app.modules.auth.service import hash_password
from app.modules.agents.templates import SEED_TEMPLATES


async def seed() -> None:
    async with async_session_factory() as session:
        await _seed_admin(session)
        await _seed_templates(session)


async def _seed_admin(session) -> None:
    admin_email = "nuncacierro@gmail.com"
    admin_password = "nuncacierro*"
    admin_name = "Nunca Cierro"

    result = await session.execute(
        select(User).where(User.email == admin_email)
    )
    existing = result.scalar_one_or_none()

    if existing:
        if existing.role != UserRole.SUPERADMIN:
            existing.role = UserRole.SUPERADMIN
            await session.commit()
            print(f"User upgraded to SUPERADMIN: {admin_email}")
        else:
            print(f"Superadmin already exists: {admin_email}")
        return

    user = User(
        email=admin_email,
        password_hash=hash_password(admin_password),
        name=admin_name,
        role=UserRole.SUPERADMIN,
    )
    session.add(user)
    await session.commit()
    print(f"Superadmin user created: {admin_email}")


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
