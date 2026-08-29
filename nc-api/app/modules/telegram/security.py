"""Telegram webhook request authentication — deterministic per-connection secret.

Telegram's Bot API supports webhook request authentication via
``setWebhook(secret_token=...)``: every update is then delivered with the
secret echoed in the ``X-Telegram-Bot-Api-Secret-Token`` header, which we
verify with a constant-time comparison.

The secret is derived (not stored) so no schema change is needed:
``HMAC-SHA256(JWT_SECRET, "telegram-webhook:{connection_id}")`` — stable
across processes and restarts, unique per connection.
"""

from __future__ import annotations

import hashlib
import hmac
import uuid as uuid_pkg

HEADER_NAME = "X-Telegram-Bot-Api-Secret-Token"


def telegram_webhook_secret(connection_id: str | uuid_pkg.UUID) -> str:
    """Derive the webhook secret for *connection_id*.

    Uses the canonical lowercase UUID string form so the same value is
    produced regardless of whether the caller passes a UUID object or the
    raw URL path segment.
    """
    from app.core.config import settings

    key = str(uuid_pkg.UUID(str(connection_id)))
    return hmac.new(
        settings.jwt_secret.encode("utf-8"),
        f"telegram-webhook:{key}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
