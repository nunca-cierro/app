"""Unit tests for KnowledgeService multi-tenant dynamic knowledge retrieval."""

from __future__ import annotations

import pytest
from app.modules.knowledge.service import knowledge_service


@pytest.mark.asyncio
async def test_knowledge_service_hours_and_location() -> None:
    """KnowledgeService formats hours and business location when queried."""
    config = {
        "business_info": {
            "name": "Barbería Classic Cut",
            "address": "Carrera 43A # 1-50, Envigado",
            "phone": "+57 311 000 1122",
        },
        "hours": {
            "lunes a viernes": "9:00 AM - 8:00 PM",
            "sabados": "9:00 AM - 7:00 PM",
        },
    }

    result = await knowledge_service.query_knowledge(
        tenant_id="tenant-barber",
        query="¿Dónde queda la barbería y cuál es el horario?",
        biz_config=config,
    )

    assert "Classic Cut" in result
    assert "Carrera 43A" in result
    assert "9:00 AM - 8:00 PM" in result


@pytest.mark.asyncio
async def test_knowledge_service_catalog_and_faq() -> None:
    """KnowledgeService filters catalog items and matching FAQs."""
    config = {
        "products_or_services": [
            {"name": "Corte de cabello", "price": "$25.000", "description": "Incluye lavado y peinado"},
            {"name": "Barba express", "price": "$15.000", "description": "Perfilado con navaja"},
        ],
        "faq": [
            {"question": "¿Se debe agendar cita previa?", "answer": "Atendemos con y sin cita previa."},
        ],
    }

    # Query about price
    res_price = await knowledge_service.query_knowledge(
        tenant_id="tenant-barber",
        query="¿Cuánto vale el corte de cabello?",
        biz_config=config,
    )
    assert "Corte de cabello" in res_price
    assert "$25.000" in res_price

    # Query about appointment
    res_faq = await knowledge_service.query_knowledge(
        tenant_id="tenant-barber",
        query="¿Tienen cita previa?",
        biz_config=config,
    )
    assert "Atendemos con y sin cita previa" in res_faq


@pytest.mark.asyncio
async def test_knowledge_service_no_match() -> None:
    """Empty or unmatched configuration returns safe fallback string."""
    result = await knowledge_service.query_knowledge(
        tenant_id="empty-tenant",
        query="¿Tienen envíos a Marte?",
        biz_config={},
    )
    assert "No se encontró información específica" in result
