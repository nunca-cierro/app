"""Unit tests for Settings URL normalization (no DB required)."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.core.config import DEFAULT_LLM_MODEL, Settings


def _settings(**overrides: object) -> Settings:
    """Build Settings isolated from the .env file / real environment.

    The fail-fast validator (Slice 2) requires the ACTIVE provider's key, so
    every default here supplies the dummy OpenAI key the way conftest.py does
    for the app-level ``settings`` singleton. Individual tests override it to
    exercise the fail-fast paths.
    """
    kwargs = {
        "_env_file": None,
        "jwt_secret": "test-jwt-secret-not-production",
        "encryption_key": "test-encryption-key",
        "openai_api_key": "test-key",
        **overrides,
    }
    return Settings(**kwargs)


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


# ── Auth session cookies (Slice B — AS-1: Secure per environment) ──────────


def test_auth_cookie_secure_defaults_to_true() -> None:
    """Production default: the session/CSRF cookies MUST be Secure."""
    s = _settings()
    assert s.auth_cookie_secure is True


def test_auth_cookie_secure_can_be_disabled_for_local_dev() -> None:
    """Dev .env sets AUTH_COOKIE_SECURE=false so local http:// works."""
    s = _settings(auth_cookie_secure=False)
    assert s.auth_cookie_secure is False


# ── LLM multi-provider config (Slice 2 — fail-fast + canonical defaults) ────


def test_llm_provider_canonical_defaults() -> None:
    """OpenAI is the active default with spec-mandated knobs."""
    s = _settings()
    assert s.llm_provider == "openai"
    assert s.openai_model == DEFAULT_LLM_MODEL == "gpt-4o-mini"
    assert s.openai_temperature == 0.7
    assert s.openai_max_tokens == 1024
    assert s.openai_rate_limit_rpm == 500
    assert s.llm_history_token_budget == 2000


def test_openai_active_without_groq_key_loads_ok() -> None:
    """The INACTIVE provider's key must never be required."""
    s = _settings(openai_api_key="test-key", groq_api_key="")
    assert s.llm_provider == "openai"
    assert s.groq_api_key == ""


def test_groq_active_without_openai_key_loads_ok() -> None:
    """Flip LLM_PROVIDER=groq: only the Groq key is required."""
    s = _settings(llm_provider="groq", groq_api_key="gsk-test-key", openai_api_key="")
    assert s.llm_provider == "groq"
    assert s.groq_api_key == "gsk-test-key"
    assert s.openai_api_key == ""


def test_invalid_llm_provider_is_rejected() -> None:
    """Unsupported LLM_PROVIDER fails boot with a friendly message."""
    with pytest.raises(ValidationError) as exc_info:
        _settings(llm_provider="anthropic", openai_api_key="test-key")
    message = str(exc_info.value)
    assert "LLM_PROVIDER" in message
    assert "openai" in message
    assert "groq" in message


def test_openai_active_with_empty_key_fails_fast() -> None:
    """Boot must fail naming the EXACT env var when the active key is empty."""
    with pytest.raises(ValidationError) as exc_info:
        _settings(openai_api_key="")
    assert "OPENAI_API_KEY" in str(exc_info.value)


def test_groq_active_with_empty_key_fails_fast() -> None:
    with pytest.raises(ValidationError) as exc_info:
        _settings(llm_provider="groq", groq_api_key="")
    assert "GROQ_API_KEY" in str(exc_info.value)
