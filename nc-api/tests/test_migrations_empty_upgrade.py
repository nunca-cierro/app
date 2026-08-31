"""Verify the full Alembic chain upgrades an EMPTY schema to head.

Regression guard for ``e4b0ad82cba2`` (drop_auto_replies_table): that
migration drops a legacy table that is never created by this migration
chain, so from an empty database a plain ``DROP INDEX`` / ``DROP TABLE``
failed. The upgrade is now idempotent (``IF EXISTS``); this test proves the
whole chain still reaches head from scratch.

The test provisions its OWN scratch database (``<test_db>_migr``, derived
from the test DB URL) so it never touches the metadata-created
``nuncacierro_test`` database used by the rest of the suite. It requires a
local PostgreSQL server — the same prerequisite as the rest of the suite
(see tests/conftest.py).
"""

from __future__ import annotations

import asyncio
import os
import urllib.parse
import uuid
from pathlib import Path

import asyncpg
import pytest
from alembic import command
from alembic.config import Config

from app.core.config import settings

ALEMBIC_INI = Path(__file__).resolve().parents[1] / "alembic.ini"
# Single head — keep in sync with `alembic heads` output.
HEAD_REVISION = "d5e6f7a8b9c0"
# Revision right before the drop_agent_role data migration.
PRE_DROP_AGENT_REVISION = "c2d3e4f5a6b7"


def _migration_db_url(suffix: str = "_migr") -> str:
    """Derive a dedicated scratch DB URL (never the suite's test DB)."""
    env_url = (
        os.environ.get("TEST_DATABASE_URL")
        or settings.test_database_url
        or settings.database_url
    )
    base = env_url.replace("+asyncpg", "")
    parsed = urllib.parse.urlparse(base)
    db_name = parsed.path.lstrip("/")
    scratch = f"{db_name}{suffix}"
    new_parsed = parsed._replace(path=f"/{scratch}")
    url = urllib.parse.urlunparse(new_parsed)
    if "+asyncpg" in env_url:
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


def _conn_params(url: str) -> dict[str, object]:
    parsed = urllib.parse.urlparse(url.replace("+asyncpg", ""))
    return {
        "host": parsed.hostname or "localhost",
        "port": parsed.port or 5432,
        "user": parsed.username or "postgres",
        "password": parsed.password or "",
    }


def _db_name(url: str) -> str:
    return urllib.parse.urlparse(url.replace("+asyncpg", "")).path.lstrip("/")


async def _drop_database(params: dict[str, object], db_name: str) -> None:
    conn = await asyncpg.connect(database="postgres", **params)
    try:
        await conn.execute(f'DROP DATABASE IF EXISTS "{db_name}"')
    finally:
        await conn.close()


async def _create_database(params: dict[str, object], db_name: str) -> None:
    conn = await asyncpg.connect(database="postgres", **params)
    try:
        exists = await conn.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = $1", db_name
        )
        if not exists:
            await conn.execute(f'CREATE DATABASE "{db_name}"')
    finally:
        await conn.close()


def test_upgrade_empty_schema_to_head(monkeypatch: pytest.MonkeyPatch) -> None:
    """alembic upgrade head succeeds from scratch and leaves the expected schema."""
    url = _migration_db_url()
    db_name = _db_name(url)
    params = _conn_params(url)

    # Fresh start — remove leftovers from a crashed run, then create.
    asyncio.run(_drop_database(params, db_name))
    asyncio.run(_create_database(params, db_name))

    # env.py reads settings.database_url at execution time (load_python_file
    # re-executes env.py per run) — point it at the scratch DB.
    monkeypatch.setattr(settings, "database_url", url)
    try:
        cfg = Config(str(ALEMBIC_INI))
        cfg.set_main_option("sqlalchemy.url", url)
        command.upgrade(cfg, "head")

        async def _verify() -> tuple[str | None, set[str], set[str], set[str]]:
            conn = await asyncpg.connect(database=db_name, **params)
            try:
                version = await conn.fetchval(
                    "SELECT version_num FROM alembic_version"
                )
                tables = {
                    r["tablename"]
                    for r in await conn.fetch(
                        "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
                    )
                }
                indexes = {
                    r["indexname"]
                    for r in await conn.fetch(
                        "SELECT indexname FROM pg_indexes WHERE schemaname = 'public'"
                    )
                }
                constraints = {
                    r["conname"]
                    for r in await conn.fetch(
                        "SELECT conname FROM pg_constraint "
                        "WHERE connamespace = 'public'::regnamespace"
                    )
                }
                return version, tables, indexes, constraints
            finally:
                await conn.close()

        version, tables, indexes, constraints = asyncio.run(_verify())

        # ── e4b0ad82cba2 drop is idempotent — nothing left behind ──
        assert version == HEAD_REVISION
        assert "auto_replies" not in tables
        assert "ix_auto_replies_tenant_id" not in indexes

        # ── Sanity: schema that must exist at head ──
        assert {"tenants", "users", "ai_agents", "messages", "agent_templates"} <= tables
        assert "uq_messages_conn_external_msg" in constraints
    finally:
        asyncio.run(_drop_database(params, db_name))


