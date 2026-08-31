"""Tests for the platform-connections SSE hub and events endpoint.

Covers:
1. The subscriber hub (``app.modules.platform_connections.sse``) — subscribe,
   unsubscribe, and notify routing per connection_id.
2. The SSE generator (``_connection_event_generator``) — event framing,
   keepalive, disconnect termination, and unsubscribe on cleanup.
3. End-to-end: a ``connection.update`` webhook → handler → notify → the
   subscriber queue receives ``connection_state_changed`` (via real HTTP).

NOTE: httpx ``ASGITransport`` buffers responses and cannot stream infinite
SSE bodies, so the generator itself is tested directly instead of through
``client.stream``.
"""

from __future__ import annotations

import asyncio
import json
import uuid

import pytest
from httpx import AsyncClient

from app.core.encryption import encrypt
from app.main import app
from app.modules.auth.deps import get_current_user_sse
from app.modules.auth.models import User, UserRole
from app.modules.auth.service import create_access_token
from app.modules.platform_connections.models import PlatformConnection
from app.modules.tenants.models import Tenant


# ── Fixtures / helpers ─────────────────────────────────────────────────────


async def _create_tenant_and_conn(db_session) -> tuple[Tenant, PlatformConnection]:
    """Create a tenant + evolution connection with valid webhook creds."""
    slug = f"sse-test-{uuid.uuid4().hex[:8]}"
    tenant = Tenant(
        id=uuid.uuid4(),
        name="SSE Test Tenant",
        slug=slug,
        status="active",
        plan="professional",
        timezone="UTC",
        locale="es",
    )
    db_session.add(tenant)
    await db_session.flush()
    conn = PlatformConnection(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        platform_type="evolution",
        display_name="Evo Conn",
        credentials=encrypt(
            {
                "base_url": "http://evo:8080",
                "api_key": "secret-evo-key",
                "instance_name": "inst-test",
            }
        ),
        status="active",
    )
    db_session.add(conn)
    await db_session.commit()
    return tenant, conn


def _override_sse_auth(db_session) -> None:
    """Override the SSE auth dependency with a superadmin dummy user."""
    dummy = User(
        id=uuid.uuid4(),
        email="sse@test.com",
        password_hash="not-a-real-hash",
        name="SSE User",
    )
    dummy.current_role = UserRole.SUPERADMIN
    dummy.current_tenant_id = None

    async def override_auth() -> User:
        return dummy

    app.dependency_overrides[get_current_user_sse] = override_auth


class _FakeRequest:
    """Minimal Request stand-in exposing ``is_disconnected``."""

    def __init__(self, disconnected: bool = False):
        self._disconnected = disconnected

    def set_disconnected(self, value: bool) -> None:
        self._disconnected = value

    async def is_disconnected(self) -> bool:
        return self._disconnected


# ── Hub unit tests ─────────────────────────────────────────────────────────


class TestSseHub:
    """Verify subscribe/unsubscribe/notify routing in the SSE hub."""

    async def test_subscribe_and_notify_delivers_event_to_queue(self) -> None:
        from app.modules.platform_connections import sse

        conn_id = str(uuid.uuid4())
        queue = sse.subscribe(conn_id)
        try:
            await sse.notify_subscribers(
                conn_id, "connection_state_changed", {"status": "connected"}
            )
            event = await asyncio.wait_for(queue.get(), timeout=1.0)
            assert event == {
                "type": "connection_state_changed",
                "data": {"status": "connected"},
            }
        finally:
            sse.unsubscribe(conn_id, queue)

    async def test_notify_routes_only_to_matching_connection(self) -> None:
        from app.modules.platform_connections import sse

        conn_a = str(uuid.uuid4())
        conn_b = str(uuid.uuid4())
        queue_a = sse.subscribe(conn_a)
        queue_b = sse.subscribe(conn_b)
        try:
            await sse.notify_subscribers(
                conn_a, "connection_state_changed", {"status": "connected"}
            )
            event_a = await asyncio.wait_for(queue_a.get(), timeout=1.0)
            assert event_a["type"] == "connection_state_changed"

            # Connection B must NOT receive the event for A
            with pytest.raises(asyncio.TimeoutError):
                await asyncio.wait_for(queue_b.get(), timeout=0.2)
        finally:
            sse.unsubscribe(conn_a, queue_a)
            sse.unsubscribe(conn_b, queue_b)

    async def test_unsubscribe_stops_delivery(self) -> None:
        from app.modules.platform_connections import sse

        conn_id = str(uuid.uuid4())
        queue = sse.subscribe(conn_id)
        sse.unsubscribe(conn_id, queue)

        await sse.notify_subscribers(
            conn_id, "connection_state_changed", {"status": "connected"}
        )
        with pytest.raises(asyncio.TimeoutError):
            await asyncio.wait_for(queue.get(), timeout=0.2)

    async def test_notify_unknown_connection_is_noop(self) -> None:
        from app.modules.platform_connections import sse

        # Must not raise even when nobody is subscribed
        await sse.notify_subscribers(
            str(uuid.uuid4()), "connection_state_changed", {"status": "connected"}
        )


