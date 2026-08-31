"""Auth dependencies — protect endpoints with JWT."""

from __future__ import annotations

import uuid
import typing as t

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_session
from app.modules.auth.models import User, UserRole
from app.modules.auth.csrf import ACCESS_TOKEN_COOKIE

security = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    session: AsyncSession = Depends(get_session),
) -> User:
    """Extract and verify the current user from the JWT.

    Accepts the ``Authorization: Bearer`` header OR the ``nc_access_token``
    session cookie, with Bearer preferred when both are present (Slice B,
    spec AS-4) — tools/scripts using the header keep working unchanged.
    JWT decode/verify, 7-day expiry and the ``current_role`` /
    ``current_tenant_id`` injection are unchanged (stateless session).
    """
    token: str | None = None
    if credentials is not None:
        token = credentials.credentials
    elif request.cookies.get(ACCESS_TOKEN_COOKIE):
        token = request.cookies[ACCESS_TOKEN_COOKIE]

    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

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
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    session: AsyncSession = Depends(get_session),
) -> User:
    """Authenticate an SSE stream.

    Header-only for the ``?token=`` removal (Slice A); since Slice B the
    session cookie also authenticates via the shared :func:`get_current_user`
    (spec SSE-3). A request with ``?token=<jwt>`` is an unauthenticated
    request (the param is ignored) and returns 401.
    """
    return await get_current_user(
        request=request, credentials=credentials, session=session
    )
