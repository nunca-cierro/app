"""Unit tests for LangGraph conversational orchestration (modules/agent_graph)."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock
import pytest

from app.modules.agent_graph.graph import (
    build_agent_graph,
    get_compiled_graph,
    route_after_classification,
    route_after_reasoning,
    run_agent_graph,
)
from app.modules.agent_graph.nodes import (
    classify_intent_node,
    prepare_handoff_node,
    reason_with_tools_node,
    retrieve_or_plan_node,
)
from app.modules.agent_graph.prompts import format_system_prompt
from app.modules.agent_graph.checkpointer import persist_conversation_checkpoint
from app.modules.conversations.models import Conversation


@pytest.mark.asyncio
async def test_classify_intent_escalation() -> None:
    """Escalation keywords should trigger 'escalation' intent."""
    state = {
        "user_query": "Hola, necesito hablar con un asesor humano por favor",
        "business_config": {"keywords_to_escalate": ["urgente"]},
    }
    result = await classify_intent_node(state)
    assert result["intent"] == "escalation"
    assert result.get("handoff_reason") == "keyword_escalation"

    # Custom tenant keyword
    state_custom = {
        "user_query": "Esto es urgente",
        "business_config": {"keywords_to_escalate": ["urgente"]},
    }
    result_custom = await classify_intent_node(state_custom)
    assert result_custom["intent"] == "escalation"


@pytest.mark.asyncio
async def test_classify_intent_inquiry() -> None:
    """Queries about pricing, services, or catalog should classify as 'inquiry'."""
    state = {
        "user_query": "¿Cuáles son los planes y precios disponibles?",
    }
    result = await classify_intent_node(state)
    assert result["intent"] == "inquiry"


@pytest.mark.asyncio
async def test_classify_intent_general() -> None:
    """Everyday messages should classify as 'general'."""
    state = {
        "user_query": "Hola buenas tardes, ¿cómo estás?",
    }
    result = await classify_intent_node(state)
    assert result["intent"] == "general"


@pytest.mark.asyncio
async def test_retrieve_or_plan_node_injects_faq() -> None:
    """retrieve_or_plan should inject relevant FAQ answers from business config."""
    state = {
        "intent": "inquiry",
        "user_query": "¿Tienen soporte los domingos?",
        "business_config": {
            "faq": [
                {"question": "¿Cuál es el horario de soporte?", "answer": "Atendemos de lunes a viernes."},
                {"question": "¿Cómo pagar?", "answer": "Vía transferencia o QR."},
            ]
        },
    }
    result = await retrieve_or_plan_node(state)
    snippets = result.get("retrieved_knowledge") or []
    assert any("horario de soporte" in s for s in snippets)


@pytest.mark.asyncio
async def test_reason_with_tools_node_generates_response() -> None:
    """reason_with_tools should invoke LLM and return structured final_response."""
    mock_llm = AsyncMock()
    mock_llm.generate = AsyncMock(return_value="Respuesta corta.\n¿Te gustaría más información?")

    state = {
        "user_query": "¿Cómo funciona el servicio?",
        "tenant_name": "Clínica Dental",
        "conversation_history": [],
        "retrieved_knowledge": ["Info relevante"],
    }

    result = await reason_with_tools_node(state, custom_llm=mock_llm)
    assert result["final_response"] == "Respuesta corta.\n¿Te gustaría más información?"
    assert result["is_handoff_requested"] is False
    assert mock_llm.generate.called


@pytest.mark.asyncio
async def test_prepare_handoff_node() -> None:
    """prepare_handoff should return fallback message and handoff flag."""
    state = {
        "business_config": {"fallback_message": "Un asesor humano te contactará."},
        "handoff_reason": "keyword_escalation",
    }
    result = await prepare_handoff_node(state)
    assert result["final_response"] == "Un asesor humano te contactará."
    assert result["is_handoff_requested"] is True
    assert result["handoff_reason"] == "keyword_escalation"


def test_routing_functions() -> None:
    """Validate graph conditional routing functions."""
    assert route_after_classification({"intent": "escalation"}) == "prepare_handoff"
    assert route_after_classification({"intent": "general"}) == "retrieve_or_plan"

    assert route_after_reasoning({"is_handoff_requested": True}) == "prepare_handoff"
    assert route_after_reasoning({"is_handoff_requested": False}) == "__end__"


@pytest.mark.asyncio
async def test_run_agent_graph_general_flow() -> None:
    """Full LangGraph execution for general turn should pass through LLM reasoning."""
    mock_llm = AsyncMock()
    mock_llm.generate = AsyncMock(return_value="¡Hola! Con gusto te oriento.")

    state = {
        "user_query": "Hola, buenas tardes",
        "tenant_name": "Agencia ABC",
        "conversation_id": "conv-test-1",
        "external_user_id": "user-test-1",
    }

    res = await run_agent_graph(state, custom_llm=mock_llm)
    assert res["intent"] == "general"
    assert res["final_response"] == "¡Hola! Con gusto te oriento."
    assert res["is_handoff_requested"] is False
    assert mock_llm.generate.called


@pytest.mark.asyncio
async def test_run_agent_graph_escalation_flow() -> None:
    """Full LangGraph execution for escalation should bypass LLM and route to handoff."""
    mock_llm = AsyncMock()
    mock_llm.generate = AsyncMock()

    state = {
        "user_query": "Quiero hablar con una persona de soporte tecnico",
        "tenant_name": "Agencia ABC",
        "conversation_id": "conv-test-2",
        "external_user_id": "user-test-2",
        "business_config": {"fallback_message": "Enseguida te paso con soporte."},
    }

    res = await run_agent_graph(state, custom_llm=mock_llm)
    assert res["intent"] == "escalation"
    assert res["final_response"] == "Enseguida te paso con soporte."
    assert res["is_handoff_requested"] is True
    # LLM must NOT be called on direct escalation
    assert not mock_llm.generate.called


@pytest.mark.asyncio
async def test_persist_conversation_checkpoint() -> None:
    """Checkpoint persistence should update conversation.extra_data safely."""
    mock_session = AsyncMock()
    mock_conv = Conversation(extra_data={})
    mock_session.get = AsyncMock(return_value=mock_conv)

    await persist_conversation_checkpoint(
        mock_session,
        "conv-id-123",
        {"intent": "nunca_cierro", "is_handoff_requested": False, "summary": "User asked about plans"},
    )

    assert mock_conv.extra_data["last_agent_intent"] == "nunca_cierro"
    assert mock_conv.extra_data["is_escalated"] is False
    assert mock_conv.extra_data["conversation_summary"] == "User asked about plans"
    assert mock_session.add.called
