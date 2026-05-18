"""Seed script — create the initial admin user.

Run once after ``alembic upgrade head``::

    uv run python -m app.seed
"""

from __future__ import annotations

import asyncio

from sqlalchemy import select

from app.core.config import settings
from app.db.session import async_session_factory
from app.modules.auth.models import User
from app.modules.auth.service import hash_password


async def seed() -> None:
    admin_email = "nuncacierro@gmail.com"
    admin_password = "nuncacierro123*"
    admin_name = "NuncaCierro"

    async with async_session_factory() as session:
        result = await session.execute(
            select(User).where(User.email == admin_email)
        )
        existing = result.scalar_one_or_none()

        if existing:
            print(f"Admin user already exists: {admin_email}")
            return

        user = User(
            email=admin_email,
            password_hash=hash_password(admin_password),
            name=admin_name,
        )
        session.add(user)
        await session.commit()
        print(f"Admin user created: {admin_email}")


if __name__ == "__main__":
    asyncio.run(seed())
