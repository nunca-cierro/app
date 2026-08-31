"""drop agent role — migrate agent rows to client

Revision ID: d5e6f7a8b9c0
Revises: c2d3e4f5a6b7
Create Date: 2026-08-31

Role model collapses from 4 to 3 roles: ``agent`` is removed. Every
existing ``users.role`` / ``user_tenants.role`` row holding ``'agent'`` is
converted to ``'client'`` — semantically safe because both are read-only
tenant roles and no endpoint ever granted agent a distinct capability. The
``user_tenants.role`` server default is set to ``'client'`` to match the ORM
model (the column previously had NO server default; the ORM-side default was
``UserRole.AGENT``).

Downgrade (documented, rollback-only): restores the ``user_tenants.role``
default to ``'agent'``. The ``AGENT`` enum value itself returns with the code
revert. Rows converted to ``'client'`` are NOT restored — agent→client is a
read-only→read-only transition and re-tagging data with a role the old
codebase understood again is intentionally not done (the downgrade is for
schema rollback, not data provenance).

Idempotent: once no 'agent' rows remain, the UPDATEs touch nothing and the
post-migration assertion still passes.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd5e6f7a8b9c0'
down_revision: Union[str, Sequence[str], None] = 'c2d3e4f5a6b7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_UPDATE_USERS_AGENT = sa.text(
    "UPDATE users SET role = 'client' WHERE role = 'agent'"
)
_UPDATE_USER_TENANTS_AGENT = sa.text(
    "UPDATE user_tenants SET role = 'client' WHERE role = 'agent'"
)
_COUNT_USERS_AGENT = sa.text(
    "SELECT COUNT(*) FROM users WHERE role = 'agent'"
)
_COUNT_USER_TENANTS_AGENT = sa.text(
    "SELECT COUNT(*) FROM user_tenants WHERE role = 'agent'"
)


def upgrade() -> None:
    """Convert agent rows to client and lock the default to 'client'.

    NOTE: alembic wraps each migration in a transaction that commits on
    success — no explicit commit() here (that would break atomicity).
    """
    bind = op.get_bind()
    users_result = bind.execute(_UPDATE_USERS_AGENT)
    ut_result = bind.execute(_UPDATE_USER_TENANTS_AGENT)
    op.execute("ALTER TABLE user_tenants ALTER COLUMN role SET DEFAULT 'client'")

    # Post-migration integrity assertion (UR-4): MUST fail if any agent row
    # remains in either table — converted rows above guarantee zero.
    users_agent = bind.execute(_COUNT_USERS_AGENT).scalar_one()
    ut_agent = bind.execute(_COUNT_USER_TENANTS_AGENT).scalar_one()
    assert users_agent == 0, (
        f"[migration d5e6f7a8b9c0] {users_agent} users still have role='agent'"
    )
    assert ut_agent == 0, (
        f"[migration d5e6f7a8b9c0] {ut_agent} user_tenants still have role='agent'"
    )

    users_updated = getattr(users_result, "rowcount", None)
    ut_updated = getattr(ut_result, "rowcount", None)
    if users_updated or ut_updated:
        print(
            f"[migration d5e6f7a8b9c0] converted: "
            f"users={users_updated}, user_tenants={ut_updated}"
        )


def downgrade() -> None:
    """Restore the user_tenants.role default to 'agent' (schema rollback).

    Data is intentionally NOT restored: agent→client rows stay 'client'
    (both roles are read-only; see module docstring).
    """
    op.execute("ALTER TABLE user_tenants ALTER COLUMN role SET DEFAULT 'agent'")