# ── Generator tests ────────────────────────────────────────────────────────


class TestSseGenerator:
    """Verify the SSE generator framing, keepalive, and cleanup."""

    async def test_yields_connected_comment_then_event_frame(self) -> None:
        from app.modules.platform_connections import sse
        from app.api.v1.platform_connections import _connection_event_generator

        conn_id = str(uuid.uuid4())
        request = _FakeRequest()
        gen = _connection_event_generator(conn_id, request)

        # First yield: initial connected comment
        first = await gen.__anext__()
        assert first == ": connected\n\n"

        # Push an event through the hub and consume the next frame
        task = asyncio.create_task(
            sse.notify_subscribers(
                conn_id, "connection_state_changed", {"status": "connected"}
            )
        )
        frame = await asyncio.wait_for(gen.__anext__(), timeout=1.0)
        await task

        assert frame.startswith("data: ")
        parsed = json.loads(frame[len("data: "):].strip())
        assert parsed["type"] == "connection_state_changed"
        assert parsed["data"]["status"] == "connected"
        await gen.aclose()

    async def test_yields_keepalive_when_no_event(self) -> None:
        from app.api.v1.platform_connections import _connection_event_generator

        conn_id = str(uuid.uuid4())
        request = _FakeRequest()
        gen = _connection_event_generator(conn_id, request)

        assert await gen.__anext__() == ": connected\n\n"
        # No event pushed → the 5s wait_for times out → keepalive comment
        frame = await asyncio.wait_for(gen.__anext__(), timeout=6.0)
        assert frame == ": keepalive\n\n"
        await gen.aclose()

    async def test_terminates_and_unsubscribes_on_disconnect(self) -> None:
        from app.modules.platform_connections import sse
        from app.api.v1.platform_connections import _connection_event_generator

        conn_id = str(uuid.uuid4())
        request = _FakeRequest()
        gen = _connection_event_generator(conn_id, request)

        assert await gen.__anext__() == ": connected\n\n"
        # Subscriber is registered while the generator is alive
        assert len(sse._subscribers.get(conn_id, [])) == 1

        # Disconnect → next iteration must stop the generator
        request.set_disconnected(True)
        with pytest.raises(StopAsyncIteration):
            await gen.__anext__()

        # Cleanup removed the subscriber
        assert conn_id not in sse._subscribers


# ── Endpoint tests ─────────────────────────────────────────────────────────


