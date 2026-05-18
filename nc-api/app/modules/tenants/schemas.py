"""Tenant Pydantic schemas — request/response for API."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class TenantCreate(BaseModel):
    name: str
    slug: str
    plan: str = "basic"
    timezone: str = "America/Bogota"
    locale: str = "es-CO"
    notes: str | None = None


class TenantUpdate(BaseModel):
    name: str | None = None
    plan: str | None = None
    status: str | None = None
    timezone: str | None = None
    locale: str | None = None
    notes: str | None = None


class TenantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    status: str
    plan: str
    timezone: str
    locale: str
    notes: str | None
    created_at: datetime
    updated_at: datetime
