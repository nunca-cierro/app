"""Backfill — re-register Evolution webhooks with the auth header (C1).

Existing Evolution connections registered their webhooks BEFORE the
fail-closed validation existed, so Evolution does not send the ``apikey``
header and those webhooks would be rejected after deploy. This script
re-registers every ACTIVE Evolution connection's webhook with the current
v2 payload (``byEvents``/``base64`` keys + ``headers.apikey``).

SAFETY:
- Dry-run by default: it only lists the plan and never calls Evolution.
- ``--apply`` is required to actually register webhooks.
- It NEVER prints API keys — only instance names and URLs.
- Idempotent: re-running is safe (Evolution upserts the webhook config).
- Requires the same env as production (DATABASE_URL, ENCRYPTION_KEY,
  EVO_API_KEY, EVO_INTERNAL_BASE_URL or --webhook-base-url).

Runbook + deploy order: see nc-api/EVOLUTION.md → "Runbook: migración a
webhooks autenticados".

Usage::

    uv run python -m scripts.backfill_evolution_webhooks                  # dry-run (plan)
    uv run python -m scripts.backfill_evolution_webhooks --apply           # register
    uv run python -m scripts.backfill_evolution_webhooks \
        --webhook-base-url https://api.nuncacierro.com --apply             # external Evolution
"""

from __future__ import annotations

import argparse
import asyncio
import typing as t

import httpx
from loguru import logger
from sqlalchemy import select

from app.core.config import settings
from app.core.encryption import decrypt
from app.db.session import async_session_factory
from app.modules.evolution.webhook_registration import (
    resolve_effective_api_key,
    set_instance_webhook,
)
from app.modules.platform_connections.models import PlatformConnection


async def plan_and_apply(
    session: t.Any,
    *,
    webhook_base_url: str,
    apply: bool = False,
    http_client: httpx.AsyncClient | None = None,
    report: t.Callable[[str], None] = print,
) -> dict[str, int]:
    """List/re-register webhooks for ACTIVE Evolution connections.

    Returns a stats dict {total, ok, dry_run, skipped, failed}. Never
    prints secrets. Pass ``report`` for test capture.
    """
    result = await session.execute(
        select(PlatformConnection).where(
            PlatformConnection.platform_type == "evolution",
            PlatformConnection.status == "active",
        )
    )
    connections = list(result.scalars().all())
    stats: dict[str, int] = {"total": len(connections), "ok": 0, "dry_run": 0, "skipped": 0, "failed": 0}

    for conn in connections:
        creds = decrypt(conn.credentials)
        if not isinstance(creds, dict):
            stats["skipped"] += 1
            report(f"[{conn.id}] SKIP: invalid credentials format")
            continue

        instance = (creds.get("instance_name") or "").strip()
        base_url = (creds.get("base_url") or "").rstrip("/")
        own_key = (creds.get("api_key") or "").strip()
        api_key = resolve_effective_api_key(creds, settings.evo_api_key)

        if not instance or not base_url:
            stats["skipped"] += 1
            report(f"[{conn.id}] SKIP: missing instance_name/base_url")
            continue

        webhook_url = f"{webhook_base_url}/webhook/evolution/{conn.id}"
        key_src = "own" if own_key else ("global" if api_key else "none")
        report(
            f"[{conn.id}] instance={instance} | evolution={base_url} | "
            f"key={key_src} | webhook={webhook_url}"
        )

        if not apply:
            stats["dry_run"] += 1
            continue

        if not api_key:
            stats["skipped"] += 1
            report(f"[{conn.id}] SKIP (--apply): no effective api_key — cannot register authenticated webhook")
            continue

        try:
            resp = await set_instance_webhook(
                base_url, instance, webhook_url, api_key,
                client=http_client, verify_ssl=False,  # parity with registration
            )
        except Exception as exc:  # noqa: BLE001 — report and continue
            stats["failed"] += 1
            report(f"[{conn.id}] ERROR: {exc}")
            continue

        if resp.is_success:
            stats["ok"] += 1
            report(f"[{conn.id}] OK (webhook registered)")
        else:
            stats["failed"] += 1
            report(f"[{conn.id}] FAIL: HTTP {resp.status_code} — {resp.text[:200]}")

    return stats


async def main() -> int:
    parser = argparse.ArgumentParser(
        description="Re-register Evolution webhooks with the auth header (C1 backfill)."
    )
    parser.add_argument("--apply", action="store_true", help="Actually register webhooks (default: dry-run plan only)")
    parser.add_argument(
        "--webhook-base-url",
        default=None,
        help="Public/internal base URL Evolution must call back to (default: EVO_INTERNAL_BASE_URL)",
    )
    args = parser.parse_args()

    webhook_base_url = (args.webhook_base_url or settings.evo_internal_base_url).rstrip("/")
    logger.info("Backfill start | apply={apply} | webhook_base_url={url}", apply=args.apply, url=webhook_base_url)

    async with async_session_factory() as session:
        stats = await plan_and_apply(session, webhook_base_url=webhook_base_url, apply=args.apply)

    print(f"\n=== Backfill {('APPLY' if args.apply else 'DRY-RUN')} ===")
    print(f"total={stats['total']} ok={stats['ok']} dry_run={stats['dry_run']} skipped={stats['skipped']} failed={stats['failed']}")
    if stats["skipped"] and not args.apply:
        print("Run with --apply to register. Skipped rows need manual attention (see report).")
    return 0 if stats["failed"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
