"""Conversation and Message Pydantic schemas — platform-agnostic.

Old ``wa_*`` fields are kept as **optional backward-compatible aliases**.
New code should use the ``external_*`` / ``platform_connection_id`` fields.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID

    # New platform-agnostic fields
    platform_connection_id: uuid.UUID | None = None
    external_user_id: str | None = None
    platform: str | None = None

    # Old backward-compat fields (optional)
    whatsapp_number_id: uuid.UUID | None = None
    wa_user_id: str | None = None

    status: str
    summary: str | None = None
    last_message_at: datetime | None = None
    message_count: int = 0
    created_at: datetime
    updated_at: datetime


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    conversation_id: uuid.UUID
    direction: str

    # New platform-agnostic fields
    platform_connection_id: uuid.UUID | None = None
    external_user_id: str | None = None
    external_message_id: str | None = None
    platform: str | None = None

    # Old backward-compat fields (optional)
    wa_message_id: str | None = None
    wa_user_id: str | None = None

    message_type: str
    content: str | None = None
    status: str
    payload: dict | None = None
    error_message: str | None = None
    created_at: datetime
