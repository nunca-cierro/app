"""rewrite legacy agent provider default to openai/gpt-4o-mini

Revision ID: c0d1e2f3a4b5
Revises: d5e6f7a8b9c0
Create Date: 2026-09-09 00:00:00.000000

The LLM default moved from Groq to OpenAI: new agents default to
``provider='openai'`` / ``model='gpt-4o-mini'`` (llm-multi-provider change).
Rows still storing the legacy default — ``provider='groq'`` with model
``openai/gpt-oss-120b`` (the current Groq default) or ``openai/gpt-oss-20b``
(its predecessor) — are rewritten to the new default.

Rows holding a genuinely custom Groq model (any other model id, e.g.
``qwen/qwen3.6-27b``) are NEVER touched: they stay dormant and the runtime
routes them to the active provider's default with a warning (defense-in-depth,
same convention as migration b1c2d3e4f5a6).

Reversible: downgrade restores the legacy default (``groq`` /
``openai/gpt-oss-120b``) for rows that hold the new default — approximate,
it also reverts agents created with the new default after this migration ran;
acceptable for a rollback path (same tradeoff as b1c2d3e4f5a6).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c0d1e2f3a4b5'
down_revision: Union[str, Sequence[str], None] = 'd5e6f7a8b9c0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Legacy default model ids stored under provider='groq'. Migrations are
# immutable — values verified against the pre-change defaults.
LEGACY_GROQ_DEFAULT_MODELS: tuple[str, ...] = (
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
)

# Hardcoded UPDATEs (migrations are immutable; values verified). The test
# module imports these SQL statements to replay them against a seeded DB, so
# keep them in sync when touching this file.
_LEGACY_IN = "', '".join(LEGACY_GROQ_DEFAULT_MODELS)
_UPGRADE_SQL = sa.text(
    "UPDATE ai_agents SET provider = 'openai', model = 'gpt-4o-mini' "
    f"WHERE provider = 'groq' AND model IN ('{_LEGACY_IN}')"
)
_DOWNGRADE_SQL = sa.text(
    "UPDATE ai_agents SET provider = 'groq', model = 'openai/gpt-oss-120b' "
    "WHERE provider = 'openai' AND model = 'gpt-4o-mini'"
)


def upgrade() -> None:
    """Rewrite legacy Groq-default rows to the OpenAI default.

    Idempotent: once no ``groq`` + ``openai/gpt-oss-*`` rows remain, the
    UPDATE touches nothing. NOTE: alembic wraps each migration in a
    transaction that commits on success — no explicit commit() here (that
    would break atomicity).
    """
    bind = op.get_bind()
    result = bind.execute(_UPGRADE_SQL)
    updated = getattr(result, "rowcount", None)
    if updated:
        print(f"[migration c0d1e2f3a4b5] agents updated: {updated}")


def downgrade() -> None:
    """Restore the legacy default for rows holding the new default.

    Approximate rollback — also reverts agents created with the new default
    after upgrade; accepted tradeoff (see module docstring).
    """
    bind = op.get_bind()
    bind.execute(_DOWNGRADE_SQL)
