"""Anti-spam detection engine — multi-layer filter for Evolution API messages.

Three synchronous detection layers:

1. **Auto-reply** — Spanish regex pattern matching (requires ≥2 matches)
2. **Flood** — Sliding window rate limiter per user + connection
3. **Repetitive** — Exact string match frequency in conversation history

Config is resolved per-message from ``PlatformConnection.extra_data.anti_spam``
with global fallback via ``settings.anti_spam_enabled``.
"""

from __future__ import annotations

import re
import typing as t
from dataclasses import dataclass, field

from loguru import logger

from app.core.rate_limiter import MemoryRateLimiter

# ── Types ───────────────────────────────────────────────────────────────────

# ── Default config ──────────────────────────────────────────────────────────

DEFAULT_CONFIG: dict[str, t.Any] = {
    "enabled": True,
    "mode": "log",  # "log" | "block"
    "flood_threshold": 5,
    "flood_window_seconds": 30,
    "auto_reply_patterns": None,  # None = use built-in defaults
}


# ── SpamResult ─────────────────────────────────────────────────────────────


@dataclass
class SpamResult:
    """Result of a spam detection check.

    Attributes:
        is_spam: Whether the message is classified as spam.
        spam_reason: The layer that triggered classification
            (``"auto_reply"``, ``"flood"``, or ``"repetitive"``).
        spam_score: Confidence score 0–100.
        detection_layers: List of layer names that contributed.
        action: What to do — ``"pass"``, ``"log"``, or ``"block"``.
    """

    is_spam: bool = False
    spam_reason: str | None = None
    spam_score: int = 0
    detection_layers: list[str] = field(default_factory=list)
    action: str = "pass"

    def to_dict(self) -> dict[str, t.Any]:
        """Serialize to dict for merging into ``Message.payload``."""
        return {
            "is_spam": self.is_spam,
            "spam_reason": self.spam_reason,
            "spam_score": self.spam_score,
            "detection_layers": self.detection_layers,
            "action": self.action,
        }


# ── Pattern compilation ────────────────────────────────────────────────────

AUTO_REPLY_PATTERNS: list[re.Pattern] = [
    re.compile(pattern, re.IGNORECASE)
    for pattern in [
        r"gracias por (contactar|escribir|comunicarte)",
        r"en breve (un|te) (atender|responder)",
        r"bienvenido a",
        r"gracias por tu mensaje",
        r"te atenderemos en breve",
        r"gracias por comunicarte",
        r"pronto nos pondremos en contacto",
        r"recibirás una respuesta",
        r"hemos recibido tu",
    ]
]


# ── SpamDetector ───────────────────────────────────────────────────────────


