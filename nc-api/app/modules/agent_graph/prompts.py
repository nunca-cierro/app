"""Modular prompts for the conversational agent graph.

Follows AGENTS.md guidelines:
- Identity: Dynamic per-tenant assistant (e.g. for any client business).
- Format: 1-3 line paragraphs, no heavy markdown headers/tables, maximum one question per turn.
- Non-monolithic: targeted context injected on-demand strictly from tenant database records.
"""

from __future__ import annotations

import typing as t

from app.modules.agents.utils import universal_format_block


def format_system_prompt(
    tenant_name: str | None = None,
    business_text: str | None = None,
    knowledge_snippets: list[str] | None = None,
) -> str:
    """Build a concise, non-monolithic system prompt tailored to the active tenant."""
    name = tenant_name or "este negocio"
    parts: list[str] = [
        f"Eres el asistente de atención y ventas de {name}.\n"
        "Actúas de forma natural, cercana, directa y profesional.\n"
        "Tu objetivo es entender el motivo de contacto, resolver dudas de forma precisa y orientar al cliente usando únicamente la información verificada del negocio.",
        "Reglas estrictas de formato:\n"
        "1. Respuestas breves: párrafos de 1 a 3 líneas.\n"
        "2. Cero Markdown pesado: no uses encabezados (#, ##), no uses tablas ni listas extensas con viñetas.\n"
        "3. Máximo una sola pregunta clara por mensaje para avanzar la conversación sin abrumar.\n"
        "4. Si el usuario muestra interés comercial directo, pide cotización formal o solicita hablar con un humano, indícale amablemente que un asesor revisará los detalles y se pondrá en contacto pronto.",
    ]

    if business_text:
        parts.append(f"Instrucciones y contexto del negocio:\n{business_text.strip()}")

    if knowledge_snippets:
        snippets_text = "\n".join(f"- {s}" for s in knowledge_snippets)
        parts.append(f"Información relevante para responder:\n{snippets_text}")

    parts.append(universal_format_block())

    return "\n\n".join(parts)
