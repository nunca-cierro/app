"""Unit tests for ToolRegistry and Pydantic function calling tools."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, patch
import pytest

from app.modules.tools.registry import ToolContext, tool_registry
from app.modules.tools.business_tool import consult_business_info, ConsultBusinessInfoArgs
from app.modules.tools.nunca_cierro_tool import consult_nunca_cierro, ConsultNuncaCierroArgs
from app.modules.tools.handoff_tool import escalate_to_human, EscalateToHumanArgs


@pytest.fixture
def sample_context() -> ToolContext:
    return ToolContext(
        tenant_id="tenant-123",
        conversation_id="conv-456",
        platform="whatsapp",
        external_user_id="573001234567",
        tenant_name="Restaurante La Fontana",
        business_config={
            "business_info": {
                "name": "Restaurante La Fontana",
                "address": "Calle 10 # 40-20, Medellín",
                "phone": "+57 300 123 4567",
            },
            "hours": {
                "lunes a sabado": "12:00 PM - 10:00 PM",
                "domingos": "12:00 PM - 6:00 PM",
            },
            "products_or_services": [
                {"name": "Pasta Carbonara", "price": "$38.000", "description": "Con guanciale y pecorino"},
                {"name": "Pizza Margarita", "price": "$32.000", "description": "Mozzarella y albahaca"},
            ],
            "faq": [
                {"question": "¿Tienen parqueadero?", "answer": "Sí, contamos con parqueadero gratuito."},
            ],
        },
    )


@pytest.mark.asyncio
async def test_tool_registry_openai_specs() -> None:
    """ToolRegistry must produce valid OpenAI function calling specifications."""
    specs = tool_registry.get_all_openai_specs()
    assert len(specs) >= 3

    tool_names = [s["function"]["name"] for s in specs]
    assert "consult_business_info" in tool_names
    assert "consult_nunca_cierro" in tool_names
    assert "escalate_to_human" in tool_names

    # Check structure
    for spec in specs:
        assert spec["type"] == "function"
        assert "name" in spec["function"]
        assert "description" in spec["function"]
        assert "parameters" in spec["function"]


@pytest.mark.asyncio
async def test_consult_business_info_tool(sample_context: ToolContext) -> None:
    """consult_business_info should return verified tenant data."""
    # Hours query
    res_hours = await consult_business_info(
        ConsultBusinessInfoArgs(query="¿Cuál es el horario de atención?", category="hours"),
        context=sample_context,
    )
    assert "12:00 PM" in res_hours
    assert "domingos" in res_hours

    # Menu query
    res_menu = await consult_business_info(
        ConsultBusinessInfoArgs(query="¿Cuánto vale la pasta carbonara?"),
        context=sample_context,
    )
    assert "Pasta Carbonara" in res_menu
    assert "$38.000" in res_menu

    # Address query
    res_info = await consult_business_info(
        ConsultBusinessInfoArgs(query="¿Dónde están ubicados?"),
        context=sample_context,
    )
    assert "Calle 10" in res_info


@pytest.mark.asyncio
async def test_consult_nunca_cierro_tool(sample_context: ToolContext) -> None:
    """consult_nunca_cierro should return B2B product and pricing knowledge."""
    res_planes = await consult_nunca_cierro(
        ConsultNuncaCierroArgs(topic="planes"),
        context=sample_context,
    )
    assert "Plan Básico" in res_planes
    assert "Plan Profesional" in res_planes

    res_precios = await consult_nunca_cierro(
        ConsultNuncaCierroArgs(topic="precios"),
        context=sample_context,
    )
    assert "tarifas mensuales" in res_precios


@pytest.mark.asyncio
async def test_escalate_to_human_tool(sample_context: ToolContext) -> None:
    """escalate_to_human should flag handoff and return courtesy explanation."""
    with patch("app.modules.tools.handoff_tool.telegram_client.send_message", new_callable=AsyncMock) as mock_tg:
        res = await escalate_to_human(
            EscalateToHumanArgs(
                reason="interes_comercial",
                summary="Cliente interesado en contratar plan para 3 sedes",
                client_name_or_phone="Carlos Gómez",
            ),
            context=sample_context,
        )

        assert sample_context.handoff_requested is True
        assert sample_context.handoff_reason == "interes_comercial"
        assert "un asesor revisará" in res.lower()


@pytest.mark.asyncio
async def test_tool_registry_execute_with_json_string(sample_context: ToolContext) -> None:
    """tool_registry.execute should accept JSON string arguments and validate via Pydantic."""
    json_args = json.dumps({"query": "horario"})
    result = await tool_registry.execute("consult_business_info", json_args, sample_context)
    assert "Horarios de atención" in result

    # Invalid tool name
    bad_tool_res = await tool_registry.execute("non_existent_tool", "{}", sample_context)
    assert "no está registrada" in bad_tool_res
