"""WhatsApp Number ORM model — phone numbers connected per tenant."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class WhatsAppNumber(Base):
    __tablename__ = "whatsapp_numbers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True
    )
    phone_number_id: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )
    waba_id: Mapped[str] = mapped_column(String(100), nullable=False)
    display_phone_number: Mapped[str] = mapped_column(String(20), nullable=False)
    verified_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="active", index=True
    )
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    # relationships
    tenant = relationship("Tenant", back_populates="whatsapp_numbers")
    conversations = relationship("Conversation", back_populates="whatsapp_number", lazy="selectin")

    def __repr__(self) -> str:
        return f"<WhatsAppNumber {self.display_phone_number}>"
