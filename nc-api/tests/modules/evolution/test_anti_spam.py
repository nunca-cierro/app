"""Unit tests for anti-spam detection layers — TDD RED phase."""

from __future__ import annotations

from unittest.mock import patch

import pytest

from app.modules.evolution.anti_spam import SpamDetector, SpamResult


# ── SpamResult ─────────────────────────────────────────────────────────────


class TestSpamResult:
    """SpamResult dataclass contract tests."""

    def test_to_dict_returns_all_fields(self) -> None:
        result = SpamResult(
            is_spam=True,
            spam_reason="auto_reply",
            spam_score=85,
            detection_layers=["auto_reply"],
            action="block",
        )
        d = result.to_dict()
        assert d["is_spam"] is True
        assert d["spam_reason"] == "auto_reply"
        assert d["spam_score"] == 85
        assert d["detection_layers"] == ["auto_reply"]
        assert d["action"] == "block"

    def test_default_values_are_pass(self) -> None:
        result = SpamResult()
        assert result.is_spam is False
        assert result.spam_reason is None
        assert result.spam_score == 0
        assert result.detection_layers == []
        assert result.action == "pass"

    def test_to_dict_defaults(self) -> None:
        result = SpamResult()
        d = result.to_dict()
        assert d["is_spam"] is False
        assert d["spam_reason"] is None
        assert d["spam_score"] == 0
        assert d["detection_layers"] == []
        assert d["action"] == "pass"


# ── Auto-reply detection ──────────────────────────────────────────────────


class TestAutoReplyDetection:
    """Layer 1: Spanish auto-reply regex detection (requires ≥2 matches)."""

    def setup_method(self) -> None:
        self.detector = SpamDetector()

    @pytest.mark.parametrize(
        "text",
        [
            "Gracias por contactarnos, en breve te atenderemos",
            "gracias por escribir, pronto nos pondremos en contacto",
            "Gracias por comunicarte con nosotros, bienvenido a nuestra tienda",
            "Bienvenido a nuestro servicio, gracias por tu mensaje",
            "gracias por tu mensaje, te atenderemos en breve",
            "Te atenderemos en breve, pronto nos pondremos en contacto",
            "Pronto nos pondremos en contacto, gracias por comunicarte",
            "Recibirás una respuesta, gracias por tu mensaje",
            "Hemos recibido tu solicitud, te atenderemos en breve",
        ],
        ids=[
            "gracias_por_contactar",
            "gracias_por_escribir",
            "gracias_por_comunicarte",
            "bienvenido_a",
            "gracias_por_tu_mensaje",
            "te_atenderemos_en_breve",
            "pronto_nos_pondremos_en_contacto",
            "recibiras_una_respuesta",
            "hemos_recibido_tu",
        ],
    )
    def test_auto_reply_detected(self, text: str) -> None:
        """Each known pattern matched against the text should trigger when ≥2 match."""
        result = self.detector.check_auto_reply(text)
        assert result.is_spam is True
        assert result.spam_reason == "auto_reply"
        assert "auto_reply" in result.detection_layers
        assert result.spam_score >= 80

    def test_single_pattern_does_not_trigger(self) -> None:
        """A message matching only 1 pattern is NOT classified as auto-reply."""
        result = self.detector.check_auto_reply("Gracias por tu mensaje, lo revisaremos")
        assert result.is_spam is False

    def test_legitimate_message_not_spam(self) -> None:
        """Normal customer messages must not be flagged."""
        texts = [
            "Hola, ¿cuánto cuesta el menú ejecutivo?",
            "Quisiera hacer una reserva para esta noche",
            "¿Tienen envíos a domicilio?",
            "Buenos días, necesito información sobre mi pedido",
            "Gracias por la atención, me fue muy útil",
        ]
        for text in texts:
            result = self.detector.check_auto_reply(text)
            assert result.is_spam is False, f"False positive on: {text}"

    def test_case_insensitive_matching(self) -> None:
        """Patterns must match regardless of case."""
        result = self.detector.check_auto_reply(
            "GRACIAS POR CONTACTAR, EN BREVE TE ATENDEREMOS"
        )
        assert result.is_spam is True

    def test_unicode_patterns(self) -> None:
        """Patterns with accents and tildes must match correctly."""
        result = self.detector.check_auto_reply(
            "Gracias por comunicarte, en breve te atenderemos"
        )
        assert result.is_spam is True

    @pytest.mark.parametrize(
        "text",
        [
            "gracias por contactar y bienvenido a nuestra tienda",
            "hemos recibido tu mensaje, gracias por comunicarte",
            "gracias por tu mensaje, te atenderemos en breve",
        ],
        ids=[
            "gracias_contactar_and_bienvenido",
            "hemos_recibido_and_gracias_comunicarte",
            "gracias_mensaje_and_atenderemos_breve",
        ],
    )
    def test_auto_reply_multiple_patterns(self, text: str) -> None:
        """Messages with 2+ distinct pattern matches are classified as spam."""
        result = self.detector.check_auto_reply(text)
        assert result.is_spam is True
        assert len(result.detection_layers) >= 1  # detected by auto_reply layer


