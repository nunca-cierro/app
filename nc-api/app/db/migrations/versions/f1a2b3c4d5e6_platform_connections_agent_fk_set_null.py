"""platform_connections.agent_id FK -> ON DELETE SET NULL

Revision ID: f1a2b3c4d5e6
Revises: c0d1e2f3a4b5
Create Date: 2026-09-10 00:00:00.000000

Bug: ``fk_platform_connections_agent_id`` was created with no delete action
(migration ``0ba413761446``), so deleting an agent that still had a linked
platform connection raised a ForeignKeyViolationError — surfaced by the API as
409. The connection belongs to the *tenant* (e.g. a WhatsApp number), not the
agent, so the correct semantics on agent deletion is to UNLINK (set
``agent_id = NULL``) and keep the connection, not to cascade-delete it.

This migration re-creates the FK with ``ON DELETE SET NULL``. The API handler
also unlinks explicitly (belt-and-suspenders), so this is defense-in-depth for
any other deletion path (e.g. tenant teardown).
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'c0d1e2f3a4b5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_FK_NAME = "fk_platform_connections_agent_id"


def upgrade() -> None:
    """Recreate the agent_id FK with ON DELETE SET NULL."""
    op.drop_constraint(_FK_NAME, "platform_connections", type_="foreignkey")
    op.create_foreign_key(
        _FK_NAME,
        "platform_connections",
        "ai_agents",
        ["agent_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    """Restore the original FK (no delete action)."""
    op.drop_constraint(_FK_NAME, "platform_connections", type_="foreignkey")
    op.create_foreign_key(
        _FK_NAME,
        "platform_connections",
        "ai_agents",
        ["agent_id"],
        ["id"],
    )
