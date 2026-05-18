"""Conversation and Message ORM models — now platform-agnostic.

New platform-agnostic fields (``platform_connection_id``, ``external_user_id``,
``external_message_id``) have been added alongside the old WhatsApp-specific
fields.  The old ``wa_*`` columns are kept as **nullable backward-compatible
aliases** — they log a deprecation warning on write.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from loguru import logger
from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship, validates

from app.db.base import Base


class Conversation(Base):
    """A conversation between a tenant and an external user.

    ``platform`` is a **derived property** — computed from the related
    ``PlatformConnection.platform_type`` rather than stored directly.
    """

    __tablename__ = "conversations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True
    )

    # ── New platform-agnostic fields ───────────────────────────────────────
    platform_connection_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("platform_connections.id"),
        nullable=True,
        index=True,
    )
    external_user_id: Mapped[str | None] = mapped_column(
        String(100), nullable=True, index=True
    )

    # ── Old WhatsApp fields (deprecated — nullable backward compat) ────────
    whatsapp_number_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("whatsapp_numbers.id"),
        nullable=True,
        index=True,
    )
    wa_user_id: Mapped[str | None] = mapped_column(
        String(100), nullable=True, index=True
    )

    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="open"
    )
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_message_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    extra_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True, default=dict)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    # ── Relationships ──────────────────────────────────────────────────────
    tenant = relationship("Tenant", back_populates="conversations")
    whatsapp_number = relationship("WhatsAppNumber", back_populates="conversations")
    platform_connection = relationship(
        "PlatformConnection", backref="conversations", lazy="selectin"
    )
    messages = relationship(
        "Message", back_populates="conversation", lazy="selectin",
        cascade="all, delete-orphan",
    )

    # ── Derived property ───────────────────────────────────────────────────
    @property
    def platform(self) -> str | None:
        """Derive platform from the related PlatformConnection."""
        if self.platform_connection is not None:
            return self.platform_connection.platform_type
        # Fall back to "whatsapp" if we still have an old-style number
        if self.whatsapp_number_id is not None:
            return "whatsapp"
        return None

    # ── Deprecation validators ─────────────────────────────────────────────

    @validates("wa_user_id")
    def _deprecate_wa_user_id(self, key: str, value: str | None) -> str | None:
        if value is not None:
            logger.warning(
                "Deprecation: Conversation.{key} is deprecated — "
                "use external_user_id instead",
                key=key,
            )
        return value

    def __repr__(self) -> str:
        uid = self.external_user_id or self.wa_user_id or "?"
        return f"<Conversation {uid} ({self.status})>"


class Message(Base):
    """A single message within a conversation — platform-agnostic."""

    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id"),
        nullable=False,
        index=True,
    )

    # ── New platform-agnostic fields ───────────────────────────────────────
    platform_connection_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("platform_connections.id"),
        nullable=True,
        index=True,
    )
    external_user_id: Mapped[str | None] = mapped_column(
        String(100), nullable=True, index=True
    )
    external_message_id: Mapped[str | None] = mapped_column(
        String(100), nullable=True, index=True
    )
    platform: Mapped[str | None] = mapped_column(
        String(30), nullable=True, index=True
    )

    # ── Old WhatsApp fields (deprecated — nullable backward compat) ────────
    whatsapp_number_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("whatsapp_numbers.id"), nullable=True
    )
    wa_message_id: Mapped[str | None] = mapped_column(
        String(100), unique=True, nullable=True
    )
    wa_user_id: Mapped[str | None] = mapped_column(
        String(100), nullable=True, index=True
    )

    direction: Mapped[str] = mapped_column(
        String(10), nullable=False
    )  # 'in' or 'out'
    message_type: Mapped[str] = mapped_column(
        String(30), nullable=False, default="text"
    )
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="received"
    )
    payload: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    # relationships
    conversation: Mapped[Conversation] = relationship(
        "Conversation", back_populates="messages"
    )

    # ── Deprecation validators ─────────────────────────────────────────────

    @validates("wa_user_id", "wa_message_id")
    def _deprecate_wa_field(self, key: str, value: str | None) -> str | None:
        if value is not None:
            mapping = {
                "wa_user_id": "external_user_id",
                "wa_message_id": "external_message_id",
            }
            logger.warning(
                "Deprecation: Message.{key} is deprecated — "
                "use {replacement} instead",
                key=key,
                replacement=mapping.get(key, "?"),
            )
        return value

    def __repr__(self) -> str:
        return f"<Message {self.direction} [{self.status}]>"