def test_drop_agent_role_migration_converts_and_asserts(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """UR-3/UR-4: agent rows convert to client and the assertion passes.

    Builds a scratch DB at the revision BEFORE the drop_agent_role migration,
    seeds users + user_tenants rows with role='agent', then upgrades to head:
    every row must become 'client' and the post-migration assertion inside
    the migration must find ZERO remaining 'agent' rows. Also verifies the
    user_tenants.role server default is now 'client'.
    """
    url = _migration_db_url("_migr_agent")
    db_name = _db_name(url)
    params = _conn_params(url)

    asyncio.run(_drop_database(params, db_name))
    asyncio.run(_create_database(params, db_name))

    monkeypatch.setattr(settings, "database_url", url)
    try:
        cfg = Config(str(ALEMBIC_INI))
        cfg.set_main_option("sqlalchemy.url", url)
        command.upgrade(cfg, PRE_DROP_AGENT_REVISION)

        async def _seed_agent_rows() -> None:
            conn = await asyncpg.connect(database=db_name, **params)
            try:
                await conn.execute(
                    "INSERT INTO tenants (id, name, slug, status, plan, timezone, locale, created_at, updated_at) "
                    "VALUES ($1, 'Agent Co', 'agent-co', 'active', 'basic', 'UTC', 'es', now(), now())",
                    str(uuid.uuid4()),
                )
                # Fetch the tenant id back (generated above is enough — reuse it)
                tenant_id = await conn.fetchval(
                    "SELECT id FROM tenants WHERE slug = 'agent-co'"
                )
                user_id = str(uuid.uuid4())
                await conn.execute(
                    "INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at) "
                    "VALUES ($1, $2, 'hash', 'Agent User', 'agent', now(), now())",
                    user_id,
                    "agent@test.com",
                )
                await conn.execute(
                    "INSERT INTO user_tenants (user_id, tenant_id, role, is_primary, created_at, updated_at) "
                    "VALUES ($1, $2, 'agent', true, now(), now())",
                    user_id,
                    tenant_id,
                )
            finally:
                await conn.close()

        async def _verify_conversion() -> tuple[int, int, int, int, int, str | None]:
            conn = await asyncpg.connect(database=db_name, **params)
            try:
                version = await conn.fetchval(
                    "SELECT version_num FROM alembic_version"
                )
                users_agent = await conn.fetchval(
                    "SELECT COUNT(*) FROM users WHERE role = 'agent'"
                )
                ut_agent = await conn.fetchval(
                    "SELECT COUNT(*) FROM user_tenants WHERE role = 'agent'"
                )
                users_client = await conn.fetchval(
                    "SELECT COUNT(*) FROM users WHERE role = 'client'"
                )
                ut_client = await conn.fetchval(
                    "SELECT COUNT(*) FROM user_tenants WHERE role = 'client'"
                )
                role_default = await conn.fetchval(
                    "SELECT column_default FROM information_schema.columns "
                    "WHERE table_name = 'user_tenants' AND column_name = 'role'"
                )
                return version, users_agent, ut_agent, users_client, ut_client, role_default
            finally:
                await conn.close()

        asyncio.run(_seed_agent_rows())

        # RED target: upgrade applies drop_agent_role (converts + asserts)
        command.upgrade(cfg, "head")

        (
            version,
            users_agent,
            ut_agent,
            users_client,
            ut_client,
            role_default,
        ) = asyncio.run(_verify_conversion())

        assert version == HEAD_REVISION
        # Every seeded agent row became client (UR-3)
        assert users_agent == 0 and ut_agent == 0
        assert users_client == 1 and ut_client == 1
        # Server default flipped to 'client' (UR-2)
        assert role_default is not None and "'client'" in role_default
    finally:
        asyncio.run(_drop_database(params, db_name))
