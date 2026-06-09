"""Auth Pydantic schemas — register, login, token response."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    name: str
    role: str
    tenant_id: str | None = None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    name: str
    role: str
    created_at: datetime


class MeResponse(UserResponse):
    current_role: str | None = None
    current_tenant_id: str | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class AssignTenantRequest(BaseModel):
    user_id: uuid.UUID
    tenant_id: uuid.UUID
    role: str


class TenantAssociationOut(BaseModel):
    """Tenant info shown in admin user listing."""
    tenant_id: uuid.UUID
    tenant_name: str
    role: str
    is_primary: bool


class AdminUserOut(BaseModel):
    """User info for admin listing — includes tenant assignments."""
    id: uuid.UUID
    email: str
    name: str
    role: str
    created_at: datetime
    tenants: list[TenantAssociationOut] = []
