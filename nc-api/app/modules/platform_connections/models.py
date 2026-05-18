"""PlatformConnection ORM model — unified credentials store for external platforms.

Stores connection details (bot tokens, API keys, etc.) for any platform
(WhatsApp, Telegram, …).  Credentials are always encrypted at rest.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class PlatformConnection(Base):
    """A single platform connection owned by a tenant."""

    __tablename__ = "platform_connections"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True
    )
    platform_type: Mapped[str] = mapped_column(
        String(30), nullable=False, index=True
    )
    display_name: Mapped[str] = mapped_column(
        String(255), nullable=False
    )
    credentials: Mapped[str] = mapped_column(
        Text, nullable=False
    )
    extra_data: Mapped[dict | None] = mapped_column(
        "metadata", JSONB, nullable=True, default=None
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="active", index=True
    )
    is_primary: Mapped[bool] = mapped_column(
        Boolean, default=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    # relationships
    tenant = relationship("Tenant", back_populates="platform_connections")

    def __repr__(self) -> str:
        return f"<PlatformConnection {self.display_name} ({self.platform_type})>"
