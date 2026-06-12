"""Tenant ORM model — each record is one client."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.modules.auth.models import PaymentStatus, TenantStatus


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=TenantStatus.ACTIVE, index=True
    )
    plan: Mapped[str] = mapped_column(String(50), nullable=False, default="basic")
    timezone: Mapped[str] = mapped_column(String(50), nullable=False, default="America/Bogota")
    locale: Mapped[str] = mapped_column(String(10), nullable=False, default="es-CO")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    business_profile: Mapped[dict | None] = mapped_column(JSONB, nullable=True, default=None)

    payment_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=PaymentStatus.PENDING, index=True
    )
    plan_activated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
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
    whatsapp_numbers = relationship(
        "WhatsAppNumber", back_populates="tenant", lazy="selectin",
        cascade="all, delete-orphan",
    )
    ai_agents = relationship(
        "AiAgent", back_populates="tenant", lazy="selectin",
        cascade="all, delete-orphan",
    )
    platform_connections = relationship(
        "PlatformConnection", back_populates="tenant", lazy="selectin",
        cascade="all, delete-orphan",
    )
    conversations = relationship(
        "Conversation", back_populates="tenant", lazy="selectin",
        cascade="all, delete-orphan",
    )
    user_associations: Mapped[list["UserTenant"]] = relationship(
        "UserTenant", back_populates="tenant", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Tenant {self.slug} ({self.status})>"
