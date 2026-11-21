"""Tests for KnowledgeService document creation, chunk search, and query integration."""

from __future__ import annotations

import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock

from app.modules.knowledge.models import KnowledgeDocument, KnowledgeChunk
from app.modules.knowledge.service import KnowledgeService


@pytest.mark.asyncio
async def test_create_document_and_chunks():
    service = KnowledgeService()

    fake_session = AsyncMock()
    fake_session.flush = AsyncMock()
    fake_session.commit = AsyncMock()
    fake_session.refresh = AsyncMock()

    tenant_id = uuid.uuid4()
    markdown = """
# Gimnasio Vital

## Planes y Tarifas
El plan mensual cuesta $90.000 COP y el plan anual cuesta $850.000 COP.

## Horarios de Clases
Clases de spinning de lunes a viernes a las 6am y 7pm.
    """

    doc = await service.create_document(
        tenant_id=tenant_id,
        title="Gimnasio Vital",
        source_type="manual",
        raw_markdown=markdown,
        db=fake_session,
    )

    assert doc.title == "Gimnasio Vital"
    assert doc.status == "indexed"
    assert fake_session.add.call_count >= 3  # 1 doc + at least 2 chunks
    assert fake_session.commit.called


@pytest.mark.asyncio
async def test_search_chunks_scoring():
    service = KnowledgeService()

    tenant_id = uuid.uuid4()
    ch1 = KnowledgeChunk(
        id=uuid.uuid4(),
        document_id=uuid.uuid4(),
        tenant_id=tenant_id,
        breadcrumb="Gimnasio > Planes",
        content="[Gimnasio > Planes]\nEl plan mensual cuesta $90.000 COP.",
        chunk_index=0,
    )
    ch2 = KnowledgeChunk(
        id=uuid.uuid4(),
        document_id=uuid.uuid4(),
        tenant_id=tenant_id,
        breadcrumb="Gimnasio > Horarios",
        content="[Gimnasio > Horarios]\nClases de spinning a las 6am.",
        chunk_index=1,
    )

    fake_result = MagicMock()
    fake_result.scalars.return_value.all.return_value = [ch1, ch2]

    fake_session = AsyncMock()
    fake_session.execute.return_value = fake_result

    results = await service.search_chunks(tenant_id, "cuanto cuesta el plan mensual", fake_session)
    assert len(results) >= 1
    assert "El plan mensual cuesta $90.000" in results[0]


@pytest.mark.asyncio
async def test_query_knowledge_combines_biz_config_and_document_chunks():
    service = KnowledgeService()

    tenant_id = str(uuid.uuid4())
    biz_config = {
        "hours": {"lunes a viernes": "8am - 6pm"},
    }

    ch = KnowledgeChunk(
        id=uuid.uuid4(),
        document_id=uuid.uuid4(),
        tenant_id=uuid.UUID(tenant_id),
        breadcrumb="Políticas > Devoluciones",
        content="[Políticas > Devoluciones]\nLas devoluciones aplican dentro de los primeros 5 días hábiles.",
        chunk_index=0,
    )
    fake_result = MagicMock()
    fake_result.scalars.return_value.all.return_value = [ch]

    fake_session = AsyncMock()
    fake_session.execute.return_value = fake_result

    ans = await service.query_knowledge(
        tenant_id=tenant_id,
        query="cual es la politica de devoluciones",
        biz_config=biz_config,
        db=fake_session,
    )

    assert "devoluciones aplican dentro de los primeros 5 días" in ans
    assert "Base de conocimiento" in ans
