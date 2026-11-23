"""Tests for extract_evolution_message JID filtering (groups, broadcast, channels)."""

from __future__ import annotations

from app.modules.evolution.webhook import extract_evolution_message


def _make_event(remote_jid: str, text: str = "Hola") -> dict:
    return {
        "event": "messages.upsert",
        "instance": "test-instance",
        "data": {
            "key": {
                "remoteJid": remote_jid,
                "fromMe": False,
                "id": "MSG_123",
            },
            "messageType": "conversation",
            "message": {
                "conversation": text,
            },
        },
    }


def test_individual_message_is_extracted() -> None:
    event = _make_event("573001234567@s.whatsapp.net", "Hola")
    parsed = extract_evolution_message(event)
    assert parsed is not None
    assert parsed["external_user_id"] == "573001234567"
    assert parsed["remote_jid"] == "573001234567@s.whatsapp.net"
    assert parsed["content"] == "Hola"


def test_group_message_is_ignored() -> None:
    event = _make_event("120363048593847593@g.us", "Mensaje en grupo")
    parsed = extract_evolution_message(event)
    assert parsed is None


def test_status_broadcast_is_ignored() -> None:
    event = _make_event("status@broadcast", "Estado")
    parsed = extract_evolution_message(event)
    assert parsed is None


def test_newsletter_channel_is_ignored() -> None:
    event = _make_event("120363048593847593@newsletter", "Canal")
    parsed = extract_evolution_message(event)
    assert parsed is None
