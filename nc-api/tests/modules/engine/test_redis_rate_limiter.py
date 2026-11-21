"""Unit and integration tests for RedisRateLimiter."""

from __future__ import annotations

import pytest
from app.core.rate_limiter import RedisRateLimiter


@pytest.mark.asyncio
class TestRedisRateLimiter:
    """Sliding window RedisRateLimiter tests."""

    async def test_requests_allowed_within_limit(self) -> None:
        limiter = RedisRateLimiter(max_requests=3, window_seconds=10, prefix="test:rl")
        key = "user_ok"
        await limiter.reset(key)

        assert await limiter.is_allowed(key) is True
        assert await limiter.is_allowed(key) is True
        assert await limiter.is_allowed(key) is True

    async def test_exceeding_limit_is_blocked(self) -> None:
        limiter = RedisRateLimiter(max_requests=2, window_seconds=10, prefix="test:rl:block")
        key = "user_blocked"
        await limiter.reset(key)

        assert await limiter.is_allowed(key) is True
        assert await limiter.is_allowed(key) is True
        assert await limiter.is_allowed(key) is False

    async def test_reset_clears_window(self) -> None:
        limiter = RedisRateLimiter(max_requests=1, window_seconds=10, prefix="test:rl:reset")
        key = "user_reset"
        await limiter.reset(key)

        assert await limiter.is_allowed(key) is True
        assert await limiter.is_allowed(key) is False

        await limiter.reset(key)
        assert await limiter.is_allowed(key) is True

    async def test_remaining_count(self) -> None:
        limiter = RedisRateLimiter(max_requests=3, window_seconds=10, prefix="test:rl:rem")
        key = "user_rem"
        await limiter.reset(key)

        assert await limiter.remaining(key) == 3
        await limiter.is_allowed(key)
        assert await limiter.remaining(key) == 2
