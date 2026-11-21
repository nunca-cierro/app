"""Business info tool — queries and verifies tenant-specific knowledge dynamically."""

from __future__ import annotations

import typing as t
from pydantic import BaseModel, Field

from app.modules.knowledge.service import knowledge_service
from app.modules.tools.registry import ToolContext, tool_registry


class ConsultBusinessInfoArgs(BaseModel):
    """Parámetros para consultar información verificada del negocio o tenant."""

    query: str = Field(
        ...,
        description="Pregunta concreta sobre el negocio: horarios, servicios, precios, ubicación, políticas, contacto o preguntas frecuentes.",
    )
    category: t.Optional[str] = Field(
        default=None,
        description="Categoría opcional para filtrar: 'hours', 'services', 'pricing', 'faq', 'info'.",
    )


@tool_registry.register(
    name="consult_business_info",
    description="Consulta y verifica la información oficial del negocio actual (horarios, servicios, precios de catálogo, dirección o preguntas frecuentes). Úsalo siempre que el cliente haga una consulta operativa o comercial.",
    args_schema=ConsultBusinessInfoArgs,
)
async def consult_business_info(
    args: ConsultBusinessInfoArgs,
    *,
    context: ToolContext,
) -> str:
    """Execute dynamic tenant knowledge lookup."""
    return await knowledge_service.query_knowledge(
        tenant_id=context.tenant_id,
        query=args.query,
        category=args.category,
        biz_config=context.business_config,
    )
