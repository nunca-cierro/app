"""Agnostic schemas and channel adapter protocol for message orchestration.

Decouples core business logic (tenancy, conversations, AI, cooldowns, dedup)
from platform-specific transports (Evolution API, Telegram Bot API, Meta WhatsApp).
"""

from __future__ import annotations

import typing as t
import uuid as uuid_pkg
from dataclasses import dataclass, field


@dataclass
class InboundMessage:
    """Normalized inbound message arriving from any messaging channel.

    Attributes:
        platform_connection_id: Database UUID of the platform connection.
        platform: Channel name (e.g. ``"evolution"``, ``"telegram"``, ``"whatsapp"``).
        external_user_id: Sender user identifier on the platform (phone number, chat ID).
        external_message_id: Unique message identifier assigned by the platform.
        content: Message text body.
        from_me: True if sent by the business/account owner rather than a customer.
        remote_jid: Full chat JID/identifier (especially for WhatsApp linked devices).
        raw_payload: Original webhook dictionary for logging or platform-specific data.
        metadata: Optional auxiliary parameters (pushName, quotedMessage, etc.).
    """

    platform_connection_id: uuid_pkg.UUID | str
    platform: str
    external_user_id: str
    external_message_id: str
    content: str
    from_me: bool = False
    remote_jid: str | None = None
    raw_payload: dict[str, t.Any] = field(default_factory=dict)
    metadata: dict[str, t.Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, t.Any]:
        """Serialize for Redis debounce buffering."""
        return {
            "platform_connection_id": str(self.platform_connection_id),
            "platform": self.platform,
            "external_user_id": self.external_user_id,
            "external_message_id": self.external_message_id,
            "content": self.content,
            "from_me": self.from_me,
            "remote_jid": self.remote_jid,
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, data: dict[str, t.Any]) -> InboundMessage:
        """Reconstruct from dictionary."""
        return cls(
            platform_connection_id=data.get("platform_connection_id", ""),
            platform=data.get("platform", ""),
            external_user_id=data.get("external_user_id", ""),
            external_message_id=data.get("external_message_id", ""),
            content=data.get("content", ""),
            from_me=data.get("from_me", False),
            remote_jid=data.get("remote_jid"),
            metadata=data.get("metadata", {}),
        )


@dataclass
class OutboundMessage:
    """Normalized outbound message to be dispatched and recorded in database.

    Attributes:
        tenant_id: Tenant UUID.
        conversation_id: Conversation UUID.
        platform_connection_id: PlatformConnection UUID.
        platform: Platform type (e.g. ``"evolution"``, ``"telegram"``).
        external_user_id: Target user or chat identifier.
        content: Message text to be sent.
        origin: Generation source (``"ai"``, ``"programmed"``, ``"escalation"``, ``"payment"``).
        status: Delivery status (``"sent"`` or ``"failed"``).
        external_message_id: ID returned by the platform API once sent.
        error_message: Optional error details if transmission failed.
    """

    tenant_id: uuid_pkg.UUID | str | None
    conversation_id: uuid_pkg.UUID | str | None
    platform_connection_id: uuid_pkg.UUID | str
    platform: str
    external_user_id: str
    content: str
    origin: str = "ai"
    status: str = "sent"
    external_message_id: str | None = None
    error_message: str | None = None


@dataclass
class HandoffEvent:
    """Structured event triggered when a conversation is escalated to human support."""

    conversation_id: uuid_pkg.UUID | str
    tenant_id: uuid_pkg.UUID | str
    external_user_id: str
    reason: str
    content: str


@t.runtime_checkable
class ChannelAdapter(t.Protocol):
    """Protocol that every channel transport must implement for sending."""

    async def send_message(
        self,
        connection: t.Any,
        to: str,
        text: str,
        **kwargs: t.Any,
    ) -> dict[str, t.Any]:
        """Send a text message via the channel platform."""
        ...
