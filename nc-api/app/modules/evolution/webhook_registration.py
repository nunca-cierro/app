"""Evolution API v2 webhook registration — shared, testable building blocks.

Used by:
- ``POST /api/v1/platform-connections/{id}/register-evolution-webhook``
- ``POST /api/v1/platform-connections/{id}/connect-evolution``
- ``scripts/backfill_evolution_webhooks.py`` (C1 rollout)

The Evolution API v2 payload (``webhook.schema.ts``) nests everything under
``webhook`` and uses ``byEvents``/``base64`` boolean keys. The v1 keys
``webhookByEvents``/``webhookBase64`` are NOT recognized by v2 — they are
silently ignored, so the instance keeps its defaults. ``headers`` carries
the ``apikey`` that Evolution must send with every webhook request — this
is what makes the fail-closed validation (adapter) work.
"""

from __future__ import annotations

import typing as t

import httpx
from loguru import logger

# Events nc-api needs to receive from Evolution (v2 event names).
EVO_WEBHOOK_EVENTS: list[str] = [
    "MESSAGES_UPSERT",
    "CONNECTION_UPDATE",
    "QRCODE_UPDATED",
]


def build_evolution_webhook_payload(webhook_url: str, api_key: str = "") -> dict[str, t.Any]:
    """Build the Evolution API v2 ``/webhook/set/{instance}`` payload.

    Args:
        webhook_url: URL where Evolution must deliver events.
        api_key: API key to attach as webhook auth header. Empty string
            means no header is sent (legacy/unauthenticated webhook).

    Returns:
        The v2-compliant payload dict.
    """
    webhook: dict[str, t.Any] = {
        "enabled": True,
        "url": webhook_url,
        "byEvents": False,
        "base64": False,
        "events": list(EVO_WEBHOOK_EVENTS),
    }
    if api_key:
        webhook["headers"] = {"apikey": api_key}
    return {"webhook": webhook}


def resolve_effective_api_key(creds: dict[str, t.Any], global_key: str = "") -> str:
    """Resolve the API key used for a connection.

    Own credential key wins; otherwise the global key (settings.evo_api_key)
    applies. Empty string means there is NO key — the webhook cannot be
    authenticated and the connection falls back to instance-only validation.
    """
    own_key = (creds.get("api_key") or "").strip()
    return own_key or (global_key or "").strip()


async def set_instance_webhook(
    base_url: str,
    instance_name: str,
    webhook_url: str,
    api_key: str = "",
    *,
    client: httpx.AsyncClient | None = None,
    verify_ssl: bool = True,
) -> httpx.Response:
    """POST the webhook configuration to Evolution API v2.

    The request itself is authenticated with the same ``api_key`` (as
    ``apikey`` header) that will be sent back in every webhook delivery —
    this keeps registration and validation aligned (W3).

    Args:
        base_url: Evolution server root URL (from connection credentials).
        instance_name: Evolution instance to configure.
        webhook_url: Callback URL for Evolution → nc-api.
        api_key: Effective API key (own or global). Empty → no auth header.
        client: Optional shared httpx client (for tests / batching).
        verify_ssl: SSL verification for the Evolution server.

    Returns:
        The Evolution API response.
    """
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["apikey"] = api_key

    payload = build_evolution_webhook_payload(webhook_url, api_key)
    url = f"{base_url.rstrip('/')}/webhook/set/{instance_name}"

    logger.info(
        "Setting Evolution webhook | instance={inst} | url={cb} | authed={auth}",
        inst=instance_name,
        cb=webhook_url,
        auth=bool(api_key),
    )

    owns_client = client is None
    if owns_client:
        client = httpx.AsyncClient(timeout=15.0, verify=verify_ssl)

    try:
        return await client.post(url, json=payload, headers=headers)
    finally:
        if owns_client:
            await client.aclose()
