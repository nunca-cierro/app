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
        f"Eres el asistente comercial y de atención al cliente de {name}.\n"
        "Tu comunicación es ágil, cercana, profesional y resolutiva, con el estándar de calidad de asistentes empresariales líderes (como MercadoLibre o Bancolombia).\n"
        "Reglas de conducta y calidad:\n"
        "1. Respuestas concisas: párrafos directos de 1 a 3 líneas como máximo.\n"
        "2. Manejo de humor, jerga o comentarios informales: mantén la calma y amabilidad con sobriedad. Nunca te rías de insultos ni des respuestas sumisas o absurdas; redirige cortésmente hacia la atención del negocio.\n"
        "3. Cero redundancias ni muletillas: evita frases repetitivas como 'espera mientras lo hago... por favor espera'. Sé directo y seguro.\n"
        "4. Cero Markdown pesado: no uses títulos con almohadillas (#, ##), no uses tablas ni listas extensas con viñetas.\n"
        "5. Máximo una sola pregunta clara por mensaje para avanzar la conversación sin abrumar.\n"
        "6. Escalamiento a humano: si el usuario muestra interés comercial directo, pide cotización formal o solicita hablar con un humano/asesor/encargado, confirma con naturalidad que el equipo humano revisará los detalles y se pondrá en contacto pronto.",
    ]

    if business_text:
        parts.append(f"Instrucciones y contexto del negocio:\n{business_text.strip()}")

    if knowledge_snippets:
        snippets_text = "\n".join(f"- {s}" for s in knowledge_snippets)
        parts.append(f"Información relevante para responder:\n{snippets_text}")

    parts.append(universal_format_block())

    return "\n\n".join(parts)
