"""SSE subscriber hub for platform connections.

In-process pub/sub using asyncio queues. Webhook handlers publish events
via :func:`notify_subscribers`; the SSE endpoint subscribes a queue per
connected client and streams them out.

This hub is intentionally single-process (matches the current deployment
— one uvicorn worker). If nc-api is ever scaled to multiple workers, this
must move to a shared pub/sub (e.g. Redis) — the endpoint contract stays
the same.
"""

from __future__ import annotations

import asyncio
import typing as t
from collections import defaultdict

from loguru import logger

# connection_id → subscriber queues
_subscribers: dict[str, list[asyncio.Queue]] = defaultdict(list)

# ── Event type constants ───────────────────────────────────────────────────

EVENT_CONNECTION_STATE_CHANGED: str = "connection_state_changed"
EVENT_MESSAGE_RECEIVED: str = "message_received"

# ── Subscriber management ──────────────────────────────────────────────────


def subscribe(connection_id: str) -> asyncio.Queue:
    """Register a new subscriber queue for a connection."""
    queue: asyncio.Queue = asyncio.Queue()
    _subscribers[connection_id].append(queue)
    return queue


def unsubscribe(connection_id: str, queue: asyncio.Queue) -> None:
    """Remove a subscriber queue. Idempotent — safe on double cleanup."""
    queues = _subscribers.get(connection_id, [])
    if queue in queues:
        queues.remove(queue)
    if not queues:
        _subscribers.pop(connection_id, None)


# ── Publishing ─────────────────────────────────────────────────────────────


async def notify_subscribers(
    connection_id: str,
    event_type: str,
    data: dict[str, t.Any],
) -> None:
    """Push an event to every client subscribed to a connection."""
    queues = list(_subscribers.get(connection_id, []))
    if not queues:
        return

    event = {"type": event_type, "data": data}
    logger.debug(
        "SSE notify | conn={conn} | type={type} | subscribers={n}",
        conn=connection_id,
        type=event_type,
        n=len(queues),
    )
    for queue in queues:
        await queue.put(event)
