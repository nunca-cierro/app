"""Slice B auth-flow matrix — cookie sessions + CSRF (AS-1..AS-10).

Runs the REAL auth stack (the client fixture's get_current_user override is
removed) so every flow exercises: login/register setting the cookie pair,
switch-tenant re-issuing the session cookie, silent restore via /auth/me,
SSE authenticating through the cookie, change-password CSRF enforcement,
logout clearing both cookies, and Bearer tooling with CSRF skipped.
"""

from __future__ import annotations

import uuid

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from httpx import ASGITransport, AsyncClient
from jose import jwt
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.requests import Request

from app.core.config import settings
from app.main import app
from app.modules.auth.csrf import ACCESS_TOKEN_COOKIE, CSRF_COOKIE, CSRF_HEADER
from app.modules.auth.deps import get_current_user
from app.modules.auth.models import User, UserRole
from app.modules.auth.service import create_access_token, hash_password
from app.modules.auth.user_tenant import UserTenant
from app.modules.tenants.models import Tenant


def _no_auth_override() -> None:
    """Remove the client fixture's get_current_user override so requests flow
    through the real cookie/Bearer auth stack (autouse fixture clears after)."""
    app.dependency_overrides.pop(get_current_user, None)


def _create_user(
    db_session: AsyncSession,
    *,
    email: str = "user@test.com",
    role: UserRole = UserRole.ADMIN,
    password: str = "secret123",
) -> User:
    user = User(
        id=uuid.uuid4(),
        email=email,
        password_hash=hash_password(password),
        name="Test User",
        role=role,
    )
    db_session.add(user)
    return user


def _create_tenant(db_session: AsyncSession, name: str, slug: str, plan: str = "basic") -> Tenant:
    tenant = Tenant(
        id=uuid.uuid4(),
        name=name,
        slug=slug,
        status="active",
        plan=plan,
        timezone="UTC",
        locale="en",
    )
    db_session.add(tenant)
    return tenant


def _set_cookie_headers(response) -> dict[str, str]:
    """Map cookie name → raw Set-Cookie header (attributes included)."""
    return {
        h.split("=", 1)[0]: h for h in response.headers.get_list("set-cookie")
    }


def _cookie_request(cookies: dict[str, str]) -> Request:
    scope: dict = {
        "type": "http",
        "method": "GET",
        "headers": [
            (
                b"cookie",
                "; ".join(f"{k}={v}" for k, v in cookies.items()).encode(),
            )
        ],
    }
    return Request(scope)


def _https_client() -> AsyncClient:
    """Flow client over https://test — httpx only SENDS Secure cookies over
    https, so the Secure-on (production) cookie jar is exercised end-to-end.
    Shares the app-level dependency overrides registered by the ``client``
    fixture (get_session → test DB)."""
    return AsyncClient(transport=ASGITransport(app=app), base_url="https://test")


async def _login(client: AsyncClient, email: str, password: str = "secret123"):
    resp = await client.post(
        "/api/v1/auth/login", json={"email": email, "password": password}
    )
    assert resp.status_code == 200, resp.text
    return resp


# ── get_current_user: Bearer-first cookie fallback (AS-4) ───────────────────


class TestGetCurrentUserCookieFallback:
    async def test_authenticates_via_cookie(self, client, db_session) -> None:
        _no_auth_override()
        user = _create_user(db_session)
        await db_session.commit()
        token = create_access_token(str(user.id), user.email, role=user.role, tenant_id=None)

        authed = await get_current_user(
            request=_cookie_request({ACCESS_TOKEN_COOKIE: token}),
            credentials=None,
            session=db_session,
        )
        assert authed.id == user.id
        assert authed.current_role == UserRole.ADMIN

    async def test_bearer_wins_when_both_present(self, client, db_session) -> None:
        """AS-4 scenario: Bearer + cookie with DIFFERENT users → Bearer wins."""
        _no_auth_override()
        bearer_user = _create_user(db_session, email="bearer@test.com", role=UserRole.ADMIN)
        cookie_user = _create_user(db_session, email="cookie@test.com", role=UserRole.CLIENT)
        await db_session.commit()
        bearer_token = create_access_token(str(bearer_user.id), bearer_user.email, role=bearer_user.role, tenant_id=None)
        cookie_token = create_access_token(str(cookie_user.id), cookie_user.email, role=cookie_user.role, tenant_id=None)

        authed = await get_current_user(
            request=_cookie_request({ACCESS_TOKEN_COOKIE: cookie_token}),
            credentials=HTTPAuthorizationCredentials(scheme="Bearer", credentials=bearer_token),
            session=db_session,
        )
        assert authed.id == bearer_user.id
        assert authed.current_role == UserRole.ADMIN

    async def test_401_without_any_credentials(self, client, db_session) -> None:
        _no_auth_override()
        with pytest.raises(HTTPException) as exc:
            await get_current_user(
                request=_cookie_request({}), credentials=None, session=db_session
            )
        assert exc.value.status_code == 401


