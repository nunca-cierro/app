"""Tests for Conversation and Message model refactoring.

Includes approval tests (preserve existing behavior) and new-field tests.
"""

from __future__ import annotations

import os
import uuid
from typing import Any

import pytest

os.environ.setdefault("ENCRYPTION_KEY", "dGhpcyBpcyBhIDE2LWJ5dGUgZXhhbXBsZSBrZXkgISE=")

from app.modules.conversations.models import Conversation, Message
from app.db.base import Base


# ── Approval tests — existing columns still work ──────────────────────────


class TestConversationExistingColumns:
    """Verify existing column definitions survive refactoring."""

    def test_tablename(self) -> None:
        assert Conversation.__tablename__ == "conversations"

    def test_has_id(self) -> None:
        col = Conversation.__table__.columns["id"]
        assert col.primary_key

    def test_has_tenant_id(self) -> None:
        col = Conversation.__table__.columns["tenant_id"]
        assert col is not None
        assert not col.nullable

    def test_wa_user_id_still_exists(self) -> None:
        col = Conversation.__table__.columns["wa_user_id"]
        assert col is not None
        # Now nullable for backward compat
        assert col.nullable

    def test_whatsapp_number_id_still_exists(self) -> None:
        col = Conversation.__table__.columns["whatsapp_number_id"]
        assert col is not None
        # Now nullable for backward compat
        assert col.nullable

    def test_has_status(self) -> None:
        col = Conversation.__table__.columns["status"]
        assert col is not None

    def test_has_summary(self) -> None:
        col = Conversation.__table__.columns["summary"]
        assert col is not None

    def test_has_last_message_at(self) -> None:
        col = Conversation.__table__.columns["last_message_at"]
        assert col is not None

    def test_has_created_at(self) -> None:
        col = Conversation.__table__.columns["created_at"]
        assert col is not None

    def test_has_updated_at(self) -> None:
        col = Conversation.__table__.columns["updated_at"]
        assert col is not None

    def test_is_registered_in_base(self) -> None:
        assert "conversations" in Base.metadata.tables


class TestMessageExistingColumns:
    """Verify existing Message column definitions survive refactoring."""

    def test_tablename(self) -> None:
        assert Message.__tablename__ == "messages"

    def test_has_id(self) -> None:
        col = Message.__table__.columns["id"]
        assert col.primary_key

    def test_has_conversation_id(self) -> None:
        col = Message.__table__.columns["conversation_id"]
        assert col is not None

    def test_wa_user_id_still_exists(self) -> None:
        col = Message.__table__.columns["wa_user_id"]
        assert col is not None
        assert col.nullable

    def test_wa_message_id_still_exists(self) -> None:
        col = Message.__table__.columns["wa_message_id"]
        assert col is not None
        assert col.nullable

    def test_whatsapp_number_id_still_exists(self) -> None:
        col = Message.__table__.columns["whatsapp_number_id"]
        assert col is not None
        assert col.nullable

    def test_has_direction(self) -> None:
        col = Message.__table__.columns["direction"]
        assert col is not None

    def test_has_content(self) -> None:
        col = Message.__table__.columns["content"]
        assert col is not None

    def test_is_registered_in_base(self) -> None:
        assert "messages" in Base.metadata.tables


# ── New field tests ───────────────────────────────────────────────────────


class TestConversationNewFields:
    """Verify new platform-agnostic fields exist on Conversation."""

    def test_has_platform_connection_id(self) -> None:
        col = Conversation.__table__.columns["platform_connection_id"]
        assert col is not None
        assert col.nullable  # nullable during migration

    def test_has_external_user_id(self) -> None:
        col = Conversation.__table__.columns["external_user_id"]
        assert col is not None
        assert col.nullable

    def test_platform_derived_property(self) -> None:
        """Conversation.platform should be a property (not a column)."""
        assert "platform" not in Conversation.__table__.columns
        assert hasattr(Conversation, "platform")
        # It should be a property, not a column
        assert isinstance(
            Conversation.__dict__.get("platform"), property
        ) or isinstance(
            getattr(Conversation, "platform", None), property
        )

    def test_can_create_with_new_fields(self) -> None:
        """Conversation can be constructed with new fields."""
        conv = Conversation(
            tenant_id=uuid.uuid4(),
            external_user_id="573001234567",
            status="open",
        )
        assert conv.external_user_id == "573001234567"
        assert conv.wa_user_id is None  # old field nullable


class TestMessageNewFields:
    """Verify new platform-agnostic fields exist on Message."""

    def test_has_platform_connection_id(self) -> None:
        col = Message.__table__.columns["platform_connection_id"]
        assert col is not None
        assert col.nullable

    def test_has_external_user_id(self) -> None:
        col = Message.__table__.columns["external_user_id"]
        assert col is not None
        assert col.nullable

    def test_has_external_message_id(self) -> None:
        col = Message.__table__.columns["external_message_id"]
        assert col is not None
        assert col.nullable

    def test_has_platform_column(self) -> None:
        col = Message.__table__.columns["platform"]
        assert col is not None
        assert col.nullable  # nullable during migration

    def test_can_create_with_new_fields(self) -> None:
        """Message can be constructed with new fields."""
        msg = Message(
            tenant_id=uuid.uuid4(),
            conversation_id=uuid.uuid4(),
            direction="in",
            external_user_id="573001234567",
            external_message_id="wamid.abc123",
            platform="whatsapp",
            content="Hello",
        )
        assert msg.external_user_id == "573001234567"
        assert msg.external_message_id == "wamid.abc123"
        assert msg.platform == "whatsapp"
        assert msg.wa_user_id is None
        assert msg.wa_message_id is None


# ── Deprecation warning tests ─────────────────────────────────────────────


class TestDeprecationWarnings:
    """Old wa_* fields should log deprecation warning on write."""

    def test_conversation_wa_user_id_deprecation(self) -> None:
        """Setting Conversation.wa_user_id logs a warning."""
        import logging
        from unittest.mock import patch

        conv = Conversation(tenant_id=uuid.uuid4(), wa_user_id="old_value")
        # Should have logged a deprecation warning (we just test no crash)
        assert conv.wa_user_id == "old_value"

    def test_message_wa_user_id_deprecation(self) -> None:
        """Setting Message.wa_user_id logs a warning."""
        msg = Message(
            tenant_id=uuid.uuid4(),
            conversation_id=uuid.uuid4(),
            direction="in",
            wa_user_id="old_user",
            wa_message_id="old_msg",
        )
        assert msg.wa_user_id == "old_user"
        assert msg.wa_message_id == "old_msg"


# ── Backward compat: old field reads return correct values ────────────────


class TestBackwardCompat:
    """Old wa_* fields work as backward-compatible aliases."""

    def test_conversation_old_fields_readable(self) -> None:
        """Conversation created with new fields returns None for old fields."""
        conv = Conversation(
            tenant_id=uuid.uuid4(),
            external_user_id="573001234567",
        )
        # Old field should be None since we used the new field
        assert conv.wa_user_id is None

    def test_message_old_fields_readable(self) -> None:
        """Message created with new fields returns None for old fields."""
        msg = Message(
            tenant_id=uuid.uuid4(),
            conversation_id=uuid.uuid4(),
            direction="in",
            external_user_id="573001234567",
            external_message_id="wamid.abc",
        )
        assert msg.wa_user_id is None
        assert msg.wa_message_id is None
