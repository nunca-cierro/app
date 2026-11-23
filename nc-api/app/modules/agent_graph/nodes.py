"""Graph node implementations for LangGraph conversational orchestration.

Domain-agnostic nodes:
1. classify_intent — fast deterministic & heuristic classification (escalation, inquiry, general)
2. retrieve_or_plan — targeted knowledge retrieval from database chunks and business config
3. reason_with_tools — modular LLM generation adhering to chat format rules
4. prepare_handoff — human escalation packaging
"""

from __future__ import annotations

import contextvars
import typing as t
from loguru import logger

from app.modules.agent_graph.prompts import format_system_prompt
from app.modules.agent_graph.state import AgentState
from app.modules.agents.utils import (
    _faq_answer_for,
    _matches_escalation_keyword,
    _significant_words,
    format_business_config,
)
from app.modules.integrations.llm.provider import llm_client
from app.modules.knowledge.service import knowledge_service

# Context variable for dynamically passed LLM client instances (e.g. in mocks/tests)
current_custom_llm: contextvars.ContextVar[t.Any | None] = contextvars.ContextVar(
    "current_custom_llm", default=None
)

# Universal keywords that map to human escalation
ESCALATION_KEYWORDS = (
    "asesor",
    "humano",
    "persona",
    "agente humano",
    "hablar con alguien",
    "queja",
    "reclamo",
    "soporte tecnico",
    "hombre a cargo",
    "encargado",
    "dueno",
    "dueño",
    "jefe",
    "alguien real",
)

# Common commercial & operational query keywords across all business types
INQUIRY_KEYWORDS = (
    "precio",
    "precios",
    "costo",
    "costos",
    "cuanto vale",
    "cuanto cuesta",
    "tarifa",
    "tarifas",
    "servicio",
    "servicios",
    "producto",
    "productos",
    "catalogo",
    "menu",
    "horario",
    "horarios",
    "abren",
    "cierran",
    "ubicacion",
    "direccion",
    "donde estan",
    "telefono",
    "cita",
    "citas",
    "agendar",
    "planes",
    "promocion",
    "garantia",
)


async def classify_intent_node(state: AgentState) -> dict[str, t.Any]:
    """Node 1: Classify user intent generically from the latest query and business config."""
    query = (state.get("user_query") or "").strip()
    biz_config = state.get("business_config") or {}
    tenant_escalation = biz_config.get("keywords_to_escalate") or []

    # 1. Check for human escalation keywords (universal + tenant-custom)
    all_escalation_keywords = list(ESCALATION_KEYWORDS) + [
        k for k in tenant_escalation if isinstance(k, str)
    ]
    if any(_matches_escalation_keyword(query, kw) for kw in all_escalation_keywords):
        logger.info("Intent classified as 'escalation' | query={q}", q=query[:60])
        return {
            "intent": "escalation",
            "intent_confidence": 0.95,
            "handoff_reason": "keyword_escalation",
        }

    q_lower = query.lower()

    # 2. Check for commercial or operational inquiries about the business
    if any(k in q_lower for k in INQUIRY_KEYWORDS):
        logger.info("Intent classified as 'inquiry' | query={q}", q=query[:60])
        return {
            "intent": "inquiry",
            "intent_confidence": 0.90,
        }

    # 3. Default to general conversation / greeting
    logger.info("Intent classified as 'general' | query={q}", q=query[:60])
    return {
        "intent": "general",
        "intent_confidence": 0.80,
    }


async def retrieve_or_plan_node(state: AgentState) -> dict[str, t.Any]:
    """Node 2: Retrieve targeted knowledge strictly from tenant database chunks and config."""
    query = state.get("user_query") or ""
    biz_config = state.get("business_config") or {}
    tenant_id = state.get("tenant_id") or "default_tenant"
    snippets: list[str] = []

    # Dynamic lookup via KnowledgeService: pulls tenant-specific hours, catalog,
    # and indexed Markdown document chunks (zero hardcoded strings).
    knowledge_text = await knowledge_service.query_knowledge(
        tenant_id=tenant_id,
        query=query,
        biz_config=biz_config,
    )
    if knowledge_text and "No se encontró información específica" not in knowledge_text:
        snippets.append(knowledge_text)

    return {
        "retrieved_knowledge": snippets,
    }


async def reason_with_tools_node(
    state: AgentState,
    *,
    custom_llm: t.Any | None = None,
) -> dict[str, t.Any]:
    """Node 3: Generate modular conversational response via LLM without heavy prompts."""
    tenant_name = state.get("tenant_name") or "este negocio"
    biz_config = state.get("business_config") or {}
    biz_text = format_business_config(biz_config) if biz_config else None
    knowledge = state.get("retrieved_knowledge") or []

    override_sys = state.get("system_prompt_override")
    if override_sys:
        system_prompt = override_sys
    else:
        system_prompt = format_system_prompt(
            tenant_name=tenant_name,
            business_text=biz_text,
            knowledge_snippets=knowledge,
        )

    query = state.get("user_query") or ""
    history = state.get("conversation_history") or []
    provider = state.get("provider")
    model = state.get("model")
    temperature = state.get("temperature")
    max_tokens = state.get("max_tokens")

    active_llm = custom_llm or current_custom_llm.get() or llm_client
    node_metadata = dict(state.get("metadata") or {})

    try:
        response_text = await active_llm.generate(
            system_prompt=system_prompt,
            user_message=f"<user_query>\n{query}\n</user_query>",
            conversation_history=history,
            provider=provider,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        if not response_text or not response_text.strip():
            fb = biz_config.get("fallback_message")
            response_text = (
                fb
                if fb
                else "En este momento estamos experimentando alta demanda. En un momento te responderemos."
            )
    except Exception as exc:
        # Anti-429 Circuit Breaker fallback to verified FAQs
        node_metadata["fallback_triggered"] = "rate_limit_faq_fallback"
        logger.warning(
            "reason_with_tools LLM failed, checking FAQ fallback | tenant={tid} | err={err}",
            tid=state.get("tenant_id"),
            err=exc,
        )
        faqs = biz_config.get("faq") or []
        fallback_answer = _faq_answer_for(query, faqs) if faqs else None
        if fallback_answer:
            logger.info("Circuit breaker matched official FAQ fallback")
            response_text = fallback_answer
        else:
            fb = biz_config.get("fallback_message")
            response_text = (
                fb
                if fb
                else "En este momento estamos experimentando alta demanda. En un momento te responderemos."
            )

    return {
        "final_response": response_text,
        "is_handoff_requested": False,
        "metadata": node_metadata,
    }


async def prepare_handoff_node(state: AgentState) -> dict[str, t.Any]:
    """Node 4: Prepare final response when an agent requests human escalation."""
    reason = state.get("handoff_reason") or "unspecified_escalation"
    logger.info("Executing prepare_handoff_node | reason={r}", r=reason)

    biz_config = state.get("business_config") or {}
    fallback_msg = (
        biz_config.get("fallback_message")
        or "Hemos registrado tu solicitud. Un asesor de nuestro equipo se comunicará contigo a la brevedad."
    )

    return {
        "final_response": fallback_msg,
        "is_handoff_requested": True,
        "handoff_reason": reason,
    }