# ── Flood detection ───────────────────────────────────────────────────────


class TestFloodDetection:
    """Layer 2: Flood rate limiter — 5 msgs / 30s sliding window."""

    def setup_method(self) -> None:
        self.detector = SpamDetector()

    def test_normal_volume_allowed(self) -> None:
        """4 messages in 30s must pass through."""
        with patch("app.core.rate_limiter.time.time") as mock_time:
            mock_time.return_value = 1000.0
            for i in range(4):
                r = self.detector.check_flood(f"user{i}", "conn1")
                assert r.is_spam is False, f"Message {i+1} should be allowed"

    def test_flood_blocked_on_6th_message(self) -> None:
        """6th message in 30s window must be blocked."""
        with patch("app.core.rate_limiter.time.time") as mock_time:
            base = 1000.0
            mock_time.return_value = base
            for i in range(5):
                r = self.detector.check_flood("user1", "conn1")
                assert r.is_spam is False, f"Request {i+1} should be allowed"

            result = self.detector.check_flood("user1", "conn1")
            assert result.is_spam is True
            assert result.spam_reason == "flood"
            assert "flood" in result.detection_layers
            assert result.spam_score >= 80

    def test_different_user_not_blocked(self) -> None:
        """Flood scoped to one user must not affect another."""
        with patch("app.core.rate_limiter.time.time") as mock_time:
            mock_time.return_value = 1000.0
            for _ in range(6):
                self.detector.check_flood("user1", "conn1")

            result = self.detector.check_flood("user2", "conn1")
            assert result.is_spam is False

    def test_different_connection_not_blocked(self) -> None:
        """Flood scoped to one connection must not affect another."""
        with patch("app.core.rate_limiter.time.time") as mock_time:
            mock_time.return_value = 1000.0
            for _ in range(6):
                self.detector.check_flood("user1", "conn1")

            result = self.detector.check_flood("user1", "conn2")
            assert result.is_spam is False

    def test_window_expiry(self) -> None:
        """After 30 seconds, the window resets and messages are allowed again."""
        with patch("app.core.rate_limiter.time.time") as mock_time:
            mock_time.return_value = 1000.0
            for _ in range(5):
                self.detector.check_flood("user1", "conn1")

            # 6th blocked
            result = self.detector.check_flood("user1", "conn1")
            assert result.is_spam is True

            # Advance past the 30s window
            mock_time.return_value = 1031.0
            result = self.detector.check_flood("user1", "conn1")
            assert result.is_spam is False


# ── Repetitive detection ──────────────────────────────────────────────────


class TestRepetitiveDetection:
    """Layer 3: Repetitive message detection — 3× exact match in last 10."""

    def setup_method(self) -> None:
        self.detector = SpamDetector()

    def test_three_repetitions_detected(self) -> None:
        """Same text 3+ times in history must be flagged."""
        history = ["Hola mundo", "¿Qué tal?", "Hola mundo", "Bien", "Hola mundo", "Quiero info"]
        result = self.detector.check_repetitive("Hola mundo", history)
        assert result.is_spam is True
        assert result.spam_reason == "repetitive"
        assert "repetitive" in result.detection_layers
        assert result.spam_score >= 80

    def test_two_repetitions_allowed(self) -> None:
        """Only 2 matches in history must NOT be flagged."""
        history = ["Hola mundo", "Hola mundo"]
        result = self.detector.check_repetitive("Hola mundo", history)
        assert result.is_spam is False

    def test_short_messages_ignored(self) -> None:
        """Messages shorter than 5 chars must be ignored."""
        history = ["sí", "sí", "sí", "sí"]
        result = self.detector.check_repetitive("sí", history)
        assert result.is_spam is False

    def test_empty_history_passes(self) -> None:
        """No history means no repetitive detection possible."""
        result = self.detector.check_repetitive("Hola mundo", [])
        assert result.is_spam is False

    def test_only_last_10_considered(self) -> None:
        """Only the last 10 messages are examined."""
        # 10 messages: 9 "Reclamo" + 1 "Adiós" — last 10 includes current text's count
        history = ["Reclamo"] * 9 + ["Adiós"]
        # In the last 10, "Reclamo" appears 9 times
        result = self.detector.check_repetitive("Reclamo", history)
        assert result.is_spam is True

    def test_short_message_in_history_excluded(self) -> None:
        """Short history messages (<5 chars) must not count toward repetition."""
        history = ["ok", "ok", "Hola mundo", "ok", "si", "Hola mundo"]
        # "ok" and "si" are <5 chars and excluded from count
        # "Hola mundo" appears 2 times in history → not enough
        result = self.detector.check_repetitive("Hola mundo", history)
        assert result.is_spam is False

    def test_long_text_repetition(self) -> None:
        """Longer repeated text is also detected."""
        text = "Quiero cancelar mi pedido por favor"
        history = [
            "Quiero cancelar mi pedido por favor",
            "Necesito ayuda",
            "Quiero cancelar mi pedido por favor",
            "Quiero cancelar mi pedido por favor",
        ]
        result = self.detector.check_repetitive(text, history)
        assert result.is_spam is True


