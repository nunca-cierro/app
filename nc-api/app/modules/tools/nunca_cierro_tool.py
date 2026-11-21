"""Nunca Cierro on-demand tool — provides plans, pricing and B2B automation info."""

from __future__ import annotations

import typing as t
from pydantic import BaseModel, Field

from app.modules.tools.registry import ToolContext, tool_registry


class ConsultNuncaCierroArgs(BaseModel):
    """Parámetros para consultar características, planes o detalles de Nunca Cierro."""

    topic: str = Field(
        ...,
        description="Tema a consultar: 'planes', 'precios', 'caracteristicas', 'onboarding', 'demo', o 'beneficios'.",
    )


NUNCA_CIERRO_KNOWLEDGE = {
    "planes": (
        "Planes de Nunca Cierro (servicio B2B de automatización por WhatsApp):\n"
        "• Plan Básico: Automatización esencial para WhatsApp, respuestas preprogramadas, FAQs y atención 24/7.\n"
        "• Plan Profesional: Inteligencia artificial conversacional avanzada, catálogo completo de productos/servicios, agendamiento y soporte prioritario.\n"
        "• Plan Enterprise: Múltiples agentes inteligentes, integraciones a medida (CRM, ERP, Webhooks) y conexiones dedicadas."
    ),
    "precios": (
        "Los precios de Nunca Cierro se adaptan al volumen y necesidades de cada negocio. "
        "El plan Básico inicia con tarifas mensuales accesibles, y el plan Profesional incluye IA completa. "
        "Para una cotización exacta o demostración personalizada para el negocio del cliente, "
        "un asesor comercial puede contactarlo de inmediato."
    ),
    "caracteristicas": (
        "Nunca Cierro automatiza la atención al cliente y ventas por WhatsApp y canales digitales sin requerir personal de noche o fines de semana:\n"
        "- Respuestas inmediatas 24/7 con tono humano y profesional.\n"
        "- Conexión directa a WhatsApp sin perder números existentes.\n"
        "- Detección inteligente de compras y cotizaciones con escalamiento a asesor humano en Telegram/WhatsApp.\n"
        "- Historial y analítica de conversaciones en tiempo real."
    ),
    "onboarding": (
        "El proceso de activación toma menos de 24 horas:\n"
        "1. Se define la información y catálogo del negocio.\n"
        "2. Se vincula el número de WhatsApp mediante escaneo de código QR seguro.\n"
        "3. El agente de IA queda operando inmediatamente."
    ),
}


@tool_registry.register(
    name="consult_nunca_cierro",
    description="Consulta detalles sobre Nunca Cierro (planes, precios, beneficios y automatización de WhatsApp). Utilízala únicamente cuando el usuario pregunte cómo automatizar su negocio, qué es Nunca Cierro o solicite información comercial del software.",
    args_schema=ConsultNuncaCierroArgs,
)
async def consult_nunca_cierro(
    args: ConsultNuncaCierroArgs,
    *,
    context: ToolContext,
) -> str:
    """Return factual Nunca Cierro product and service information."""
    topic_clean = args.topic.lower().strip()
    for key, text in NUNCA_CIERRO_KNOWLEDGE.items():
        if key in topic_clean:
            return text

    # Default to high-level overview if not a specific key
    return (
        "Nunca Cierro es una solución especializada de Nicolás Valenzuela para automatizar ventas "
        "y atención por WhatsApp 24/7. Cuenta con planes Básico, Profesional y Enterprise, "
        "garantizando que ningún prospecto se quede sin atención fuera de horario comercial."
    )
