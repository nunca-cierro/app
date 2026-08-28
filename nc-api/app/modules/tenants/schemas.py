"""Tenant Pydantic schemas — request/response for API."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.modules.auth.models import TenantStatus
from app.modules.plans.capabilities import SUPPORTED_PLANS
from app.modules.agents.categories import canonicalize_category
from app.modules.tenants.business_profile import validate_business_profile


def _valid_plans() -> str:
    return ", ".join(sorted(SUPPORTED_PLANS))


class TenantCreate(BaseModel):
    name: str
    slug: str
    plan: str = "basic"
    timezone: str = "America/Bogota"
    locale: str = "es-CO"
    notes: str | None = None
    category: str | None = None
    business_profile: dict | None = None

    @field_validator("plan")
    @classmethod
    def validate_plan(cls, v: str) -> str:
        if v not in SUPPORTED_PLANS:
            raise ValueError(f"plan must be one of: {_valid_plans()}")
        return v

    @field_validator("category")
    @classmethod
    def canonicalize_tenant_category(cls, v: str | None) -> str | None:
        """Map display labels / legacy slugs to the canonical category slug."""
        return canonicalize_category(v)

    @field_validator("business_profile")
    @classmethod
    def validate_profile(cls, v: dict | None) -> dict | None:
        return validate_business_profile(v)


class TenantUpdate(BaseModel):
    name: str | None = None
    plan: str | None = None
    status: str | None = None
    timezone: str | None = None
    locale: str | None = None
    notes: str | None = None
    category: str | None = None
    business_profile: dict | None = None

    @field_validator("plan")
    @classmethod
    def validate_plan(cls, v: str | None) -> str | None:
        if v is not None and v not in SUPPORTED_PLANS:
            raise ValueError(f"plan must be one of: {_valid_plans()}")
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str | None) -> str | None:
        allowed = {s.value for s in TenantStatus}
        if v is not None and v not in allowed:
            raise ValueError(f"status must be one of: {', '.join(sorted(allowed))}")
        return v

    @field_validator("category")
    @classmethod
    def canonicalize_tenant_category(cls, v: str | None) -> str | None:
        return canonicalize_category(v)

    @field_validator("business_profile")
    @classmethod
    def validate_profile(cls, v: dict | None) -> dict | None:
        return validate_business_profile(v)


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


class PaymentStatusRequest(BaseModel):
    """Request body for PATCH /api/v1/tenants/{id}/payment-status."""

    payment_status: Literal["active", "inactive"]
