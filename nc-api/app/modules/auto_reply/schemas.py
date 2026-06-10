"""AutoReply Pydantic schemas."""
from __future__ import annotations
import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class AutoReplyCreate(BaseModel):
    tenant_id: uuid.UUID
    keywords: list[str]
    match_type: str = "any"
    response_text: str
    enabled: bool = True
    priority: int = 0

class AutoReplyUpdate(BaseModel):
    keywords: list[str] | None = None
    match_type: str | None = None
    response_text: str | None = None
    enabled: bool | None = None
    priority: int | None = None

class AutoReplyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    tenant_id: uuid.UUID
    keywords: list
    match_type: str
    response_text: str
    enabled: bool
    priority: int
    created_at: datetime
    updated_at: datetime
