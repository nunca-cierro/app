"""Tests for PlatformConnection model, schemas, and API endpoints."""

from __future__ import annotations

import os
import uuid
from datetime import datetime
from typing import Any

import pytest

os.environ.setdefault("ENCRYPTION_KEY", "dGhpcyBpcyBhIDE2LWJ5dGUgZXhhbXBsZSBrZXkgISE=")

from app.modules.platform_connections.models import PlatformConnection
from app.modules.platform_connections.schemas import (
    PlatformConnectionCreate,
    PlatformConnectionUpdate,
    PlatformConnectionResponse,
)
from app.db.base import Base


class TestPlatformConnectionModel:
    """Verify the SQLAlchemy model class definition."""

    def test_tablename(self) -> None:
        assert PlatformConnection.__tablename__ == "platform_connections"

    def test_primary_key(self) -> None:
        col = PlatformConnection.__table__.columns["id"]
        assert col.primary_key

    def test_has_tenant_id(self) -> None:
        col = PlatformConnection.__table__.columns["tenant_id"]
        assert col is not None
        assert not col.nullable

    def test_has_platform_type(self) -> None:
        col = PlatformConnection.__table__.columns["platform_type"]
        assert col is not None
        assert col.type.python_type == str

    def test_has_display_name(self) -> None:
        col = PlatformConnection.__table__.columns["display_name"]
        assert col is not None

    def test_has_credentials(self) -> None:
        col = PlatformConnection.__table__.columns["credentials"]
        assert col is not None
        assert not col.nullable

    def test_has_metadata_nullable(self) -> None:
        col = PlatformConnection.__table__.columns["metadata"]
        assert col is not None
        assert col.nullable

    def test_has_status(self) -> None:
        col = PlatformConnection.__table__.columns["status"]
        assert col is not None

    def test_has_is_primary(self) -> None:
        col = PlatformConnection.__table__.columns["is_primary"]
        assert col is not None

    def test_has_created_at(self) -> None:
        col = PlatformConnection.__table__.columns["created_at"]
        assert col is not None

    def test_has_updated_at(self) -> None:
        col = PlatformConnection.__table__.columns["updated_at"]
        assert col is not None

    def test_is_registered_in_base(self) -> None:
        assert "platform_connections" in Base.metadata.tables

    def test_model_is_registered_in_models_hub(self) -> None:
        """Verify the import from app.db.models works."""
        from app.db.models import PlatformConnection as PC  # noqa: F811
        assert PC is PlatformConnection


class TestPlatformConnectionSchemas:
    """Verify Pydantic schema validation and serialization."""

    def test_create_schema_valid(self) -> None:
        data = {
            "tenant_id": str(uuid.uuid4()),
            "platform_type": "whatsapp",
            "display_name": "My WhatsApp",
            "credentials": {"token": "secret123"},
        }
        schema = PlatformConnectionCreate(**data)
        assert schema.tenant_id == uuid.UUID(data["tenant_id"])
        assert schema.platform_type == "whatsapp"
        assert schema.display_name == "My WhatsApp"
        assert schema.credentials == {"token": "secret123"}

    def test_create_schema_defaults(self) -> None:
        data = {
            "tenant_id": str(uuid.uuid4()),
            "platform_type": "telegram",
            "display_name": "My Bot",
            "credentials": {"bot_token": "abc:def"},
        }
        schema = PlatformConnectionCreate(**data)
        assert schema.status == "active"
        assert schema.is_primary is False
        assert schema.extra_data is None

    def test_create_schema_invalid_platform_type(self) -> None:
        data = {
            "tenant_id": str(uuid.uuid4()),
            "platform_type": "slack",
            "display_name": "Test",
            "credentials": {"key": "value"},
        }
        with pytest.raises(ValueError, match="platform_type"):
            PlatformConnectionCreate(**data)

    def test_create_schema_missing_required(self) -> None:
        with pytest.raises(ValueError):
            PlatformConnectionCreate()  # type: ignore[call-arg]

    def test_update_schema_partial(self) -> None:
        schema = PlatformConnectionUpdate(display_name="Renamed")
        assert schema.display_name == "Renamed"
        assert schema.status is None

    def test_update_schema_empty(self) -> None:
        schema = PlatformConnectionUpdate()
        # All fields are optional
        assert schema.model_dump(exclude_unset=True) == {}

    def test_response_schema_strips_credentials(self) -> None:
        """Response schema must NOT expose credentials."""
        data = {
            "id": uuid.uuid4(),
            "tenant_id": uuid.uuid4(),
            "platform_type": "whatsapp",
            "display_name": "Test",
            "credentials": "encrypted:abc123",
            "extra_data": None,
            "status": "active",
            "is_primary": False,
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
        }
        # credentials is excluded in response
        response = PlatformConnectionResponse(**data)
        dumped = response.model_dump()
        assert "credentials" not in dumped

    def test_response_schema_has_expected_fields(self) -> None:
        data = {
            "id": uuid.uuid4(),
            "tenant_id": uuid.uuid4(),
            "platform_type": "telegram",
            "display_name": "Bot",
            "credentials": "encrypted:x",
            "extra_data": None,
            "status": "inactive",
            "is_primary": True,
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
        }
        response = PlatformConnectionResponse(**data)
        dumped = response.model_dump()
        assert "id" in dumped
        assert "platform_type" in dumped
        assert "display_name" in dumped
        assert "status" in dumped
        assert "is_primary" in dumped
        assert "created_at" in dumped
        assert "updated_at" in dumped


