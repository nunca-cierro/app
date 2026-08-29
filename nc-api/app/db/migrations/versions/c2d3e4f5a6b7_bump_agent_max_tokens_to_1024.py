"""bump ai_agents max_tokens from the old 512 default to 1024

Revision ID: c2d3e4f5a6b7
Revises: b1c2d3e4f5a6
Create Date: 2026-08-29

Aligns existing agent rows with the new canonical max_tokens default of
1024 (ORM model default, create-schema default, and the from-template
path all use 1024 now). Only rows still holding the old default (512)
are rewritten — custom values (e.g. 768, 1000) are never touched. Pure
data UPDATE: the column default is ORM-level (no server_default), so
there is no DDL. Idempotent: re-running touches nothing once no 512
rows remain.

Reversible: downgrade restores 512 for rows holding 1024 (approximate —
it also reverts agents created with the new default after this migration
ran; acceptable for a rollback-only path, same approach as b1c2d3e4f5a6).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c2d3e4f5a6b7'
down_revision: Union[str, Sequence[str], None] = 'b1c2d3e4f5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

OLD_DEFAULT = 512
NEW_DEFAULT = 1024

_UPGRADE_SQL = sa.text(
    "UPDATE ai_agents SET max_tokens = :new WHERE max_tokens = :old"
)
_DOWNGRADE_SQL = sa.text(
    "UPDATE ai_agents SET max_tokens = :old WHERE max_tokens = :new"
)


def upgrade() -> None:
    """Rewrite agents still storing the old 512 default to 1024.

    NOTE: alembic wraps each migration in a transaction that commits on
    success — no explicit commit() here (that would break atomicity).
    """
    bind = op.get_bind()
    result = bind.execute(_UPGRADE_SQL, {"old": OLD_DEFAULT, "new": NEW_DEFAULT})
    updated = getattr(result, "rowcount", None)
    if updated:
        print(f"[migration c2d3e4f5a6b7] agents updated: {updated}")


def downgrade() -> None:
    """Restore 512 for rows holding the new default."""
    bind = op.get_bind()
    bind.execute(_DOWNGRADE_SQL, {"old": OLD_DEFAULT, "new": NEW_DEFAULT})
