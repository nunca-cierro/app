"""Unit tests for LLMClient — routing, knobs, history trimming.

Covers the llm-client-routing spec:
1. Provider mismatch → route to the ACTIVE provider default with a warning
2. Deprecated Groq model id → route to the active default with a warning
3. Matching provider/model → pass through unchanged, no warning
4. None-aware knobs: stored temperature=0 preserved; None → settings default
5. Token-budget history trimming (tokens ≈ len//3, oldest dropped)
6. Active-provider client construction (base_url map + key)
7. RuntimeError wrapper on API failure + success log

NOTE: loguru writes to stderr, not to the stdlib ``logging`` module, so
caplog cannot capture these records — the module logger is patched instead.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.config import (
    DEPRECATED_GROQ_MODELS,
    PROVIDER_BASE_URLS,
    settings,
)
from app.modules.integrations.llm.provider import (
    SECURITY_PROMPT,
    LLMClient,
    llm_client,
)


class _FakeUsage:
    total_tokens = 10


class _FakeMessage:
    content = "hi"


class _FakeChoice:
    message = _FakeMessage()


class _FakeCompletion:
    choices = [_FakeChoice()]
    usage = _FakeUsage()


@pytest.fixture
def mock_create():
    """Patch llm_client._client so generate() never touches the network."""
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(return_value=_FakeCompletion())
    with patch.object(llm_client, "_client", mock_client):
        yield mock_client


# ── Client construction (base_url map + active key) ─────────────────────────


def test_provider_base_urls_map():
    assert PROVIDER_BASE_URLS == {
        "openai": "https://api.openai.com/v1",
        "groq": "https://api.groq.com/openai/v1",
    }


def test_openai_active_client_construction(monkeypatch):
    monkeypatch.setattr(settings, "llm_provider", "openai")
    with patch("app.modules.integrations.llm.provider.AsyncOpenAI") as mock_oa:
        LLMClient()
    mock_oa.assert_called_once_with(
        api_key=settings.openai_api_key,
        base_url=PROVIDER_BASE_URLS["openai"],
    )


def test_groq_active_client_construction(monkeypatch):
    monkeypatch.setattr(settings, "llm_provider", "groq")
    with patch("app.modules.integrations.llm.provider.AsyncOpenAI") as mock_oa:
        LLMClient()
    mock_oa.assert_called_once_with(
        api_key=settings.groq_api_key,
        base_url=PROVIDER_BASE_URLS["groq"],
    )


def test_client_api_key_override_wins(monkeypatch):
    monkeypatch.setattr(settings, "llm_provider", "openai")
    with patch("app.modules.integrations.llm.provider.AsyncOpenAI") as mock_oa:
        LLMClient(api_key="explicit-key")
    mock_oa.assert_called_once_with(
        api_key="explicit-key",
        base_url=PROVIDER_BASE_URLS["openai"],
    )


# ── Provider/model fallback routing ─────────────────────────────────────────


@pytest.mark.asyncio
async def test_provider_mismatch_routes_to_active_default(mock_create):
    """Dormant groq row while openai is active → OpenAI default + warning."""
    with patch("app.modules.integrations.llm.provider.logger") as mock_logger:
        await llm_client.generate(
            "sys", "user", provider="groq", model="qwen/qwen3.6-27b"
        )
    used_model = mock_create.chat.completions.create.call_args.kwargs["model"]
    assert used_model == settings.openai_model
    mock_logger.warning.assert_called_once()
    assert "provider" in mock_logger.warning.call_args.args[0]


@pytest.mark.asyncio
async def test_deprecated_model_routes_to_active_default(mock_create):
    """A retired Groq model id is never sent — routed to the active default."""
    with patch("app.modules.integrations.llm.provider.logger") as mock_logger:
        await llm_client.generate(
            "sys", "user", model=DEPRECATED_GROQ_MODELS[0]
        )
    used_model = mock_create.chat.completions.create.call_args.kwargs["model"]
    assert used_model == settings.openai_model
    mock_logger.warning.assert_called_once()
    assert "deprecated" in mock_logger.warning.call_args.args[0]


@pytest.mark.asyncio
async def test_deprecated_model_routes_to_groq_default_when_groq_active(
    mock_create, monkeypatch
):
    monkeypatch.setattr(settings, "llm_provider", "groq")
    with patch("app.modules.integrations.llm.provider.logger"):
        await llm_client.generate(
            "sys", "user", provider="groq", model=DEPRECATED_GROQ_MODELS[0]
        )
    used_model = mock_create.chat.completions.create.call_args.kwargs["model"]
    assert used_model == settings.groq_model


@pytest.mark.asyncio
async def test_matching_provider_model_passes_through(mock_create):
    with patch("app.modules.integrations.llm.provider.logger") as mock_logger:
        await llm_client.generate(
            "sys", "user", provider="openai", model="gpt-4o-mini"
        )
    used_model = mock_create.chat.completions.create.call_args.kwargs["model"]
    assert used_model == "gpt-4o-mini"
    mock_logger.warning.assert_not_called()


# ── None-aware completion knobs ─────────────────────────────────────────────


@pytest.mark.asyncio
async def test_temperature_zero_is_preserved(mock_create):
    """Stored temperature=0 must reach the API as 0 (not the 0.7 default)."""
    await llm_client.generate("sys", "user", temperature=0)
    used = mock_create.chat.completions.create.call_args.kwargs["temperature"]
    assert used == 0


@pytest.mark.asyncio
async def test_temperature_none_uses_openai_default(mock_create):
    await llm_client.generate("sys", "user", temperature=None)
    used = mock_create.chat.completions.create.call_args.kwargs["temperature"]
    assert used == settings.openai_temperature


@pytest.mark.asyncio
async def test_temperature_none_uses_groq_default_when_groq_active(
    mock_create, monkeypatch
):
    monkeypatch.setattr(settings, "llm_provider", "groq")
    await llm_client.generate("sys", "user", temperature=None)
    used = mock_create.chat.completions.create.call_args.kwargs["temperature"]
    assert used == settings.groq_temperature


@pytest.mark.asyncio
async def test_max_tokens_value_is_preserved(mock_create):
    await llm_client.generate("sys", "user", max_tokens=77)
    used = mock_create.chat.completions.create.call_args.kwargs["max_tokens"]
    assert used == 77


@pytest.mark.asyncio
async def test_max_tokens_none_uses_openai_default(mock_create):
    await llm_client.generate("sys", "user", max_tokens=None)
    used = mock_create.chat.completions.create.call_args.kwargs["max_tokens"]
    assert used == settings.openai_max_tokens


# ── Token-budget history trimming (tokens ≈ len//3) ─────────────────────────


@pytest.mark.asyncio
async def test_long_history_trimmed_to_budget(mock_create, monkeypatch):
    """Oldest messages dropped until the remaining history fits the budget."""
    monkeypatch.setattr(settings, "llm_history_token_budget", 30)
    history = [
        {
            "role": "user" if i % 2 == 0 else "assistant",
            "content": f"msg{i} " + "x" * 60,
        }
        for i in range(10)
    ]  # each ~21 tokens → 210 total, way over the 30-token budget
    await llm_client.generate("sys", "user", conversation_history=history)

    messages = mock_create.chat.completions.create.call_args.kwargs["messages"]
    assert messages[0]["role"] == "system"
    assert messages[-1]["role"] == "user"
    sent_history = messages[1:-1]
    assert sent_history[0]["content"] == history[-1]["content"]  # newest kept
    assert sent_history[0]["content"] != history[0]["content"]  # oldest dropped
    approx = sum(len(m["content"]) // 3 for m in sent_history)
    assert approx <= 30


@pytest.mark.asyncio
async def test_short_history_untouched(mock_create):
    history = [{"role": "user", "content": "hola"}]
    await llm_client.generate("sys", "user", conversation_history=history)
    messages = mock_create.chat.completions.create.call_args.kwargs["messages"]
    assert messages[1:-1] == history


@pytest.mark.asyncio
async def test_security_prompt_injected_first(mock_create):
    await llm_client.generate("sys", "user")
    messages = mock_create.chat.completions.create.call_args.kwargs["messages"]
    assert messages[0]["role"] == "system"
    assert SECURITY_PROMPT in messages[0]["content"]


# ── Error surface + observability ───────────────────────────────────────────


@pytest.mark.asyncio
async def test_api_failure_wrapped_in_runtime_error():
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(side_effect=Exception("boom"))
    with patch.object(llm_client, "_client", mock_client):
        with pytest.raises(RuntimeError, match="boom"):
            await llm_client.generate("sys", "user")


@pytest.mark.asyncio
async def test_success_logs_model_and_tokens(mock_create):
    with patch("app.modules.integrations.llm.provider.logger") as mock_logger:
        await llm_client.generate("sys", "user")
    mock_logger.info.assert_called_once()
    assert mock_logger.info.call_args.args[0].startswith("LLM response")
    assert mock_logger.info.call_args.kwargs["tokens"] == 10


# ── Rate tracker per active provider (log-only) ─────────────────────────────


@pytest.mark.asyncio
async def test_rate_tracker_reads_openai_rpm(mock_create, monkeypatch):
    monkeypatch.setattr(settings, "openai_rate_limit_rpm", 1)
    llm_client._request_timestamps.clear()
    with patch("app.modules.integrations.llm.provider.logger") as mock_logger:
        await llm_client.generate("sys", "user")
        await llm_client.generate("sys", "user")
    mock_logger.warning.assert_called()
    assert "rate limit" in mock_logger.warning.call_args.args[0]
    assert mock_logger.warning.call_args.kwargs["limit"] == 1


@pytest.mark.asyncio
async def test_rate_tracker_reads_groq_rpm(mock_create, monkeypatch):
    monkeypatch.setattr(settings, "llm_provider", "groq")
    monkeypatch.setattr(settings, "groq_rate_limit_rpm", 2)
    llm_client._request_timestamps.clear()
    with patch("app.modules.integrations.llm.provider.logger") as mock_logger:
        await llm_client.generate("sys", "user")
        await llm_client.generate("sys", "user")
        await llm_client.generate("sys", "user")
    mock_logger.warning.assert_called()
    assert "rate limit" in mock_logger.warning.call_args.args[0]
    assert mock_logger.warning.call_args.kwargs["limit"] == 2