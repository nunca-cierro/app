"""LangGraph StateGraph definition and compilation for conversational orchestration."""

from __future__ import annotations

import typing as t
from loguru import logger
from langgraph.graph import StateGraph, START, END

from app.modules.agent_graph.checkpointer import get_default_checkpointer
from app.modules.agent_graph.nodes import (
    classify_intent_node,
    current_custom_llm,
    retrieve_or_plan_node,
    reason_with_tools_node,
    prepare_handoff_node,
)
from app.modules.agent_graph.state import AgentState


def route_after_classification(state: AgentState) -> str:
    """Route to handoff if intent is escalation, otherwise retrieve and reason."""
    intent = state.get("intent", "general")
    if intent == "escalation":
        return "prepare_handoff"
    return "retrieve_or_plan"


def route_after_reasoning(state: AgentState) -> str:
    """Route to handoff if tools/LLM requested escalation, otherwise end turn."""
    if state.get("is_handoff_requested"):
        return "prepare_handoff"
    return END


def build_agent_graph() -> StateGraph:
    """Construct the StateGraph defining the conversational agent topology."""
    builder = StateGraph(AgentState)

    # 1. Register nodes
    builder.add_node("classify_intent", classify_intent_node)
    builder.add_node("retrieve_or_plan", retrieve_or_plan_node)
    builder.add_node("reason_with_tools", reason_with_tools_node)
    builder.add_node("prepare_handoff", prepare_handoff_node)

    # 2. Wire edges
    builder.add_edge(START, "classify_intent")
    builder.add_conditional_edges(
        "classify_intent",
        route_after_classification,
        {
            "prepare_handoff": "prepare_handoff",
            "retrieve_or_plan": "retrieve_or_plan",
        },
    )
    builder.add_edge("retrieve_or_plan", "reason_with_tools")
    builder.add_conditional_edges(
        "reason_with_tools",
        route_after_reasoning,
        {
            "prepare_handoff": "prepare_handoff",
            END: END,
        },
    )
    builder.add_edge("prepare_handoff", END)

    return builder


_compiled_graph = None


def get_compiled_graph():
    """Return the cached compiled StateGraph with in-memory checkpointer."""
    global _compiled_graph
    if _compiled_graph is None:
        builder = build_agent_graph()
        checkpointer = get_default_checkpointer()
        _compiled_graph = builder.compile(checkpointer=checkpointer)
        logger.info("Compiled LangGraph conversational StateGraph with checkpointer")
    return _compiled_graph


async def run_agent_graph(
    state: AgentState,
    *,
    custom_llm: t.Any | None = None,
    thread_id: str | None = None,
) -> AgentState:
    """Execute the compiled StateGraph for an incoming turn."""
    graph = get_compiled_graph()

    tid = (
        thread_id
        or state.get("conversation_id")
        or state.get("external_user_id")
        or "default_thread"
    )
    config = {
        "configurable": {
            "thread_id": str(tid),
        }
    }

    # Bind custom_llm safely to the context variable for this async call
    token = current_custom_llm.set(custom_llm)
    try:
        result = await graph.ainvoke(state, config=config)
    finally:
        current_custom_llm.reset(token)

    return result
