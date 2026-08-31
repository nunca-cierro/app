"""CSRF double-submit tests (Slice B — AS-5).

Covers ``require_csrf`` at both layers:

1. Unit — the dependency in isolation with a Starlette Request:
   GET/HEAD/OPTIONS skip (SSE is a GET), cookie-less mutations skip
   (Bearer/anonymous tooling), and cookie-authenticated mutations are
   enforced with ``secrets.compare_digest``.
2. Router wiring — the dependency injected ONCE at the v1 router so every
   /api/v1 mutation inherits the check while login/register (cookie-less)
   and reads keep working.
"""

from __future__ import annotations

import uuid

import pytest
from fastapi import HTTPException
from httpx import AsyncClient
from starlette.requests import Request

from app.modules.auth.csrf import require_csrf


def _request(
    method: str = "POST",
    cookies: dict[str, str] | None = None,
    headers: dict[str, str] | None = None,
) -> Request:
    all_headers = dict(headers or {})
    if cookies:
        all_headers["cookie"] = "; ".join(f"{k}={v}" for k, v in cookies.items())
    scope: dict = {
        "type": "http",
        "method": method,
        "headers": [
            (k.lower().encode(), v.encode()) for k, v in all_headers.items()
        ],
    }
    return Request(scope)


# ── Unit: safe methods (GET/HEAD/OPTIONS) are never CSRF-checked ────────────


class TestRequireCsrfMethodSkips:
    async def test_skips_get_even_with_session_cookies(self) -> None:
        """GET is safe by construction — SSE streams (GET) must never 403."""
        req = _request(
            method="GET",
            cookies={"nc_access_token": "jwt", "nc_csrf": "abc"},
        )
        assert await require_csrf(req) is None

    async def test_skips_head(self) -> None:
        assert await require_csrf(_request(method="HEAD")) is None

    async def test_skips_options(self) -> None:
        assert await require_csrf(_request(method="OPTIONS")) is None


# ── Unit: no session cookie → skip (login/register/Bearer tooling) ──────────


class TestRequireCsrfSkipWithoutSession:
    async def test_skips_post_without_access_cookie(self) -> None:
        """A cookie-less POST (login/register/Bearer script) is exempt."""
        assert await require_csrf(_request(method="POST")) is None

    async def test_skips_post_with_only_csrf_cookie(self) -> None:
        """nc_csrf without nc_access_token → no session → exempt."""
        req = _request(method="POST", cookies={"nc_csrf": "abc"})
        assert await require_csrf(req) is None


# ── Unit: cookie-authenticated mutations are enforced ───────────────────────


class TestRequireCsrfEnforcement:
    async def test_passes_when_header_matches_cookie(self) -> None:
        req = _request(
            method="POST",
            cookies={"nc_access_token": "jwt", "nc_csrf": "abc"},
            headers={"X-CSRF-Token": "abc"},
        )
        assert await require_csrf(req) is None

    async def test_403_when_header_missing(self) -> None:
        req = _request(
            method="POST", cookies={"nc_access_token": "jwt", "nc_csrf": "abc"}
        )
        with pytest.raises(HTTPException) as exc:
            await require_csrf(req)
        assert exc.value.status_code == 403

    async def test_403_when_header_mismatches(self) -> None:
        req = _request(
            method="POST",
            cookies={"nc_access_token": "jwt", "nc_csrf": "abc"},
            headers={"X-CSRF-Token": "wrong"},
        )
        with pytest.raises(HTTPException) as exc:
            await require_csrf(req)
        assert exc.value.status_code == 403

    async def test_403_when_csrf_cookie_missing(self) -> None:
        req = _request(method="POST", cookies={"nc_access_token": "jwt"})
        with pytest.raises(HTTPException) as exc:
            await require_csrf(req)
        assert exc.value.status_code == 403


# ── Router wiring: AS-5 applied once at the v1 router ───────────────────────


class TestCsrfRouterWiring:
    """Probe the wiring through POST /auth/switch-tenant: the client fixture
    authenticates via the get_current_user override, so the ONLY thing that
    can reject the request before the handler is require_csrf. The handler's
    own 403 carries a distinct detail ("Not a member"), so a 403 with the
    CSRF detail proves the router dependency fired."""

    CSRF_DETAIL = "CSRF token missing/mismatch"
    MEMBER_DETAIL = "Not a member"

    async def test_mutation_without_session_cookie_reaches_endpoint(
        self, client: AsyncClient, db_session
    ) -> None:
        """Cookie-less POST (login/register/Bearer path) skips CSRF."""
        resp = await client.post(
            "/api/v1/auth/switch-tenant",
            json={"tenant_id": str(uuid.uuid4())},
        )
        assert resp.status_code == 403
        assert self.MEMBER_DETAIL in resp.text  # handler ran, CSRF skipped

    async def test_mutation_with_session_cookie_but_no_csrf_header_403(
        self, client: AsyncClient, db_session
    ) -> None:
        """Browser session cookie without X-CSRF-Token → CSRF 403."""
        client.cookies.set("nc_access_token", "stale-jwt")
        client.cookies.set("nc_csrf", "abc")
        resp = await client.post(
            "/api/v1/auth/switch-tenant",
            json={"tenant_id": str(uuid.uuid4())},
        )
        assert resp.status_code == 403
        assert self.CSRF_DETAIL in resp.text  # CSRF fired, handler never ran

    async def test_mutation_with_matching_csrf_reaches_endpoint(
        self, client: AsyncClient, db_session
    ) -> None:
        """X-CSRF-Token == nc_csrf cookie → CSRF passes, handler runs."""
        client.cookies.set("nc_access_token", "stale-jwt")
        client.cookies.set("nc_csrf", "abc")
        resp = await client.post(
            "/api/v1/auth/switch-tenant",
            json={"tenant_id": str(uuid.uuid4())},
            headers={"X-CSRF-Token": "abc"},
        )
        assert resp.status_code == 403
        assert self.MEMBER_DETAIL in resp.text  # handler ran, CSRF passed

    async def test_get_with_session_cookie_skips_csrf(
        self, client: AsyncClient, db_session
    ) -> None:
        """GET with a session cookie (silent restore / SSE) → no CSRF needed."""
        client.cookies.set("nc_access_token", "stale-jwt")
        resp = await client.get("/api/v1/tenants")
        assert resp.status_code == 200