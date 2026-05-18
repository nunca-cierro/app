"""AI Agent and Prompt Pydantic schemas."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


# ── AiAgent ─────────────────────────────────────────────────────────────


class AiAgentCreate(BaseModel):
    tenant_id: uuid.UUID
    name: str
    description: str | None = None
    provider: str = "groq"
    model: str = "llama-3.3-70b-versatile"
    temperature: float = 0.7
    max_tokens: int = 512
    enabled: bool = True


class AiAgentUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    provider: str | None = None
    model: str | None = None
    temperature: float | None = None
    max_tokens: int | None = None
    enabled: bool | None = None


class AiAgentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    description: str | None
    provider: str
    model: str
    temperature: float
    max_tokens: int
    enabled: bool
    created_at: datetime
    updated_at: datetime


# ── Prompt ──────────────────────────────────────────────────────────────


class PromptCreate(BaseModel):
    tenant_id: uuid.UUID
    agent_id: uuid.UUID | None = None
    type: str = "system"
    content: str
    active: bool = True


class PromptUpdate(BaseModel):
    content: str | None = None
    type: str | None = None
    active: bool | None = None


class PromptResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    agent_id: uuid.UUID | None
    type: str
    version: int
    content: str
    active: bool
    created_at: datetime