class SpamDetector:
    """Multi-layer spam detector for text messages.

    Three synchronous detection layers:
    1. **Auto-reply** — regex matching against Spanish auto-reply patterns
    2. **Flood** — sliding window rate limiter per ``{user_id}:{connection_id}``
    3. **Repetitive** — exact string match frequency in last 10 messages

    The ``full_check()`` method runs layers 1 and 2 (step 1.5 in the pipeline).
    Layer 3 (repetitive) runs separately via ``check_repetitive()`` after the
    inbound message is saved and history is available (step 4c).

    Config is resolved per-call from the passed ``config`` dict — no stale cache.
    """

    def __init__(
        self,
        config: dict[str, t.Any] | None = None,
        patterns: list[re.Pattern] | None = None,
    ) -> None:
        resolved = _resolve_anti_spam_config(config)
        self._flood_limiter = MemoryRateLimiter(
            max_requests=resolved["flood_threshold"],
            window_seconds=resolved["flood_window_seconds"],
        )
        self._patterns = patterns if patterns is not None else AUTO_REPLY_PATTERNS

    # ── Layer 1: Auto-reply ──────────────────────────────────────────────

    def check_auto_reply(
        self,
        text: str,
        patterns: list[re.Pattern] | None = None,
    ) -> SpamResult:
        """Check if *text* matches ≥2 auto-reply patterns.

        Args:
            text: The message text to check.
            patterns: Optional override patterns. Uses class defaults if ``None``.

        Returns:
            ``SpamResult`` — ``is_spam=True`` if ≥2 distinct patterns match.
        """
        patterns = patterns or self._patterns
        match_count = 0

        for pattern in patterns:
            if pattern.search(text):
                match_count += 1
                if match_count >= 2:
                    return SpamResult(
                        is_spam=True,
                        spam_reason="auto_reply",
                        spam_score=90,
                        detection_layers=["auto_reply"],
                        action="block",
                    )

        return SpamResult()

    # ── Layer 2: Flood ───────────────────────────────────────────────────

    def check_flood(
        self,
        user_id: str,
        connection_id: str,
    ) -> SpamResult:
        """Check if *user_id* on *connection_id* is flooding.

        Uses an internal ``MemoryRateLimiter`` (5 requests / 30s sliding window).
        Key is ``{user_id}:{connection_id}``.

        Returns:
            ``SpamResult`` — ``is_spam=True`` if rate limited.
        """
        key = f"{user_id}:{connection_id}"
        if not self._flood_limiter.is_allowed(key):
            return SpamResult(
                is_spam=True,
                spam_reason="flood",
                spam_score=90,
                detection_layers=["flood"],
                action="block",
            )

        return SpamResult()

    # ── Layer 3: Repetitive ──────────────────────────────────────────────

    def check_repetitive(
        self,
        text: str,
        history: list[str],
    ) -> SpamResult:
        """Check if *text* appears ≥3 times in *history* (last 10 messages).

        Messages shorter than 5 characters (after stripping) are excluded from
        the count to avoid flagging single-word replies like ``"sí"``, ``"ok"``.

        Args:
            text: The current message content.
            history: List of previous message content strings (typically last 10).

        Returns:
            ``SpamResult`` — ``is_spam=True`` if text appears 3+ times.
        """
        if len(text.strip()) < 5:
            return SpamResult()

        count = sum(
            1
            for msg in history
            if msg.lower() == text.lower() and len(msg.strip()) >= 5
        )

        if count >= 3:
            return SpamResult(
                is_spam=True,
                spam_reason="repetitive",
                spam_score=85,
                detection_layers=["repetitive"],
                action="block",
            )

        return SpamResult()

    # ── Full check (layers 1 + 2) ────────────────────────────────────────

    def full_check(
        self,
        text: str,
        user_id: str,
        conn_id: str,
        config: dict[str, t.Any] | None = None,
    ) -> SpamResult:
        """Run auto-reply and flood checks in sequence.

        Short-circuits on the first detection when mode is ``"block"``.
        In ``"log"`` mode, all layers are evaluated and the worst result is returned.

        Does **not** check repetitive — that runs separately after history loads
        (call ``check_repetitive`` at pipeline step 4c).

        Args:
            text: The message text to check.
            user_id: External user ID (from parsed message).
            conn_id: Platform connection ID (UUID string).
            config: Per-connection config dict (from ``extra_data.anti_spam``).

        Returns:
            ``SpamResult`` — ``"pass"``, ``"log"``, or ``"block"``.
        """
        resolved = _resolve_anti_spam_config(config)
        if not resolved.get("enabled", True):
            return SpamResult()

        mode = resolved.get("mode", "log")

        # Layer 1: Auto-reply
        result = self.check_auto_reply(text)
        if result.is_spam:
            if mode == "block":
                return result
            result.action = "log"
            logger.info(
                "Spam detected (auto_reply) in log mode | score={score}",
                score=result.spam_score,
            )

        # Layer 2: Flood
        flood_result = self.check_flood(user_id, conn_id)
        if flood_result.is_spam:
            if result.detection_layers:
                flood_result.detection_layers = (
                    result.detection_layers + flood_result.detection_layers
                )
            if mode == "block":
                return flood_result
            flood_result.action = "log"
            logger.info(
                "Spam detected (flood) in log mode | score={score}",
                score=flood_result.spam_score,
            )
            return flood_result

        # If auto-reply was logged but flood passed
        if result.is_spam and result.action == "log":
            return result

        return SpamResult()


# ── Config resolver ─────────────────────────────────────────────────────────


def _resolve_anti_spam_config(
    connection_config: dict[str, t.Any] | None,
) -> dict[str, t.Any]:
    """Resolve anti-spam config from per-connection settings + global defaults.

    Priority:
    1. Global ``settings.anti_spam_enabled`` — if ``False``, overrides everything
    2. Per-connection ``connection_config`` fields (from ``extra_data.anti_spam``)
    3. ``DEFAULT_CONFIG`` fallbacks for missing fields

    Args:
        connection_config: The ``extra_data.anti_spam`` dict from
            ``PlatformConnection``, or ``None`` / ``{}`` for defaults.

    Returns:
        A merged config dict with all required fields.
    """
    from app.core.config import settings

    config = dict(DEFAULT_CONFIG)

    if connection_config:
        config.update(connection_config)

    # Global toggle overrides per-connection
    if not settings.anti_spam_enabled:
        config["enabled"] = False

    return config


# ── Singleton ──────────────────────────────────────────────────────────────

spam_detector = SpamDetector()
