"""add_business_config_to_ai_agents

Revision ID: a2b3c4d5e6f7
Revises: 1cd564bfc1aa
Create Date: 2026-05-18 19:10:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "a2b3c4d5e6f7"
down_revision: Union[str, Sequence[str], None] = "1cd564bfc1aa"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add business_config JSONB column to ai_agents."""
    op.add_column(
        "ai_agents",
        sa.Column(
            "business_config",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
    )


def downgrade() -> None:
    """Remove business_config column from ai_agents."""
    op.drop_column("ai_agents", "business_config")
