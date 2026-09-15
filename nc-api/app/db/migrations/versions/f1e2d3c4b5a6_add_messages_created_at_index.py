"""Add index on messages.created_at for dashboard metrics performance.

Revision ID: f1e2d3c4b5a6
Revises: e4b0ad82cba2
Create Date: 2026-09-15
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f1e2d3c4b5a6"
down_revision: Union[str, Sequence[str], None] = "e4b0ad82cba2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add composite index for dashboard metrics queries."""
    # Composite index: tenant_id + created_at (covers metrics dashboard queries)
    op.create_index(
        "ix_messages_tenant_created",
        "messages",
        ["tenant_id", "created_at"],
        unique=False,
    )
    # Index for global metrics (no tenant filter)
    op.create_index(
        "ix_messages_created_at",
        "messages",
        ["created_at"],
        unique=False,
    )


def downgrade() -> None:
    """Drop the indexes."""
    op.drop_index("ix_messages_created_at", table_name="messages")
    op.drop_index("ix_messages_tenant_created", table_name="messages")
