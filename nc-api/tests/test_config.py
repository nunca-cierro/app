"""Unit tests for Settings URL normalization (no DB required)."""

from __future__ import annotations

from app.core.config import Settings


def _settings(**overrides: object) -> Settings:
    """Build Settings isolated from the .env file / real environment."""
    return Settings(
        _env_file=None,
        jwt_secret="test-jwt-secret-not-production",
        encryption_key="test-encryption-key",
        **overrides,
    )


def test_webhook_public_base_url_strips_trailing_slash() -> None:
    s = _settings(webhook_public_base_url="https://api.nuncacierro.com/")
    assert s.webhook_public_base_url == "https://api.nuncacierro.com"


def test_evo_internal_base_url_strips_trailing_slash() -> None:
    s = _settings(evo_internal_base_url="http://nc-api:8000/")
    assert s.evo_internal_base_url == "http://nc-api:8000"


def test_urls_without_trailing_slash_unchanged() -> None:
    s = _settings(
        webhook_public_base_url="https://api.nuncacierro.com",
        evo_internal_base_url="http://nc-api:8000",
    )
    assert s.webhook_public_base_url == "https://api.nuncacierro.com"
    assert s.evo_internal_base_url == "http://nc-api:8000"


def test_whitespace_padded_url_is_normalized() -> None:
    s = _settings(webhook_public_base_url="  https://api.nuncacierro.com/  ")
    assert s.webhook_public_base_url == "https://api.nuncacierro.com"


def test_empty_url_stays_empty() -> None:
    s = _settings(webhook_public_base_url="", evo_internal_base_url="")
    assert s.webhook_public_base_url == ""
    assert s.evo_internal_base_url == ""


# ── Internal tenant slug ─────────────────────────────────────────────────────


def test_internal_tenant_slug_default() -> None:
    s = _settings()
    assert s.internal_tenant_slug == "nunca-cierro"


def test_internal_tenant_slug_override() -> None:
    s = _settings(internal_tenant_slug="mi-negocio")
    assert s.internal_tenant_slug == "mi-negocio"


def test_internal_tenant_slug_can_be_empty() -> None:
    # Empty = safe fallback (no tenant is exempt from payment).
    s = _settings(internal_tenant_slug="")
    assert s.internal_tenant_slug == ""
