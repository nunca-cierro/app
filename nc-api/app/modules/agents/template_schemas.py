"""AgentTemplate Pydantic schemas — request/response for template CRUD."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class AgentTemplateCreate(BaseModel):
    category: str
    name: str
    description: str | None = None
    content: dict[str, Any]
    is_system: bool = True


class AgentTemplateUpdate(BaseModel):
    category: str | None = None
    name: str | None = None
    description: str | None = None
    content: dict[str, Any] | None = None
    is_system: bool | None = None


class AgentTemplateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    category: str
    name: str
    description: str | None
    content: dict[str, Any]
    is_system: bool
    created_at: datetime
    updated_at: datetime
