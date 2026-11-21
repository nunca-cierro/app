"""Modular prompts for the conversational agent graph.

Follows AGENTS.md guidelines:
- Identity: Nicolás Valenzuela (nival.is-a.dev) operations assistant or tenant brand assistant.
- Format: 1-3 line paragraphs, no heavy markdown headers/tables, maximum one question per turn.
- Non-monolithic: targeted context injected on-demand based on classified intent.
"""

from __future__ import annotations

import typing as t

from app.modules.agents.utils import universal_format_block

BASE_IDENTITY_PROMPT = """Eres el asistente conversacional de Nicolás Valenzuela (nival.is-a.dev).
Actúas de forma natural, cercana, directa y profesional.
Tu objetivo es entender el motivo de contacto, dar orientaciones claras y sugerir soluciones prácticas en software y automatización.

Reglas estrictas de formato:
1. Respuestas breves: párrafos de 1 a 3 líneas.
2. Cero Markdown pesado: no uses encabezados (#, ##), no uses tablas ni listas extensas con viñetas.
3. Máximo una sola pregunta clara por mensaje para avanzar la conversación sin abrumar.
4. Nunca Cierro es una solución B2B para automatizar ventas y atención por WhatsApp y Web (24/7). Menciona sus capacidades o planes únicamente cuando el usuario pregunte cómo automatizar la atención a clientes, ventas por chat o WhatsApp.
5. Si el usuario muestra interés comercial directo, pide cotización formal o solicita hablar con un humano, indícale amablemente que un asesor revisará los detalles y te pondrá en contacto pronto."""

INTENT_CLASSIFICATION_PROMPT = """Clasifica la intención del usuario a partir de su mensaje y el historial reciente.
Responde únicamente con una de las siguientes etiquetas exactas:
- escalation: El usuario pide hablar con una persona, asesor, humano, o tiene una queja/problema crítico.
- nunca_cierro: El usuario pregunta sobre automatización de WhatsApp, bots de atención/ventas, precios o planes de Nunca Cierro.
- technical_query: Preguntas sobre desarrollo de software, arquitectura, integraciones o servicios de Nicolás Valenzuela.
- general: Saludos, agradecimientos, dudas generales o conversación cotidiana."""


def format_system_prompt(
    tenant_name: str | None = None,
    business_text: str | None = None,
    knowledge_snippets: list[str] | None = None,
) -> str:
    """Build a concise, non-monolithic system prompt tailored to the turn."""
    parts: list[str] = []

    if tenant_name and tenant_name.lower() not in ("nuncacierro", "nival", "nicolas valenzuela"):
        parts.append(
            f"Eres el asistente de atención para {tenant_name}.\n"
            "Atiende de manera amable, cercana y profesional."
        )
    else:
        parts.append(BASE_IDENTITY_PROMPT)

    if business_text:
        parts.append(f"Instrucciones y contexto del negocio:\n{business_text.strip()}")

    if knowledge_snippets:
        snippets_text = "\n".join(f"- {s}" for s in knowledge_snippets)
        parts.append(f"Información relevante para responder:\n{snippets_text}")

    parts.append(universal_format_block())

    return "\n\n".join(parts)
