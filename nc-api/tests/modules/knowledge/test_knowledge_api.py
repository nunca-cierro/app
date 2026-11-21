"""Integration tests for /api/v1/knowledge endpoints."""

from __future__ import annotations

import io
import uuid
import pytest
from httpx import ASGITransport, AsyncClient
from unittest.mock import AsyncMock, patch

from app.main import app
from app.modules.auth.deps import get_current_user
from app.modules.auth.models import User, UserRole
from app.modules.knowledge.models import KnowledgeDocument, KnowledgeChunk
from app.modules.tenants.models import Tenant
from app.db.session import get_session


@pytest.fixture
def mock_admin_user():
    tenant_id = uuid.uuid4()
    user = User(
        id=uuid.uuid4(),
        email="admin@nuncacierro.com",
        password_hash="fake_hash",
        name="Admin Test",
        role=UserRole.SUPERADMIN,
    )
    setattr(user, "current_role", user.role)
    setattr(user, "current_tenant_id", tenant_id)
    return user


@pytest.mark.asyncio
async def test_extract_url_endpoint(mock_admin_user):
    app.dependency_overrides[get_current_user] = lambda: mock_admin_user

    mock_resp = AsyncMock()
    mock_resp.text = "<html><head><title>Página Demo</title></head><body><h1>Título</h1><p>Contenido relevante.</p></body></html>"
    mock_resp.raise_for_status = AsyncMock()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        with patch("httpx.AsyncClient.get", return_value=mock_resp):
            resp = await client.post(
                "/api/v1/knowledge/extract-url",
                json={"url": "https://midemo.com"},
                headers={"X-CSRF-Token": "test"},
            )

    app.dependency_overrides.clear()
    assert resp.status_code == 200
    data = resp.json()
    assert "Página Demo" in data["title"]
    assert "Contenido relevante" in data["markdown"]


@pytest.mark.asyncio
async def test_extract_file_endpoint_txt(mock_admin_user):
    app.dependency_overrides[get_current_user] = lambda: mock_admin_user

    file_content = b"# Documento Textual\n\nDetalles del servicio."
    files = {"file": ("manual.txt", file_content, "text/plain")}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            "/api/v1/knowledge/extract-file",
            files=files,
            headers={"X-CSRF-Token": "test"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Documento Textual"
    assert "Detalles del servicio" in data["markdown"]


@pytest.mark.asyncio
async def test_create_and_list_documents(mock_admin_user, db_session):
    app.dependency_overrides[get_current_user] = lambda: mock_admin_user
    app.dependency_overrides[get_session] = lambda: db_session

    tenant = Tenant(
        id=mock_admin_user.current_tenant_id,
        name="Test Business",
        slug=f"test-biz-{uuid.uuid4().hex[:6]}",
        status="active",
        plan="basic",
    )
    db_session.add(tenant)
    await db_session.commit()

    payload = {
        "title": "Catálogo Estética",
        "source_type": "manual",
        "raw_markdown": "# Catálogo Estética\n\n## Limpieza Facial\nPrecio $80.000 COP.\n\n## Masaje\nPrecio $120.000 COP.",
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Create document
        create_resp = await client.post(
            "/api/v1/knowledge/documents",
            json=payload,
            headers={"X-CSRF-Token": "test"},
        )
        assert create_resp.status_code == 201
        created_data = create_resp.json()
        assert created_data["title"] == "Catálogo Estética"
        assert created_data["chunks_count"] >= 2
        doc_id = created_data["id"]

        # List documents
        list_resp = await client.get(
            "/api/v1/knowledge/documents",
            headers={"X-CSRF-Token": "test"},
        )
        assert list_resp.status_code == 200
        docs = list_resp.json()
        assert any(d["id"] == doc_id for d in docs)

        # Update document
        update_resp = await client.put(
            f"/api/v1/knowledge/documents/{doc_id}",
            json={
                "title": "Catálogo Estética Actualizado",
                "raw_markdown": "# Catálogo Actualizado\n\n## Limpieza Facial\nPrecio $95.000 COP.",
            },
            headers={"X-CSRF-Token": "test"},
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["title"] == "Catálogo Estética Actualizado"

        # Delete document
        del_resp = await client.delete(
            f"/api/v1/knowledge/documents/{doc_id}",
            headers={"X-CSRF-Token": "test"},
        )
        assert del_resp.status_code == 204

    app.dependency_overrides.clear()
