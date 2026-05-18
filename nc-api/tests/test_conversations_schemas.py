"""Tests for Conversation and Message Pydantic schema refactoring."""

from __future__ import annotations

import uuid
from datetime import datetime

import pytest

from app.modules.conversations.schemas import ConversationResponse, MessageResponse


class TestConversationResponseNewFields:
    """New platform-agnostic fields are present in ConversationResponse."""

    def test_has_platform_connection_id(self) -> None:
        schema = ConversationResponse(
            id=uuid.uuid4(),
            tenant_id=uuid.uuid4(),
            platform_connection_id=uuid.uuid4(),
            external_user_id="573001234567",
            status="open",
            message_count=3,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        assert schema.platform_connection_id is not None
        assert schema.external_user_id == "573001234567"

    def test_has_platform_field(self) -> None:
        schema = ConversationResponse(
            id=uuid.uuid4(),
            tenant_id=uuid.uuid4(),
            platform_connection_id=uuid.uuid4(),
            external_user_id="user",
            status="open",
            platform="whatsapp",
            message_count=0,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        assert schema.platform == "whatsapp"

    def test_platform_defaults_to_none(self) -> None:
        schema = ConversationResponse(
            id=uuid.uuid4(),
            tenant_id=uuid.uuid4(),
            external_user_id="user",
            status="open",
            message_count=0,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        assert schema.platform is None

    def test_old_fields_optional(self) -> None:
        """Old wa_user_id and whatsapp_number_id can be None."""
        schema = ConversationResponse(
            id=uuid.uuid4(),
            tenant_id=uuid.uuid4(),
            status="open",
            message_count=0,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        assert schema.whatsapp_number_id is None
        assert schema.wa_user_id is None

    def test_old_fields_still_work(self) -> None:
        """Old fields still accept values for backward compat."""
        schema = ConversationResponse(
            id=uuid.uuid4(),
            tenant_id=uuid.uuid4(),
            whatsapp_number_id=uuid.uuid4(),
            wa_user_id="old_wa_user",
            status="open",
            message_count=0,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        assert schema.whatsapp_number_id is not None
        assert schema.wa_user_id == "old_wa_user"

    def test_external_user_id_default_none(self) -> None:
        schema = ConversationResponse(
            id=uuid.uuid4(),
            tenant_id=uuid.uuid4(),
            status="open",
            message_count=0,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        assert schema.external_user_id is None

    def test_has_message_count_default(self) -> None:
        schema = ConversationResponse(
            id=uuid.uuid4(),
            tenant_id=uuid.uuid4(),
            status="open",
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        assert schema.message_count == 0


class TestMessageResponseNewFields:
    """New platform-agnostic fields are present in MessageResponse."""

    def test_has_external_user_id(self) -> None:
        schema = MessageResponse(
            id=uuid.uuid4(),
            conversation_id=uuid.uuid4(),
            direction="in",
            external_user_id="573001234567",
            external_message_id="wamid.abc",
            platform="whatsapp",
            message_type="text",
            content="Hello",
            status="received",
            created_at=datetime.now(),
        )
        assert schema.external_user_id == "573001234567"
        assert schema.external_message_id == "wamid.abc"
        assert schema.platform == "whatsapp"

    def test_external_fields_default_none(self) -> None:
        schema = MessageResponse(
            id=uuid.uuid4(),
            conversation_id=uuid.uuid4(),
            direction="in",
            message_type="text",
            status="received",
            content="Hello",
            created_at=datetime.now(),
        )
        assert schema.external_user_id is None
        assert schema.external_message_id is None
        assert schema.platform is None

    def test_old_fields_optional(self) -> None:
        """Old wa_user_id and wa_message_id can be None."""
        schema = MessageResponse(
            id=uuid.uuid4(),
            conversation_id=uuid.uuid4(),
            direction="in",
            message_type="text",
            status="received",
            created_at=datetime.now(),
        )
        assert schema.wa_user_id is None
        assert schema.wa_message_id is None

    def test_old_fields_still_work(self) -> None:
        """Old fields still accept values for backward compat."""
        schema = MessageResponse(
            id=uuid.uuid4(),
            conversation_id=uuid.uuid4(),
            direction="in",
            wa_user_id="old_user",
            wa_message_id="old_msg",
            message_type="text",
            status="received",
            created_at=datetime.now(),
        )
        assert schema.wa_user_id == "old_user"
        assert schema.wa_message_id == "old_msg"
