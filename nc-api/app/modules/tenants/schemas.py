"""Tenant Pydantic schemas — request/response for API."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class TenantCreate(BaseModel):
    name: str
    slug: str
    plan: str = "basic"
    timezone: str = "America/Bogota"
    locale: str = "es-CO"
    notes: str | None = None
    category: str | None = None


class TenantUpdate(BaseModel):
    name: str | None = None
    plan: str | None = None
    status: str | None = None
    timezone: str | None = None
    locale: str | None = None
    notes: str | None = None
    category: str | None = None


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
    category: str | None
    business_profile: dict[str, Any] | None = None
    payment_status: str | None = None
    plan_activated_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


# ── Billing / Activation ─────────────────────────────────────────────────────


class ActivatePlanRequest(BaseModel):
    plan: str = Field(
        ...,
        description="Plan to activate: basic, professional, or enterprise",
        pattern=r"^(basic|professional|enterprise)$",
    )


class PaymentMethod(BaseModel):
    name: str
    number: str
    logo: str


class BillingInfoResponse(BaseModel):
    qr_urls: dict[str, str]
    methods: list[PaymentMethod]
    account_holder: str
