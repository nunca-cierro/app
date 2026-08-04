"""Tests for the shared Evolution webhook registration (W1/W3/C1).

Covers:
- v2 payload keys (``byEvents``/``base64``, NOT v1 ``webhookByEvents``)
  and the ``headers.apikey`` auth header.
- Effective key resolution (own > global > none).
- ``set_instance_webhook`` HTTP call shape.
- The C1 backfill plan/apply behavior (dry-run never touches Evolution;
  apply uses the effective key; reports never leak secrets).
"""

from __future__ import annotations

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.config import settings
from app.core.encryption import encrypt
from app.modules.evolution.webhook_registration import (
    build_evolution_webhook_payload,
    resolve_effective_api_key,
    set_instance_webhook,
)
from app.modules.platform_connections.models import PlatformConnection
from scripts.backfill_evolution_webhooks import plan_and_apply


class TestWebhookPayloadV2:
    """Evolution API v2 webhook.set payload shape."""

    def test_uses_v2_keys_by_events_and_base64(self) -> None:
        payload = build_evolution_webhook_payload("https://api.example.com/webhook/evolution/x")
        webhook = payload["webhook"]
        assert webhook["byEvents"] is False
        assert webhook["base64"] is False
        # v1 keys must NOT be present — v2 ignores them silently
        assert "webhookByEvents" not in webhook
        assert "webhookBase64" not in webhook
        assert webhook["enabled"] is True
        assert webhook["url"] == "https://api.example.com/webhook/evolution/x"
        assert webhook["events"] == ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"]

    def test_headers_apikey_included_when_key_provided(self) -> None:
        payload = build_evolution_webhook_payload("https://cb/wh", api_key="secret")
        assert payload["webhook"]["headers"] == {"apikey": "secret"}

    def test_no_headers_without_key(self) -> None:
        payload = build_evolution_webhook_payload("https://cb/wh")
        assert "headers" not in payload["webhook"]


class TestEffectiveApiKey:
    """W3 — own key wins, then global, then none."""

    def test_own_key_wins_over_global(self) -> None:
        assert resolve_effective_api_key({"api_key": "own"}, "global") == "own"

    def test_global_fallback_when_no_own_key(self) -> None:
        assert resolve_effective_api_key({}, "global") == "global"

    def test_empty_when_neither(self) -> None:
        assert resolve_effective_api_key({}, "") == ""


class TestSetInstanceWebhook:
    """set_instance_webhook posts the v2 payload + apikey header."""

    @pytest.mark.asyncio
    async def test_posts_correct_url_payload_and_headers(self) -> None:
        client = MagicMock()
        client.post = AsyncMock(
            return_value=SimpleNamespace(status_code=200, is_success=True, text="ok")
        )

        resp = await set_instance_webhook(
            "http://evo:8080", "inst-1", "https://cb/webhook/evolution/abc",
            api_key="secret", client=client,
        )

        assert resp.is_success
        client.post.assert_awaited_once()
        call = client.post.await_args
        assert call.args[0] == "http://evo:8080/webhook/set/inst-1"
        sent_json = call.kwargs["json"]
        assert sent_json["webhook"]["headers"] == {"apikey": "secret"}
        assert sent_json["webhook"]["byEvents"] is False
        assert call.kwargs["headers"]["apikey"] == "secret"


def _evo_conn(creds: dict) -> PlatformConnection:
    return PlatformConnection(
        id=uuid.uuid4(), tenant_id=uuid.uuid4(), platform_type="evolution",
        display_name="Evo", credentials=encrypt(creds), status="active",
    )


class TestBackfillPlanAndApply:
    """C1 backfill — dry-run never calls Evolution; apply uses effective key."""

    def _session_returning(self, connections) -> MagicMock:
        session = MagicMock()
        result = MagicMock()
        result.scalars.return_value.all.return_value = connections
        session.execute = AsyncMock(return_value=result)
        return session

    @pytest.mark.asyncio
    async def test_dry_run_lists_plan_without_http(self, monkeypatch) -> None:
        monkeypatch.setattr(settings, "evo_api_key", "")
        conns = [
            _evo_conn({"base_url": "http://evo:8080", "api_key": "own-key", "instance_name": "inst-1"}),
            _evo_conn({"base_url": "http://evo:8080", "instance_name": "inst-2"}),
        ]
        session = self._session_returning(conns)
        lines: list[str] = []

        stats = await plan_and_apply(session, webhook_base_url="http://nc-api:8000", apply=False, report=lines.append)

        assert stats == {"total": 2, "ok": 0, "dry_run": 2, "skipped": 0, "failed": 0}
        joined = "\n".join(lines)
        assert "inst-1" in joined and "inst-2" in joined
        assert "own-key" not in joined  # secrets never printed

    @pytest.mark.asyncio
    async def test_apply_registers_with_own_key_and_skips_keyless(self, monkeypatch) -> None:
        monkeypatch.setattr(settings, "evo_api_key", "")
        conns = [
            _evo_conn({"base_url": "http://evo:8080", "api_key": "own-key", "instance_name": "inst-1"}),
            _evo_conn({"base_url": "http://evo:8080", "instance_name": "inst-2"}),  # no key → skip
        ]
        session = self._session_returning(conns)
        client = MagicMock()
        client.post = AsyncMock(
            return_value=SimpleNamespace(status_code=200, is_success=True, text="ok")
        )
        lines: list[str] = []

        stats = await plan_and_apply(
            session, webhook_base_url="http://nc-api:8000", apply=True,
            http_client=client, report=lines.append,
        )

        assert stats == {"total": 2, "ok": 1, "dry_run": 0, "skipped": 1, "failed": 0}
        client.post.assert_awaited_once()
        assert client.post.await_args.args[0] == "http://evo:8080/webhook/set/inst-1"
        assert client.post.await_args.kwargs["json"]["webhook"]["headers"] == {"apikey": "own-key"}

    @pytest.mark.asyncio
    async def test_apply_uses_global_key_when_connection_has_no_own(self, monkeypatch) -> None:
        monkeypatch.setattr(settings, "evo_api_key", "global-key")
        conns = [_evo_conn({"base_url": "http://evo:8080", "instance_name": "inst-2"})]
        session = self._session_returning(conns)
        client = MagicMock()
        client.post = AsyncMock(
            return_value=SimpleNamespace(status_code=200, is_success=True, text="ok")
        )

        stats = await plan_and_apply(
            session, webhook_base_url="http://nc-api:8000", apply=True, http_client=client
        )

        assert stats["ok"] == 1
        assert client.post.await_args.kwargs["json"]["webhook"]["headers"] == {"apikey": "global-key"}
