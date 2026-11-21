"""Sliding window rate limiters — Redis-backed distributed and in-memory fallback.

Provides distributed sliding window rate limiting via Redis sorted sets (ZSET)
with automatic TTL expiration, safe across multiple worker processes,
and thread-safe in-memory sliding window for synchronous unit testing and fallback.
"""

from __future__ import annotations

import threading
import time
from collections import defaultdict
from dataclasses import dataclass, field

from loguru import logger

from app.core.config import settings


@dataclass
class SlidingWindowEntry:
    timestamps: list[float] = field(default_factory=list)


class MemoryRateLimiter:
    """In-memory sliding window rate limiter.

    Thread-safe via threading.Lock.
    """

    def __init__(self, max_requests: int = 10, window_seconds: int = 60) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._entries: dict[str, SlidingWindowEntry] = defaultdict(SlidingWindowEntry)
        self._lock = threading.Lock()

    def is_allowed(self, key: str) -> bool:
        """Check if a request from *key* is allowed.

        Returns True if under the limit, False if rate limited.
        """
        now = time.time()
        with self._lock:
            if len(self._entries) > 10_000:
                cutoff = now - self.window_seconds
                self._entries = {
                    k: v for k, v in self._entries.items()
                    if v.timestamps and v.timestamps[-1] > cutoff
                }

            entry = self._entries[key]
            cutoff = now - self.window_seconds
            entry.timestamps = [ts for ts in entry.timestamps if ts > cutoff]

            if len(entry.timestamps) >= self.max_requests:
                return False

            entry.timestamps.append(now)
            return True

    def remaining(self, key: str) -> int:
        """How many requests remain in the current window."""
        now = time.time()
        with self._lock:
            entry = self._entries[key]
            cutoff = now - self.window_seconds
            entry.timestamps = [ts for ts in entry.timestamps if ts > cutoff]
            return max(0, self.max_requests - len(entry.timestamps))

    def reset(self, key: str) -> None:
        """Reset rate limit for a key."""
        with self._lock:
            self._entries.pop(key, None)


class RedisRateLimiter:
    """Distributed sliding window rate limiter backed by Redis sorted sets.

    Uses Redis ZSET with timestamp scores for O(log(N)) sliding window operations
    and explicit TTL expiration, avoiding memory leaks across multiple workers.
    """

    def __init__(
        self,
        max_requests: int = 10,
        window_seconds: int = 60,
        prefix: str = "ratelimit",
    ) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.prefix = prefix
        self._mem_fallback = MemoryRateLimiter(max_requests, window_seconds)

    async def is_allowed(self, key: str) -> bool:
        """Check if a request from *key* is allowed under the sliding window.

        Removes timestamps older than ``now - window_seconds``, counts remaining,
        and adds the new timestamp if within ``max_requests``.
        """
        try:
            from app.core.redis_client import get_redis

            redis = await get_redis()
            rkey = f"{self.prefix}:{key}"
            now = time.time()
            cutoff = now - self.window_seconds
            member = f"{now}:{time.time_ns()}"

            pipe = redis.pipeline()
            pipe.zremrangebyscore(rkey, 0, cutoff)
            pipe.zcard(rkey)
            results = await pipe.execute()

            current_count = results[1]
            if current_count >= self.max_requests:
                return False

            pipe2 = redis.pipeline()
            pipe2.zadd(rkey, {member: now})
            pipe2.expire(rkey, self.window_seconds + 10)
            await pipe2.execute()
            return True
        except Exception as exc:
            logger.debug(
                "Redis rate limiter exception (falling back to memory): {e}",
                e=exc,
            )
            return self._mem_fallback.is_allowed(key)

    async def remaining(self, key: str) -> int:
        """Return remaining allowed requests in current window."""
        try:
            from app.core.redis_client import get_redis

            redis = await get_redis()
            rkey = f"{self.prefix}:{key}"
            now = time.time()
            cutoff = now - self.window_seconds

            pipe = redis.pipeline()
            pipe.zremrangebyscore(rkey, 0, cutoff)
            pipe.zcard(rkey)
            results = await pipe.execute()
            current_count = results[1]
            return max(0, self.max_requests - current_count)
        except Exception:
            return self._mem_fallback.remaining(key)

    async def reset(self, key: str) -> None:
        """Reset rate limit for a key in Redis."""
        try:
            from app.core.redis_client import get_redis

            redis = await get_redis()
            rkey = f"{self.prefix}:{key}"
            await redis.delete(rkey)
        except Exception:
            self._mem_fallback.reset(key)

    # ── Synchronous compatibility helpers ─────────────────────────────────
    def is_allowed_sync(self, key: str) -> bool:
        return self._mem_fallback.is_allowed(key)

    def remaining_sync(self, key: str) -> int:
        return self._mem_fallback.remaining(key)

    def reset_sync(self, key: str) -> None:
        self._mem_fallback.reset(key)


# Singleton instances
rate_limiter = MemoryRateLimiter()
flood_limiter = MemoryRateLimiter(max_requests=5, window_seconds=30)

# Distributed Redis rate limiters
redis_rate_limiter = RedisRateLimiter(
    max_requests=settings.rate_limit_max_requests,
    window_seconds=settings.rate_limit_window_seconds,
    prefix="rl:general",
)
redis_flood_limiter = RedisRateLimiter(
    max_requests=5,
    window_seconds=30,
    prefix="rl:flood",
)