# ── Full check (integration of layers) ────────────────────────────────────


class TestFullCheck:
    """SpamDetector.full_check — runs auto-reply + flood in sequence."""

    def setup_method(self) -> None:
        self.detector = SpamDetector()

    def test_auto_reply_short_circuits_flood(self) -> None:
        """Auto-reply detected should return before flood check runs."""
        text = "Gracias por contactarnos, en breve te atenderemos"
        with patch("app.core.rate_limiter.time.time") as mock_time:
            mock_time.return_value = 1000.0
            result = self.detector.full_check(
                text=text,
                user_id="user1",
                conn_id="conn1",
                config={"mode": "block", "enabled": True},
            )
        assert result.is_spam is True
        assert result.spam_reason == "auto_reply"
        # Flood was not checked, so flood layer should not appear
        assert "flood" not in result.detection_layers

    def test_normal_message_passes_all_layers(self) -> None:
        """Legitimate message passes both layers."""
        with patch("app.core.rate_limiter.time.time") as mock_time:
            mock_time.return_value = 1000.0
            result = self.detector.full_check(
                text="Hola, ¿cómo estás?",
                user_id="user1",
                conn_id="conn1",
                config={"mode": "block", "enabled": True},
            )
        assert result.is_spam is False
        assert result.action == "pass"

    def test_disabled_config_skips_all(self) -> None:
        """When config.enabled is False, all checks are skipped."""
        result = self.detector.full_check(
            text="Gracias por contactarnos, en breve te atenderemos",
            user_id="user1",
            conn_id="conn1",
            config={"enabled": False},
        )
        assert result.is_spam is False
        assert result.action == "pass"

    def test_flood_detected_in_full_check(self) -> None:
        """Flood detection works inside full_check when auto-reply passes."""
        with patch("app.core.rate_limiter.time.time") as mock_time:
            mock_time.return_value = 1000.0
            # 5 allowed calls
            for _ in range(5):
                self.detector.full_check(
                    text="Hola, ¿cómo estás?",
                    user_id="user1",
                    conn_id="conn1",
                    config={"mode": "block", "enabled": True},
                )
            # 6th should be flood-blocked
            result = self.detector.full_check(
                text="Hola, ¿cómo estás?",
                user_id="user1",
                conn_id="conn1",
                config={"mode": "block", "enabled": True},
            )
        assert result.is_spam is True
        assert result.spam_reason == "flood"


# ── Config resolution ─────────────────────────────────────────────────────


class TestConfigResolution:
    """_resolve_anti_spam_config standalone tests."""

    def test_default_config(self) -> None:
        """When no config provided, defaults are used."""
        from app.modules.evolution.anti_spam import _resolve_anti_spam_config

        config = _resolve_anti_spam_config(None)
        assert config["enabled"] is True
        assert config["mode"] == "log"
        assert config["flood_threshold"] == 5
        assert config["flood_window_seconds"] == 30

    def test_config_overrides_defaults(self) -> None:
        """Per-connection config fields override defaults."""
        from app.modules.evolution.anti_spam import _resolve_anti_spam_config

        override = {
            "enabled": True,
            "mode": "block",
            "flood_threshold": 10,
        }
        config = _resolve_anti_spam_config(override)
        assert config["mode"] == "block"
        assert config["flood_threshold"] == 10
        # Non-overridden fields stay at defaults
        assert config["flood_window_seconds"] == 30

    def test_empty_dict_uses_defaults(self) -> None:
        """Empty per-connection config falls back to defaults."""
        from app.modules.evolution.anti_spam import _resolve_anti_spam_config

        config = _resolve_anti_spam_config({})
        assert config["enabled"] is True
        assert config["mode"] == "log"
