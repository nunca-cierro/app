"""PlatformConnection Pydantic schemas — validation and serialization.

Credentials are ALWAYS stripped from the response schema
so they are never accidentally exposed via the API.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, field_validator

VALID_PLATFORM_TYPES = {"whatsapp", "telegram", "evolution"}


class PlatformConnectionCreate(BaseModel):
    """Schema for creating a new platform connection."""

    tenant_id: uuid.UUID
    platform_type: str
    display_name: str
    credentials: dict[str, Any] | None = None  # plaintext — encrypted at the service layer. Evolution API auto-completa desde settings.
    extra_data: dict[str, Any] | None = None
    status: str = "active"
    is_primary: bool = False
    agent_id: uuid.UUID | None = None

    @field_validator("platform_type")
    @classmethod
    def validate_platform_type(cls, v: str) -> str:
        if v not in VALID_PLATFORM_TYPES:
            msg = f"platform_type must be one of {sorted(VALID_PLATFORM_TYPES)}, got '{v}'"
            raise ValueError(msg)
        return v


class PlatformConnectionUpdate(BaseModel):
    """Schema for updating an existing platform connection.

    All fields are optional — only provided fields are updated.
    """

    display_name: str | None = None
    credentials: dict[str, Any] | None = None
    extra_data: dict[str, Any] | None = None
    status: str | None = None
    is_primary: bool | None = None
    agent_id: uuid.UUID | None = None


class PlatformConnectionResponse(BaseModel):
    """Schema returned by the API — *never* exposes credentials."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    platform_type: str
    display_name: str
    extra_data: dict[str, Any] | None = None
    status: str
    is_primary: bool
    agent_id: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime

    # NOTE: `credentials` is intentionally omitted from this class
    # so it can never leak through the API response.
