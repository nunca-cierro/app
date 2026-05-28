"""add agent_id to platform_connections

Revision ID: 0ba413761446
Revises: a2b3c4d5e6f7
Create Date: 2026-05-27 19:42:28.177030

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0ba413761446'
down_revision: Union[str, Sequence[str], None] = 'a2b3c4d5e6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('platform_connections', sa.Column('agent_id', sa.UUID(), nullable=True))
    op.create_foreign_key('fk_platform_connections_agent_id', 'platform_connections', 'ai_agents', ['agent_id'], ['id'])
    op.create_index(op.f('ix_platform_connections_agent_id'), 'platform_connections', ['agent_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_platform_connections_agent_id'), table_name='platform_connections')
    op.drop_constraint('fk_platform_connections_agent_id', 'platform_connections', type_='foreignkey')
    op.drop_column('platform_connections', 'agent_id')