class TestSseEndpoint:
    """Verify the GET /platform-connections/{id}/events endpoint."""

    async def test_requires_auth(self, client: AsyncClient, db_session) -> None:
        conn_id = uuid.uuid4()
        # No override of get_current_user_sse → 401
        resp = await client.get(f"/api/v1/platform-connections/{conn_id}/events")
        assert resp.status_code == 401

    async def test_token_query_param_rejected(
        self, client: AsyncClient, db_session
    ) -> None:
        """SSE-1: ?token=<jwt> no longer authenticates — 401, no stream.

        The query fallback was removed from get_current_user_sse; the param is
        now ignored and the request arrives with no credentials. The user is
        persisted so the OLD ?token= path would have authenticated and reached
        the handler (404 unknown connection) — a 401 proves the query param
        no longer counts as a credential.
        """
        user = User(
            id=uuid.uuid4(),
            email="sse-token@test.com",
            name="SSE Token",
            password_hash="hash",
        )
        db_session.add(user)
        await db_session.commit()
        token = create_access_token(
            str(user.id), user.email, role="client", tenant_id=None
        )
        resp = await client.get(
            f"/api/v1/platform-connections/{uuid.uuid4()}/events",
            params={"token": token},
        )
        assert resp.status_code == 401

    async def test_bearer_header_accepted(
        self, client: AsyncClient, db_session
    ) -> None:
        """SSE-2: Authorization: Bearer authenticates the stream.

        A valid JWT + persisted user passes get_current_user_sse; the unknown
        connection id then yields 404 (auth succeeded), never 401.
        """
        user = User(
            id=uuid.uuid4(),
            email="sse-bearer@test.com",
            name="SSE Bearer",
            password_hash="hash",
        )
        db_session.add(user)
        await db_session.commit()
        token = create_access_token(
            str(user.id), user.email, role="client", tenant_id=None
        )
        resp = await client.get(
            f"/api/v1/platform-connections/{uuid.uuid4()}/events",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 404

    async def test_unknown_connection_returns_404(self, client: AsyncClient, db_session) -> None:
        _override_sse_auth(db_session)
        resp = await client.get(
            f"/api/v1/platform-connections/{uuid.uuid4()}/events"
        )
        assert resp.status_code == 404

    async def test_tenant_isolation_returns_404(self, client: AsyncClient, db_session) -> None:
        """A non-superadmin user from another tenant must not subscribe."""
        tenant, conn = await _create_tenant_and_conn(db_session)

        dummy = User(
            id=uuid.uuid4(),
            email="other@test.com",
            password_hash="x",
            name="Other",
        )
        dummy.current_role = UserRole.ADMIN
        dummy.current_tenant_id = uuid.uuid4()  # different tenant

        async def override_auth() -> User:
            return dummy

        app.dependency_overrides[get_current_user_sse] = override_auth
        resp = await client.get(
            f"/api/v1/platform-connections/{conn.id}/events"
        )
        assert resp.status_code == 404


# ── End-to-end: webhook → handler → hub ────────────────────────────────────


class TestWebhookPublishesToHub:
    """POST /webhook/evolution/{id} must notify SSE subscribers."""

    async def test_connection_update_webhook_notifies_subscribers(
        self, client: AsyncClient, db_session
    ) -> None:
        from app.modules.platform_connections import sse

        tenant, conn = await _create_tenant_and_conn(db_session)
        queue = sse.subscribe(str(conn.id))
        try:
            resp = await client.post(
                f"/webhook/evolution/{conn.id}",
                json={
                    "event": "connection.update",
                    "instance": "inst-test",
                    "data": {"state": "open"},
                },
                headers={"apikey": "secret-evo-key"},
            )
            assert resp.status_code == 200

            event = await asyncio.wait_for(queue.get(), timeout=1.0)
            assert event["type"] == "connection_state_changed"
            assert event["data"]["status"] == "connected"

            # State must also be persisted so a refetch sees it
            await db_session.refresh(conn)
            assert (conn.extra_data or {}).get("connection_status") == "connected"
            assert conn.status == "active"
        finally:
            sse.unsubscribe(str(conn.id), queue)

    async def test_webhook_does_not_notify_other_connection(
        self, client: AsyncClient, db_session
    ) -> None:
        from app.modules.platform_connections import sse

        tenant, conn = await _create_tenant_and_conn(db_session)
        _, other_conn = await _create_tenant_and_conn(db_session)

        other_queue = sse.subscribe(str(other_conn.id))
        try:
            resp = await client.post(
                f"/webhook/evolution/{conn.id}",
                json={
                    "event": "connection.update",
                    "instance": "inst-test",
                    "data": {"state": "open"},
                },
                headers={"apikey": "secret-evo-key"},
            )
            assert resp.status_code == 200

            # The other connection's queue must NOT receive the event
            with pytest.raises(asyncio.TimeoutError):
                await asyncio.wait_for(other_queue.get(), timeout=0.3)
        finally:
            sse.unsubscribe(str(other_conn.id), other_queue)


# ── Handler emission tests ─────────────────────────────────────────────────


class TestConnectionUpdateEmitsEvent:
    """Verify handle_evolution_connection_update persists + notifies."""

    async def test_handler_emits_connection_state_changed(self, db_session) -> None:
        from app.modules.evolution.handler import handle_evolution_connection_update
        from app.modules.platform_connections import sse

        tenant, conn = await _create_tenant_and_conn(db_session)
        queue = sse.subscribe(str(conn.id))
        try:
            await handle_evolution_connection_update(
                {
                    "event": "connection.update",
                    "instance": "inst-test",
                    "data": {"state": "open"},
                },
                conn,
                db_session,
            )
            event = await asyncio.wait_for(queue.get(), timeout=1.0)
            assert event["type"] == "connection_state_changed"
            assert event["data"]["status"] == "connected"
        finally:
            sse.unsubscribe(str(conn.id), queue)

    async def test_handler_persists_state_and_activates_connection(self, db_session) -> None:
        from app.modules.evolution.handler import handle_evolution_connection_update

        tenant, conn = await _create_tenant_and_conn(db_session)
        await handle_evolution_connection_update(
            {
                "event": "connection.update",
                "instance": "inst-test",
                "data": {"state": "open"},
            },
            conn,
            db_session,
        )
        await db_session.refresh(conn)
        assert (conn.extra_data or {}).get("connection_status") == "connected"
        assert conn.status == "active"
