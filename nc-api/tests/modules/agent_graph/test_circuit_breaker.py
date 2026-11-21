"""Unit tests for Circuit Breaker and Rate Limit (429) graceful degradation."""

from __future__ import annotations

from unittest.mock import AsyncMock
import pytest

from app.modules.agent_graph.graph import run_agent_graph
from app.modules.agent_graph.nodes import reason_with_tools_node


@pytest.mark.asyncio
async def test_circuit_breaker_serves_verified_faq_on_llm_failure() -> None:
    """When LLM throws RateLimitError or fails, verified FAQ is served automatically."""
    mock_llm = AsyncMock()
    # Simulate an OpenAI RateLimitError (HTTP 429)
    mock_llm.generate = AsyncMock(side_effect=RuntimeError("Rate limit reached: 429 Too Many Requests"))

    state = {
        "user_query": "¿Cuál es el horario de atención?",
        "tenant_name": "Clínica Dental",
        "conversation_id": "conv-circuit-1",
        "external_user_id": "573009998877",
        "business_config": {
            "faq": [
                {
                    "question": "¿Cuál es el horario de atención?",
                    "answer": "Atendemos de lunes a viernes de 8:00 AM a 6:00 PM.",
                },
                {
                    "question": "¿Dónde queda la clínica?",
                    "answer": "En la Calle 50 # 20-10.",
                },
            ]
        },
    }

    result = await reason_with_tools_node(state, custom_llm=mock_llm)

    # Must NOT fail — must degrade gracefully to verified FAQ
    assert result["final_response"] == "Atendemos de lunes a viernes de 8:00 AM a 6:00 PM."
    assert result.get("metadata", {}).get("fallback_triggered") == "rate_limit_faq_fallback"
    assert result["is_handoff_requested"] is False


@pytest.mark.asyncio
async def test_circuit_breaker_serves_polite_busy_notice_when_no_faq_matches() -> None:
    """When LLM fails and no FAQ matches, serves polite high-demand notice without crashing."""
    mock_llm = AsyncMock()
    mock_llm.generate = AsyncMock(side_effect=Exception("Connection timeout to provider"))

    state = {
        "user_query": "¿Puedo hacer una pregunta muy compleja sin FAQ?",
        "tenant_name": "Clínica Dental",
        "conversation_id": "conv-circuit-2",
        "external_user_id": "573009998877",
        "business_config": {
            "faq": [],
        },
    }

    result = await reason_with_tools_node(state, custom_llm=mock_llm)

    assert "alta demanda" in result["final_response"].lower()
    assert result["is_handoff_requested"] is False


@pytest.mark.asyncio
async def test_full_graph_graceful_degradation_under_429() -> None:
    """End-to-end StateGraph execution with RateLimitError returns verified FAQ response."""
    mock_llm = AsyncMock()
    mock_llm.generate = AsyncMock(side_effect=RuntimeError("429 RateLimitError"))

    state = {
        "user_query": "¿Tienen parqueadero disponible?",
        "tenant_name": "Restaurante Central",
        "conversation_id": "conv-circuit-3",
        "external_user_id": "573001112233",
        "business_config": {
            "faq": [
                {"question": "¿Tienen parqueadero?", "answer": "Sí, tenemos parqueadero cubierto gratuito."},
            ]
        },
    }

    res = await run_agent_graph(state, custom_llm=mock_llm)
    assert res["final_response"] == "Sí, tenemos parqueadero cubierto gratuito."
    assert res["is_handoff_requested"] is False
