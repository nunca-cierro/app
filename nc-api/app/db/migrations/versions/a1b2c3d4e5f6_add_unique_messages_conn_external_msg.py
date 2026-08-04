"""add unique constraint messages (conn, external_message_id)

Revision ID: a1b2c3d4e5f6
Revises: 8d353aecd482
Create Date: 2026-08-03 16:00:00.000000

This migration is SAFE-FAIL: it never deletes or rewrites data. It first
detects existing duplicate groups of (platform_connection_id,
external_message_id) and ABORTS with an explicit report if any are found,
so an operator can resolve them deliberately before applying the
constraint.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '8d353aecd482'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

CONSTRAINT_NAME: str = "uq_messages_conn_external_msg"


def upgrade() -> None:
    """Add the dedup unique constraint — abort if duplicates exist."""
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        # ── Pre-flight: detect duplicate groups (no data is deleted) ──
        total = bind.execute(
            sa.text(
                "SELECT COUNT(*) FROM ("
                "  SELECT platform_connection_id, external_message_id"
                "  FROM messages"
                "  WHERE external_message_id IS NOT NULL"
                "  GROUP BY platform_connection_id, external_message_id"
                "  HAVING COUNT(*) > 1"
                ") dup"
            )
        ).scalar() or 0

        if total > 0:
            sample = bind.execute(
                sa.text(
                    "SELECT platform_connection_id, external_message_id, COUNT(*) AS n"
                    " FROM messages"
                    " WHERE external_message_id IS NOT NULL"
                    " GROUP BY platform_connection_id, external_message_id"
                    " HAVING COUNT(*) > 1"
                    " ORDER BY n DESC"
                    " LIMIT 5"
                )
            ).fetchall()
            sample_str = "; ".join(
                f"{r[0]}/{r[1]} x{r[2]}" for r in sample
            )
            raise RuntimeError(
                f"Cannot create unique constraint '{CONSTRAINT_NAME}': "
                f"{total} duplicate group(s) found in messages "
                f"(platform_connection_id, external_message_id). "
                f"Sample: {sample_str}. Resolve duplicates manually BEFORE "
                "running this migration — no data was deleted."
            )

    op.create_unique_constraint(
        CONSTRAINT_NAME,
        "messages",
        ["platform_connection_id", "external_message_id"],
    )


def downgrade() -> None:
    """Drop the dedup unique constraint."""
    op.drop_constraint(CONSTRAINT_NAME, "messages", type_="unique")
