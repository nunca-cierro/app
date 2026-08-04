"""update ai_agents model from deprecated groq models

Revision ID: b1c2d3e4f5a6
Revises: a1b2c3d4e5f6
Create Date: 2026-08-03 17:00:00.000000

Groq retired several model ids (verified on console.groq.com/docs/
deprecations): `llama-3.3-70b-versatile` (shutdown 2026-08-16),
`llama-3.1-8b-instant` (shutdown 2026-08-16), `mixtral-8x7b-32768`
(retired 2025-03-20) and `gemma2-9b-it` (retired 2025-10-08). Agents that
still store ANY of those exact values are rewritten to
`openai/gpt-oss-120b` (the current default). Only the EXACT deprecated
values are touched — custom models are never modified. The runtime
provider also routes these values to the default (defense-in-depth), so
this migration is safe to run at any time before the shutdown date.

Reversible: downgrade restores `llama-3.3-70b-versatile` for rows that
hold the new default (approximate — it also reverts agents created with
the new default after this migration ran; acceptable for a rollback path).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1c2d3e4f5a6'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEPRECATED_MODELS: list[str] = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768",
    "gemma2-9b-it",
]
CURRENT_DEFAULT: str = "openai/gpt-oss-120b"

# Hardcoded IN-list (migrations are immutable; values verified on the
# Groq deprecations page).
_UPGRADE_SQL = sa.text(
    "UPDATE ai_agents SET model = :new "
    "WHERE model IN ('llama-3.3-70b-versatile', 'llama-3.1-8b-instant', "
    "'mixtral-8x7b-32768', 'gemma2-9b-it')"
)
_DOWNGRADE_SQL = sa.text(
    "UPDATE ai_agents SET model = :old WHERE model = :new"
)


def upgrade() -> None:
    """Rewrite agents that still store a deprecated/retired Groq model.

    NOTE: alembic wraps each migration in a transaction that commits on
    success — no explicit commit() here (that would break atomicity).
    """
    bind = op.get_bind()
    result = bind.execute(_UPGRADE_SQL, {"new": CURRENT_DEFAULT})
    updated = getattr(result, "rowcount", None)
    if updated:
        print(f"[migration b1c2d3e4f5a6] agents updated: {updated}")


def downgrade() -> None:
    """Restore the deprecated model for rows holding the new default."""
    bind = op.get_bind()
    bind.execute(_DOWNGRADE_SQL, {"old": DEPRECATED_MODELS[0], "new": CURRENT_DEFAULT})
