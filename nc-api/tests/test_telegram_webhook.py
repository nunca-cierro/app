"""Tests for Telegram Update → internal Message model conversion."""

from __future__ import annotations

import os

import pytest

os.environ.setdefault("ENCRYPTION_KEY", "dGhpcyBpcyBhIDE2LWJ5dGUgZXhhbXBsZSBrZXkgISE=")

from app.modules.telegram.webhook import extract_telegram_message


class TestExtractTelegramMessage:
    """extract_telegram_message converts Telegram Update → internal format."""

    def test_extracts_text_message(self) -> None:
        """A text message update returns parsed fields."""
        update = {
            "update_id": 100,
            "message": {
                "message_id": 42,
                "from": {"id": 56789, "is_bot": False, "first_name": "Alice"},
                "chat": {"id": 56789, "type": "private"},
                "date": 1700000000,
                "text": "Hello from Telegram!",
            },
        }

        result = extract_telegram_message(update)
        assert result is not None
        assert result["external_user_id"] == "56789"
        assert result["external_message_id"] == "42"
        assert result["content"] == "Hello from Telegram!"
        assert result["chat_id"] == "56789"

    def test_returns_none_for_callback_query(self) -> None:
        """A callback_query update (not a message) returns None."""
        update = {
            "update_id": 101,
            "callback_query": {
                "id": "cb123",
                "from": {"id": 56789, "is_bot": False},
                "data": "button_click",
            },
        }

        result = extract_telegram_message(update)
        assert result is None

    def test_returns_none_for_channel_post(self) -> None:
        """A channel_post update (not a private/group message) returns None."""
        update = {
            "update_id": 102,
            "channel_post": {
                "message_id": 1,
                "chat": {"id": -100123, "type": "channel"},
                "text": "Channel broadcast",
            },
        }

        result = extract_telegram_message(update)
        assert result is None

    def test_returns_none_for_edited_message(self) -> None:
        """An edited_message update returns None."""
        update = {
            "update_id": 103,
            "edited_message": {
                "message_id": 10,
                "chat": {"id": 56789, "type": "private"},
                "text": "Edited text",
            },
        }

        result = extract_telegram_message(update)
        assert result is None

    def test_returns_none_when_no_message_key(self) -> None:
        """An update dict without 'message' key returns None."""
        result = extract_telegram_message({"update_id": 999})
        assert result is None

    def test_extracts_reply_to_message_id(self) -> None:
        """When the message is a reply, reply_to_message_id is included."""
        update = {
            "update_id": 200,
            "message": {
                "message_id": 50,
                "from": {"id": 56789, "is_bot": False},
                "chat": {"id": 56789, "type": "private"},
                "date": 1700000001,
                "reply_to_message": {
                    "message_id": 40,
                    "text": "Original",
                },
                "text": "Reply text",
            },
        }

        result = extract_telegram_message(update)
        assert result is not None
        assert result["reply_to_message_id"] == "40"
        assert result["content"] == "Reply text"

    def test_no_reply_to_message_when_not_present(self) -> None:
        """reply_to_message_id is None when message is not a reply."""
        update = {
            "update_id": 201,
            "message": {
                "message_id": 51,
                "from": {"id": 56789, "is_bot": False},
                "chat": {"id": 56789, "type": "private"},
                "date": 1700000002,
                "text": "Not a reply",
            },
        }

        result = extract_telegram_message(update)
        assert result is not None
        assert result["reply_to_message_id"] is None

    def test_extracts_parse_mode_hint(self) -> None:
        """parse_mode may be present if the incoming message has entities."""
        update = {
            "update_id": 300,
            "message": {
                "message_id": 60,
                "from": {"id": 56789, "is_bot": False},
                "chat": {"id": 56789, "type": "private"},
                "date": 1700000003,
                "text": "*bold text*",
                "entities": [{"type": "bold", "offset": 0, "length": 10}],
            },
        }

        result = extract_telegram_message(update)
        assert result is not None
        assert result["has_entities"] is True

    def test_external_user_id_is_chat_id_not_from_id(self) -> None:
        """external_user_id uses chat.id which differs from from.id in groups."""
        update = {
            "update_id": 350,
            "message": {
                "message_id": 65,
                "from": {"id": 99999, "is_bot": False, "first_name": "Bob"},
                "chat": {"id": -100123456, "type": "group", "title": "Test Group"},
                "date": 1700000005,
                "text": "Group message",
            },
        }

        result = extract_telegram_message(update)
        assert result is not None
        # external_user_id should be the chat_id (for replying), not the from.id
        assert result["external_user_id"] == "-100123456"
        assert result["chat_id"] == "-100123456"
        assert result["content"] == "Group message"

    def test_ignores_non_text_messages(self) -> None:
        """Messages without text (photo, sticker, etc.) return None."""
        update = {
            "update_id": 400,
            "message": {
                "message_id": 70,
                "from": {"id": 56789, "is_bot": False},
                "chat": {"id": 56789, "type": "private"},
                "date": 1700000004,
                "photo": [{"file_id": "abc123", "width": 100, "height": 100}],
            },
        }

        result = extract_telegram_message(update)
        assert result is None
