"""Graph node implementations for LangGraph conversational orchestration.

Nodes:
1. classify_intent — fast deterministic + heuristic classification
2. retrieve_or_plan — targeted knowledge retrieval & plan preparation
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

# Context variable for dynamically passed LLM client instances (e.g. In mocks/tests)
current_custom_llm: contextvars.ContextVar[t.Any | None] = contextvars.ContextVar(
    "current_custom_llm", default=None
)

# Keywords that immediately map to human escalation
ESCALATION_KEYWORDS = (
    "asesor",
    "humano",
    "persona",
    "agente humano",
    "hablar con alguien",
    "queja",
    "reclamo",
    "soporte tecnico",
)

# Keywords indicating Nunca Cierro product inquiries
NUNCA_CIERRO_KEYWORDS = (
    "nunca cierro",
    "nuncacierro",
    "whatsapp",
    "automatizar",
    "chatbot",
    "bot",
    "atencion 24/7",
    "planes",
    "precios",
)


async def classify_intent_node(state: AgentState) -> dict[str, t.Any]:
    """Node 1: Classify user intent from the latest query and business config."""
    query = (state.get("user_query") or "").strip()
    biz_config = state.get("business_config") or {}
    tenant_escalation = biz_config.get("keywords_to_escalate") or []

    # Check for direct human escalation keywords using word-boundary & accent-folding
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

    # Check for Nunca Cierro product inquiries
    if any(k in q_lower for k in NUNCA_CIERRO_KEYWORDS):
        logger.info("Intent classified as 'nunca_cierro' | query={q}", q=query[:60])
        return {
            "intent": "nunca_cierro",
            "intent_confidence": 0.90,
        }

    # Check for technical software development queries
    tech_keywords = ("software", "api", "backend", "fastapi", "nextjs", "arquitectura", "desarrollo")
    if any(k in q_lower for k in tech_keywords):
        logger.info("Intent classified as 'technical_query' | query={q}", q=query[:60])
        return {
            "intent": "technical_query",
            "intent_confidence": 0.85,
        }

    logger.info("Intent classified as 'general' | query={q}", q=query[:60])
    return {
        "intent": "general",
        "intent_confidence": 0.80,
    }


async def retrieve_or_plan_node(state: AgentState) -> dict[str, t.Any]:
    """Node 2: Retrieve targeted knowledge snippets according to classified intent."""
    intent = state.get("intent", "general")
    query = state.get("user_query") or ""
    biz_config = state.get("business_config") or {}
    tenant_id = state.get("tenant_id") or "default_tenant"
    snippets: list[str] = []

    # If asking about Nunca Cierro, inject high-level product knowledge
    if intent == "nunca_cierro":
        snippets.append(
            "Nunca Cierro es un servicio B2B de Nicolás Valenzuela que automatiza la atención "
            "y ventas por WhatsApp sin requerir que el negocio tenga personal conectado 24/7."
        )
        snippets.append(
            "Planes principales: Básico (automatización esencial y FAQ), "
            "Profesional (IA completa, catálogo de productos y agendamiento), "
            "y Enterprise (múltiples agentes y conexiones personalizadas)."
        )

    # Dynamic lookup via KnowledgeService for tenant-specific hours, catalog, info, and FAQs
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
    tenant_name = state.get("tenant_name") or "Nunca Cierro"
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
    except Exception as exc:
        logger.warning("LLM generation failed in reason_with_tools_node: {e}", e=exc)

        # ── Rate Limit / Provider Error Circuit Breaker (Graceful Degradation) ──
        # Check verified FAQs first so user gets official answer during 429/outages
        faq = biz_config.get("faq") or []
        fallback_faq_answer = _faq_answer_for(query, faq) if faq else None
        if fallback_faq_answer:
            logger.info("Circuit breaker: served verified FAQ answer during LLM failure")
            return {
                "final_response": fallback_faq_answer,
                "is_handoff_requested": False,
                "metadata": {"fallback_triggered": "rate_limit_faq_fallback"},
            }

        response_text = (
            "En este momento presentamos alta demanda en el servicio. "
            "Por favor intenta de nuevo en unos minutos o déjame tu consulta y un asesor te atenderá."
        )

    clean_response = response_text.strip()
    if not clean_response:
        clean_response = "Disculpa, no pude procesar tu mensaje. ¿Podrías indicarme en qué te puedo ayudar?"

    return {
        "final_response": clean_response,
        "is_handoff_requested": False,
    }


async def prepare_handoff_node(state: AgentState) -> dict[str, t.Any]:
    """Node 4: Prepare structured escalation response and flag for human handoff."""
    biz_config = state.get("business_config") or {}
    fallback = biz_config.get("fallback_message") or (
        "Un asesor humano te atenderá en breve. "
        "Por favor espera mientras te conectamos."
    )

    reason = state.get("handoff_reason") or "keyword_escalation"
    logger.info("Human handoff prepared | reason={reason}", reason=reason)

    return {
        "final_response": fallback,
        "is_handoff_requested": True,
        "handoff_reason": reason,
    }
