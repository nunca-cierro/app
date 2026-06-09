"""Sliding window rate limiter — in-memory, per-user."""

from __future__ import annotations

import time
import threading
from collections import defaultdict
from dataclasses import dataclass, field


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
            entry = self._entries[key]
            # Remove old timestamps outside the window
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


# Singleton globals
rate_limiter = MemoryRateLimiter()
flood_limiter = MemoryRateLimiter(max_requests=5, window_seconds=30)