# ── Full auth flows (real stack) ────────────────────────────────────────────


class TestLoginCookies:
    async def test_login_sets_cookie_pair_with_no_body_token(self, client, db_session) -> None:
        """AS-1: 2 Set-Cookie (httpOnly + non-httpOnly), no body access_token."""
        _no_auth_override()
        user = _create_user(db_session)
        await db_session.commit()

        resp = await client.post(
            "/api/v1/auth/login",
            json={"email": user.email, "password": "secret123"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" not in data
        assert data["user_id"] == str(user.id)
        assert data["email"] == user.email
        assert data["role"] == UserRole.ADMIN.value

        cookies = _set_cookie_headers(resp)
        access = cookies[ACCESS_TOKEN_COOKIE]
        csrf = cookies[CSRF_COOKIE]
        assert "HttpOnly" in access
        assert "Secure" in access
        assert "SameSite=lax" in access
        assert "Path=/" in access
        assert "HttpOnly" not in csrf  # JS must read it to echo X-CSRF-Token
        assert "Secure" in csrf

    async def test_login_cookies_not_secure_when_dev_flag_off(
        self, client, db_session, monkeypatch
    ) -> None:
        """AS-1 dev: AUTH_COOKIE_SECURE=false drops the Secure attribute."""
        _no_auth_override()
        user = _create_user(db_session)
        await db_session.commit()
        monkeypatch.setattr(settings, "auth_cookie_secure", False)

        resp = await client.post(
            "/api/v1/auth/login",
            json={"email": user.email, "password": "secret123"},
        )
        cookies = _set_cookie_headers(resp)
        assert "Secure" not in cookies[ACCESS_TOKEN_COOKIE]
        assert "Secure" not in cookies[CSRF_COOKIE]


class TestRegisterCookies:
    async def test_register_sets_cookie_pair_with_no_body_token(self, client, db_session) -> None:
        """AS-2: register sets the same cookie pair as login, no body token."""
        _no_auth_override()
        resp = await client.post(
            "/api/v1/auth/register",
            json={"email": "new@test.com", "password": "secret123", "name": "New User"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert "access_token" not in data
        assert data["role"] == UserRole.CLIENT.value

        cookies = _set_cookie_headers(resp)
        assert "HttpOnly" in cookies[ACCESS_TOKEN_COOKIE]
        assert "HttpOnly" not in cookies[CSRF_COOKIE]


class TestSwitchTenantCookies:
    async def test_switch_tenant_refreshes_cookie_and_me_reflects(self, client, db_session) -> None:
        """AS-3: cookie re-issued with new tenant context; /auth/me reflects it."""
        _no_auth_override()
        user = _create_user(db_session)
        t1 = _create_tenant(db_session, "Home", "home")
        t2 = _create_tenant(db_session, "Target", "target")
        await db_session.flush()
        db_session.add(UserTenant(user_id=user.id, tenant_id=t1.id, role=UserRole.ADMIN, is_primary=True))
        db_session.add(UserTenant(user_id=user.id, tenant_id=t2.id, role=UserRole.CLIENT, is_primary=False))
        await db_session.commit()

        async with _https_client() as client:
            await _login(client, user.email)
            initial = jwt.decode(client.cookies[ACCESS_TOKEN_COOKIE], settings.jwt_secret, algorithms=["HS256"])
            assert initial["tenant_id"] == str(t1.id)

            resp = await client.post(
                "/api/v1/auth/switch-tenant",
                json={"tenant_id": str(t2.id)},
                headers={CSRF_HEADER: client.cookies[CSRF_COOKIE]},
            )
            assert resp.status_code == 200, resp.text
            assert "access_token" not in resp.json()

            refreshed = jwt.decode(client.cookies[ACCESS_TOKEN_COOKIE], settings.jwt_secret, algorithms=["HS256"])
            assert refreshed["tenant_id"] == str(t2.id)
            assert refreshed["role"] == UserRole.CLIENT.value

            me = await client.get("/api/v1/auth/me")
            assert me.status_code == 200
            assert me.json()["current_tenant_id"] == str(t2.id)
            # current_role comes from the DB global role (UR-9 deps.py), not
            # the per-tenant JWT claim — the tenant switch is what /auth/me
            # reflects (AS-3).


class TestSilentRestore:
    async def test_me_200_with_cookie_401_without(self, client, db_session) -> None:
        """Silent restore: /auth/me works with the cookie, 401 without."""
        _no_auth_override()
        user = _create_user(db_session)
        await db_session.commit()

        async with _https_client() as https:
            resp = await https.get("/api/v1/auth/me")
            assert resp.status_code == 401

            await _login(https, user.email)
            me = await https.get("/api/v1/auth/me")
            assert me.status_code == 200
            assert me.json()["email"] == user.email


class TestSseViaCookie:
    async def test_sse_authenticates_via_cookie(self, client, db_session) -> None:
        """SSE-3: the shared get_current_user accepts the session cookie."""
        _no_auth_override()
        user = _create_user(db_session)
        await db_session.commit()

        async with _https_client() as https:
            await _login(https, user.email)

            # 404 (unknown connection) proves auth succeeded — never 401.
            resp = await https.get(f"/api/v1/platform-connections/{uuid.uuid4()}/events")
            assert resp.status_code == 404


class TestChangePasswordCsrf:
    async def test_change_password_requires_csrf(self, client, db_session) -> None:
        """AS-5/AS-10: 200 with valid X-CSRF-Token; 403 without/mismatch."""
        _no_auth_override()
        user = _create_user(db_session)
        await db_session.commit()

        async with _https_client() as https:
            await _login(https, user.email)
            body = {"current_password": "secret123", "new_password": "newsecret123"}

            no_csrf = await https.post("/api/v1/auth/change-password", json=body)
            assert no_csrf.status_code == 403

            mismatch = await https.post(
                "/api/v1/auth/change-password", json=body, headers={CSRF_HEADER: "wrong"}
            )
            assert mismatch.status_code == 403

            ok = await https.post(
                "/api/v1/auth/change-password",
                json=body,
                headers={CSRF_HEADER: https.cookies[CSRF_COOKIE]},
            )
            assert ok.status_code == 200


class TestLogout:
    async def test_logout_clears_both_cookies(self, client, db_session) -> None:
        """AS-8: logout expires nc_access_token + nc_csrf; session is dead."""
        _no_auth_override()
        user = _create_user(db_session)
        await db_session.commit()

        async with _https_client() as https:
            await _login(https, user.email)
            assert https.cookies.get(ACCESS_TOKEN_COOKIE) is not None

            resp = await https.post(
                "/api/v1/auth/logout",
                headers={CSRF_HEADER: https.cookies[CSRF_COOKIE]},
            )
            assert resp.status_code == 200
            assert resp.json()["status"] == "ok"
            assert https.cookies.get(ACCESS_TOKEN_COOKIE) is None
            assert https.cookies.get(CSRF_COOKIE) is None

            me = await https.get("/api/v1/auth/me")
            assert me.status_code == 401


class TestBearerTooling:
    async def test_bearer_mutation_skips_csrf(self, client, db_session) -> None:
        """No cookie → CSRF skipped; Bearer authenticates (tools keep working)."""
        _no_auth_override()
        user = _create_user(db_session)
        tenant = _create_tenant(db_session, "Tool", "tool")
        await db_session.flush()
        db_session.add(UserTenant(user_id=user.id, tenant_id=tenant.id, role=UserRole.ADMIN, is_primary=True))
        await db_session.commit()
        token = create_access_token(str(user.id), user.email, role=user.role, tenant_id=str(tenant.id))

        resp = await client.post(
            "/api/v1/auth/switch-tenant",
            json={"tenant_id": str(tenant.id)},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200  # membership OK, CSRF skipped (no cookie)