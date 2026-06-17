"""One-shot script to promote a user to superadmin.

Usage:

    docker compose exec nc-api python -m scripts.make_superadmin <email>

Or locally:

    uv run python -m scripts.make_superadmin <email>
"""

from __future__ import annotations

import asyncio
import sys

from sqlalchemy import select

from app.db.session import async_session_factory
import app.db.models  # noqa: F401 — register all models


async def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python -m scripts.make_superadmin <email>")
        sys.exit(1)

    email = sys.argv[1]

    async with async_session_factory() as session:
        from app.modules.auth.models import User, UserRole

        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if not user:
            print(f"❌ Usuario con email '{email}' no encontrado.")
            sys.exit(1)

        if user.role == UserRole.SUPERADMIN:
            print(f"⚠️  {email} ya es superadmin.")
            return

        user.role = UserRole.SUPERADMIN
        await session.commit()
        print(f"✅ {email} ahora es superadmin.")
        print("   Refrescá la página del dashboard para ver los cambios.")


if __name__ == "__main__":
    asyncio.run(main())
