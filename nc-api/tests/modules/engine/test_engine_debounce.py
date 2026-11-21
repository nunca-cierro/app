"""Unit tests for engine non-blocking debounce buffer operations."""

from __future__ import annotations

import pytest
from app.modules.engine.debounce import (
    flush_debounce_buffer,
    push_debounce_message,
)


@pytest.mark.asyncio
class TestEngineDebounce:
    """Debounce Redis buffer push and flush tests."""

    async def test_push_and_flush_messages_chronologically(self) -> None:
        user_id = "573001112233"
        conn_id = "test-conn-123"

        # Ensure buffer starts empty
        await flush_debounce_buffer(user_id, conn_id)

        msg1 = {"content": "Hola", "external_message_id": "m1"}
        msg2 = {"content": "quiero agendar", "external_message_id": "m2"}
        msg3 = {"content": "una cita", "external_message_id": "m3"}

        size1 = await push_debounce_message(user_id, conn_id, msg1)
        size2 = await push_debounce_message(user_id, conn_id, msg2)
        size3 = await push_debounce_message(user_id, conn_id, msg3)

        assert size1 == 1
        assert size2 == 2
        assert size3 == 3

        flushed = await flush_debounce_buffer(user_id, conn_id)
        assert len(flushed) == 3
        assert flushed[0]["content"] == "Hola"
        assert flushed[1]["content"] == "quiero agendar"
        assert flushed[2]["content"] == "una cita"

        # Second flush must be empty
        flushed_again = await flush_debounce_buffer(user_id, conn_id)
        assert flushed_again == []
