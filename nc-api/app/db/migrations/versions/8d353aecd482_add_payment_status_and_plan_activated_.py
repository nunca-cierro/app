"""add payment_status and plan_activated_at to tenants

Revision ID: 8d353aecd482
Revises: e4b0ad82cba2
Create Date: 2026-06-11 17:45:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8d353aecd482"
down_revision: Union[str, Sequence[str], None] = "e4b0ad82cba2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "tenants",
        sa.Column(
            "payment_status",
            sa.String(20),
            nullable=False,
            server_default="pending",
        ),
    )
    op.add_column(
        "tenants",
        sa.Column(
            "plan_activated_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("tenants", "plan_activated_at")
    op.drop_column("tenants", "payment_status")
