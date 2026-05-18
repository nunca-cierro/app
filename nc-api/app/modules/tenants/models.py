"""Tenant ORM model — each record is one client."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="active", index=True
    )
    plan: Mapped[str] = mapped_column(String(50), nullable=False, default="basic")
    timezone: Mapped[str] = mapped_column(String(50), nullable=False, default="America/Bogota")
    locale: Mapped[str] = mapped_column(String(10), nullable=False, default="es-CO")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    # relationships
    whatsapp_numbers = relationship("WhatsAppNumber", back_populates="tenant", lazy="selectin")
    ai_agents = relationship("AiAgent", back_populates="tenant", lazy="selectin")
    conversations = relationship("Conversation", back_populates="tenant", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Tenant {self.slug} ({self.status})>"
