"""Plan/RBAC dependencies — enforce role + tenant + plan capability server-side.

Use ``require_capability`` on sensitive endpoints so plan rules are enforced in
the API (never trust the frontend alone). The dependency checks, in order:

1. **Role gate** — the user's current role must be in ``allowed_roles``.
2. **Superadmin exemption** — superadmin is the platform operator and is not
   subject to plan gates (they provision agents/connections for any tenant).
3. **Tenant gate** — a tenant context must exist to evaluate the plan.
4. **Plan gate** — the tenant's plan must grant the required capability.
"""

from __future__ import annotations

import typing as t

from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.modules.auth.deps import get_current_user
from app.modules.auth.models import User, UserRole
from app.modules.plans.capabilities import plan_has_capability
from app.modules.tenants.models import Tenant


class RequireCapability:
    """Dependency factory for role + plan capability checks."""

    def __init__(
        self,
        capability: str,
        allowed_roles: list[str] | None = None,
    ) -> None:
        self.capability = capability
        self.allowed_roles = allowed_roles

    async def __call__(
        self,
        user: User = Depends(get_current_user),
        session: AsyncSession = Depends(get_session),
    ) -> User:
        role = getattr(user, "current_role", user.role)

        # 1. Role gate
        if self.allowed_roles and role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted",
            )

        # 2. Superadmin exemption
        if role == UserRole.SUPERADMIN:
            return user

        # 3. Tenant gate — a plan can only be evaluated with a tenant context
        tenant_id = getattr(user, "current_tenant_id", None)
        if tenant_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tenant context",
            )

        # 4. Plan gate
        tenant = await session.get(Tenant, tenant_id)
        plan = tenant.plan if tenant else None
        if not plan_has_capability(plan, self.capability):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Tu plan actual ({plan or 'sin plan'}) no incluye esta "
                    "función. Contactá a tu administrador para hacer upgrade."
                ),
            )

        return user


def require_capability(
    capability: str,
    allowed_roles: t.Sequence[str] | None = None,
) -> RequireCapability:
    """Build a ``require_capability`` dependency for a given capability."""
    return RequireCapability(capability, list(allowed_roles) if allowed_roles else None)
