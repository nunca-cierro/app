"""Agent state definition for LangGraph conversational orchestration."""

from __future__ import annotations

import typing as t


class AgentState(t.TypedDict, total=False):
    """Conversational state propagated through the agent StateGraph nodes."""

    # ── Context identifiers ──────────────────────────────────────────────────
    tenant_id: str
    conversation_id: str
    connection_id: str
    external_user_id: str
    platform: str

    # ── Message stream & dialogue context ────────────────────────────────────
    user_query: str
    conversation_history: list[dict[str, str]]
    summary: str | None

    # ── Business & model configurations ─────────────────────────────────────
    business_config: dict[str, t.Any]
    tenant_name: str
    model: str | None
    provider: str | None
    temperature: float | None
    max_tokens: int | None
    system_prompt_override: str | None

    # ── Routing & Intent Classification ─────────────────────────────────────
    # Intents: "general", "nunca_cierro", "technical_query", "escalation", "lead"
    intent: str
    intent_confidence: float
    retrieved_knowledge: list[str]

    # ── Execution outputs ────────────────────────────────────────────────────
    final_response: str
    is_handoff_requested: bool
    handoff_reason: str | None
    metadata: dict[str, t.Any]
