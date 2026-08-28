"""Unit tests for universal WhatsApp formatting rules (subordinate prompt block)."""

from __future__ import annotations

from app.modules.agents.utils import UNIVERSAL_FORMAT_RULES, universal_format_block


class TestUniversalFormatBlock:
    """universal_format_block returns the constant text with fallback semantics."""

    def test_returns_nonempty_text(self) -> None:
        block = universal_format_block()
        assert isinstance(block, str)
        assert block.strip() != ""

    def test_returns_the_constant(self) -> None:
        assert universal_format_block() == UNIVERSAL_FORMAT_RULES

    def test_mentions_fallback_semantics(self) -> None:
        block = universal_format_block()
        # Subordinate to business instructions — the core contract.
        assert "SOLO si las instrucciones del negocio no indican lo contrario" in block

    def test_covers_whatsapp_native_defaults(self) -> None:
        block = universal_format_block()
        assert "WhatsApp" in block
        assert "markdown" in block
        assert "mismo idioma" in block
        assert "máximo una pregunta por mensaje" in block