@pytest.mark.asyncio
class TestPlatformConnectionsAPI:
    """Integration tests for the CRUD API endpoints."""

    CREATE_PAYLOAD = {
        "tenant_id": "00000000-0000-0000-0000-000000000001",
        "platform_type": "whatsapp",
        "display_name": "Test WhatsApp Connection",
        "credentials": {"token": "test-token-123", "phone_number_id": "12345"},
    }

    async def _create_tenant(self, db_session: Any) -> uuid.UUID:
        """Insert a minimal tenant record so FK constraints pass."""
        from app.modules.tenants.models import Tenant
        tenant = Tenant(
            id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
            name="Test Tenant",
            slug="test-tenant",
            status="active",
            plan="basic",
            timezone="UTC",
            locale="en",
        )
        db_session.add(tenant)
        await db_session.commit()
        return tenant.id

    async def test_create_connection(self, client: Any, db_session: Any) -> None:
        await self._create_tenant(db_session)
        response = await client.post("/api/v1/platform-connections", json=self.CREATE_PAYLOAD)
        assert response.status_code == 201
        data = response.json()
        assert data["platform_type"] == "whatsapp"
        assert data["display_name"] == "Test WhatsApp Connection"
        assert data["status"] == "active"
        # Credentials must NOT be in the response
        assert "credentials" not in data
        assert "id" in data

    async def test_list_connections(self, client: Any, db_session: Any) -> None:
        await self._create_tenant(db_session)
        # Create one connection first
        await client.post("/api/v1/platform-connections", json=self.CREATE_PAYLOAD)
        # List
        response = await client.get("/api/v1/platform-connections")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        # No credentials leaked
        for item in data:
            assert "credentials" not in item

    async def test_get_connection_by_id(self, client: Any, db_session: Any) -> None:
        await self._create_tenant(db_session)
        create_resp = await client.post("/api/v1/platform-connections", json=self.CREATE_PAYLOAD)
        created = create_resp.json()
        conn_id = created["id"]

        response = await client.get(f"/api/v1/platform-connections/{conn_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == conn_id
        assert "credentials" not in data

    async def test_get_connection_not_found(self, client: Any) -> None:
        fake_id = "00000000-0000-0000-0000-000000009999"
        response = await client.get(f"/api/v1/platform-connections/{fake_id}")
        assert response.status_code == 404

    async def test_update_connection(self, client: Any, db_session: Any) -> None:
        await self._create_tenant(db_session)
        create_resp = await client.post("/api/v1/platform-connections", json=self.CREATE_PAYLOAD)
        created = create_resp.json()
        conn_id = created["id"]

        update = {"display_name": "Updated Name", "status": "inactive"}
        response = await client.patch(f"/api/v1/platform-connections/{conn_id}", json=update)
        assert response.status_code == 200
        data = response.json()
        assert data["display_name"] == "Updated Name"
        assert data["status"] == "inactive"
        assert "credentials" not in data

    async def test_update_not_found(self, client: Any) -> None:
        fake_id = "00000000-0000-0000-0000-000000009999"
        response = await client.patch(f"/api/v1/platform-connections/{fake_id}", json={"display_name": "X"})
        assert response.status_code == 404

    async def test_delete_connection(self, client: Any, db_session: Any) -> None:
        await self._create_tenant(db_session)
        create_resp = await client.post("/api/v1/platform-connections", json=self.CREATE_PAYLOAD)
        created = create_resp.json()
        conn_id = created["id"]

        response = await client.delete(f"/api/v1/platform-connections/{conn_id}")
        assert response.status_code == 204

        # Verify it's gone
        get_resp = await client.get(f"/api/v1/platform-connections/{conn_id}")
        assert get_resp.status_code == 404

    async def test_delete_not_found(self, client: Any) -> None:
        fake_id = "00000000-0000-0000-0000-000000009999"
        response = await client.delete(f"/api/v1/platform-connections/{fake_id}")
        assert response.status_code == 404

    async def test_create_with_invalid_platform(self, client: Any) -> None:
        payload = {**self.CREATE_PAYLOAD, "platform_type": "instagram"}
        response = await client.post("/api/v1/platform-connections", json=payload)
        assert response.status_code == 422  # Validation error from Pydantic
