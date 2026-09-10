"""add nullable messages.origin column (outbound response tagging)

Revision ID: e3f4a5b6c7d8
Revises: f1a2b3c4d5e6
Create Date: 2026-09-10 00:00:00.000000

plan-differentiation (design D2): additive, NULLABLE, NO backfill, NO
server_default. ``origin`` tags outbound responses as ``ai`` (LLM),
``programmed`` (FAQ/keywords) or ``escalation`` (fallback). Inbound, admin
and pre-migration messages keep NULL and are never counted as AI responses
by the usage meter (forward-looking, soft limits).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e3f4a5b6c7d8"
down_revision: Union[str, Sequence[str], None] = "f1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add the nullable origin column — existing rows stay NULL."""
    op.add_column(
        "messages",
        sa.Column("origin", sa.String(20), nullable=True),
    )


def downgrade() -> None:
    """Drop the column (revert is lossless for data — origin is additive)."""
    op.drop_column("messages", "origin")