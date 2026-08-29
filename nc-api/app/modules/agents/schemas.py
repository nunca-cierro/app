"""AI Agent and Prompt Pydantic schemas."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, field_validator

from app.core.config import DEFAULT_GROQ_MODEL, DEFAULT_MAX_TOKENS


# Providers the platform can actually route to today. Kept as a frozenset
# (single source of truth for create + PATCH validation) until a
# multi-provider enum is warranted.
SUPPORTED_PROVIDERS: frozenset[str] = frozenset({"groq"})

MIN_TEMPERATURE = 0.0
MAX_TEMPERATURE = 2.0
# Shared with the frontend zod floor (nc-dashboard/lib/schemas/agent.ts).
MIN_MAX_TOKENS = 64


# ── AiAgent from template ────────────────────────────────────────────────


class AiAgentFromTemplate(BaseModel):
    """Request body for POST /agents/from-template."""

    tenant_id: uuid.UUID
    template_id: uuid.UUID
    name: str | None = None
    overrides: dict[str, Any] | None = None


# ── AiAgent ─────────────────────────────────────────────────────────────


class _AgentParams(BaseModel):
    """Agent knobs shared by create and update payloads.

    One base class keeps AiAgentCreate and AiAgentUpdate symmetric: both
    reject unsupported providers, out-of-range temperature and sub-floor
    max_tokens (validation symmetry — the create endpoint used to accept
    values PATCH rejected).
    """

    provider: str = "groq"
    temperature: float = 0
    max_tokens: int = DEFAULT_MAX_TOKENS

    @field_validator("max_tokens")
    @classmethod
    def validate_max_tokens(cls, v: int | None) -> int | None:
        if v is not None and v < MIN_MAX_TOKENS:
            raise ValueError(f"max_tokens must be at least {MIN_MAX_TOKENS}")
        return v

    @field_validator("temperature")
    @classmethod
    def validate_temperature(cls, v: float | None) -> float | None:
        if v is not None and not (MIN_TEMPERATURE <= v <= MAX_TEMPERATURE):
            raise ValueError(
                f"temperature must be between {MIN_TEMPERATURE} and {MAX_TEMPERATURE}"
            )
        return v

    @field_validator("provider")
    @classmethod
    def validate_provider(cls, v: str | None) -> str | None:
        if v is not None and v not in SUPPORTED_PROVIDERS:
            raise ValueError(
                f"provider must be one of: {', '.join(sorted(SUPPORTED_PROVIDERS))}"
            )
        return v


class AiAgentCreate(_AgentParams):
    tenant_id: uuid.UUID
    name: str
    description: str | None = None
    model: str = DEFAULT_GROQ_MODEL
    enabled: bool = True
    business_config: dict[str, Any] | None = None


class AiAgentUpdate(_AgentParams):
    name: str | None = None
    description: str | None = None
    model: str | None = None
    provider: str | None = None
    temperature: float | None = None
    max_tokens: int | None = None
    enabled: bool | None = None
    business_config: dict[str, Any] | None = None


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
    business_config: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime


# ── Prompt ──────────────────────────────────────────────────────────────


class PromptCreate(BaseModel):
    tenant_id: uuid.UUID
    agent_id: uuid.UUID | None = None
    type: str = "system"
    content: str
    active: bool = True


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
