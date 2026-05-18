"""WhatsApp Number Pydantic schemas."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class WhatsAppNumberCreate(BaseModel):
    tenant_id: uuid.UUID
    phone_number_id: str
    waba_id: str
    display_phone_number: str
    verified_name: str | None = None
    status: str = "active"
    is_primary: bool = False


class WhatsAppNumberUpdate(BaseModel):
    status: str | None = None
    verified_name: str | None = None
    is_primary: bool | None = None


class WhatsAppNumberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    phone_number_id: str
    waba_id: str
    display_phone_number: str
    verified_name: str | None
    status: str
    is_primary: bool
    created_at: datetime
    updated_at: datetime
