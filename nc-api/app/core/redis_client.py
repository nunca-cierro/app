"""Shared Redis connection client and pool management.

Provides async Redis client singleton for distributed rate limiting,
message debounce buffers, and short-lived locks across worker processes.
"""

from __future__ import annotations

import redis.asyncio as aioredis
from loguru import logger

from app.core.config import settings

_redis: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    """Get or create the async Redis client singleton."""
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(
            settings.cache_redis_url,
            decode_responses=True,
            socket_connect_timeout=5,
        )
    return _redis


async def close_redis() -> None:
    """Close the shared Redis client (call on application shutdown)."""
    global _redis
    if _redis is not None:
        await _redis.close()
        _redis = None
