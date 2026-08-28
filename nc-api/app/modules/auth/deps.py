"""Auth dependencies — protect endpoints with JWT."""

from __future__ import annotations

import uuid
import typing as t

from fastapi import Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_session
from app.modules.auth.models import User, UserRole

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    session: AsyncSession = Depends(get_session),
) -> User:
    """Extract and verify the current user from the JWT token.

    Injects `current_role` and `current_tenant_id` into the user object.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=["HS256"],
        )
        user_id: str | None = payload.get("sub")
        role: str | None = payload.get("role")
        tenant_id: str | None = payload.get("tenant_id")

        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user = await session.get(User, uuid.UUID(user_id))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    setattr(user, "current_role", user.role)
    setattr(
        user,
        "current_tenant_id",
        uuid.UUID(tenant_id) if tenant_id and tenant_id != "None" else None,
    )

    return user


class RoleChecker:
    """Dependency to check if the current user has the required roles."""

    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    async def __call__(self, user: User = Depends(get_current_user)) -> User:
        if not hasattr(user, "current_role") or user.current_role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted",
            )
        return user


async def get_current_user_sse(
    token: str | None = Query(default=None, description="JWT passed as ?token= for EventSource streams"),
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    session: AsyncSession = Depends(get_session),
) -> User:
    """Authenticate an SSE stream.

    ``EventSource`` in browsers cannot send ``Authorization`` headers, so
    the JWT is accepted either via the ``?token=`` query param (used by the
    dashboard) or the standard ``Authorization: Bearer`` header (used by
    tools/curl). Falls back to the shared :func:`get_current_user` logic.
    """
    if token:
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    return await get_current_user(credentials=credentials, session=session)
