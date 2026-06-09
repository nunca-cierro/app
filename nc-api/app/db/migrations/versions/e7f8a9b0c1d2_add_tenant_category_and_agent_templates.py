"""add tenant category, business_profile + agent_templates table

Revision ID: e7f8a9b0c1d2
Revises: 0ba413761446
Create Date: 2026-06-09 10:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "e7f8a9b0c1d2"
down_revision: Union[str, Sequence[str], None] = "b375b75bb3ad"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Tenant additions (additive, nullable) ──────────────────────────
    op.add_column(
        "tenants",
        sa.Column("category", sa.String(50), nullable=True),
    )
    op.add_column(
        "tenants",
        sa.Column("business_profile", postgresql.JSONB, nullable=True),
    )
    op.create_index("ix_tenants_category", "tenants", ["category"])

    # ── Agent templates table ──────────────────────────────────────────
    op.create_table(
        "agent_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("content", postgresql.JSONB, nullable=False),
        sa.Column("is_system", sa.Boolean, nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_agent_templates_category", "agent_templates", ["category"]
    )


def downgrade() -> None:
    # Drop agent_templates table
    op.drop_index("ix_agent_templates_category", table_name="agent_templates")
    op.drop_table("agent_templates")

    # Revert tenant additions
    op.drop_index("ix_tenants_category", table_name="tenants")
    op.drop_column("tenants", "business_profile")
    op.drop_column("tenants", "category")
