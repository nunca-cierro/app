"""Preflight — detect duplicate messages BEFORE the dedup constraint.

Run this BEFORE `alembic upgrade head` when the migration
`a1b2c3d4e5f6` (unique constraint uq_messages_conn_external_msg on
(platform_connection_id, external_message_id)) is pending. That migration
ABORTS if duplicate groups exist; this script reports them so an operator
can resolve them explicitly. It NEVER deletes or rewrites data.

Usage::

    uv run python -m scripts.preflight_messages_dedup
    docker compose exec nc-api uv run python -m scripts.preflight_messages_dedup

Exit codes: 0 = no duplicates (safe to upgrade) | 1 = duplicates found.
"""

from __future__ import annotations

import asyncio

from sqlalchemy import text

from app.db.session import async_session_factory

DUP_QUERY = text(
    """
    SELECT platform_connection_id, external_message_id, COUNT(*) AS n
    FROM messages
    WHERE external_message_id IS NOT NULL
    GROUP BY platform_connection_id, external_message_id
    HAVING COUNT(*) > 1
    ORDER BY n DESC
    """
)

RESOLUTION_HINT = (
    "Resuelve los grupos manualmente ANTES de aplicar la migración:\n"
    "  SELECT platform_connection_id, external_message_id, id, created_at, direction\n"
    "  FROM messages\n"
    "  WHERE platform_connection_id = :conn AND external_message_id = :msg\n"
    "  ORDER BY created_at;\n"
    "Conserva la fila correcta (normalmente la más antigua) y elimina/archiva el\n"
    "resto de forma explícita. NO borres a ciegas y nunca ejecutes un DELETE global.\n"
    "Después, re-corre este preflight y `alembic upgrade head`."
)


async def main() -> int:
    async with async_session_factory() as session:
        rows = (await session.execute(DUP_QUERY)).all()

    if not rows:
        print("OK: no duplicate (platform_connection_id, external_message_id) groups found.")
        print("Safe to run: alembic upgrade head")
        return 0

    print(f"WARNING: {len(rows)} duplicate group(s) found — the dedup constraint will ABORT.")
    print("")
    for r in rows[:20]:
        print(f"  conn={r[0]} | external_message_id={r[1]} | rows={r[2]}")
    if len(rows) > 20:
        print(f"  ... and {len(rows) - 20} more group(s)")
    print("")
    print(RESOLUTION_HINT)
    return 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
