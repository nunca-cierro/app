"""Human escalation tool — structured handoff and Telegram alert dispatch."""

from __future__ import annotations

import typing as t
from loguru import logger
from pydantic import BaseModel, Field

from app.core.config import settings
from app.modules.telegram.client import TelegramClient
from app.modules.tools.registry import ToolContext, tool_registry

telegram_client = TelegramClient()


class EscalateToHumanArgs(BaseModel):
    """Parámetros para derivar una conversación con un asesor humano y notificarlo."""

    reason: str = Field(
        ...,
        description="Motivo del escalamiento: 'interes_comercial', 'solicitud_humano', 'queja', 'caso_fuera_de_alcance' o 'soporte_complejo'.",
    )
    summary: str = Field(
        ...,
        description="Resumen breve (1 a 2 líneas) de lo que solicita o necesita el cliente para que el asesor entre en contexto rápido.",
    )
    client_name_or_phone: t.Optional[str] = Field(
        default=None,
        description="Nombre o número de teléfono del cliente si está disponible en la conversación.",
    )


@tool_registry.register(
    name="escalate_to_human",
    description="Deriva la conversación a un asesor humano cuando el usuario lo solicita explícitamente, cuando hay interés comercial real en cotizaciones/compras, o ante quejas/casos complejos.",
    args_schema=EscalateToHumanArgs,
)
async def escalate_to_human(
    args: EscalateToHumanArgs,
    *,
    context: ToolContext,
) -> str:
    """Flag conversation for human handoff and optionally notify via Telegram."""
    context.handoff_requested = True
    context.handoff_reason = args.reason
    context.metadata["handoff_summary"] = args.summary

    logger.info(
        "Escalation requested via tool | reason={reason} | client={client} | conv={cid}",
        reason=args.reason,
        client=args.client_name_or_phone or context.external_user_id,
        cid=context.conversation_id,
    )

    # Optional structured notification to Telegram if credentials are configured
    bot_token = getattr(settings, "telegram_handoff_bot_token", "") or ""
    chat_id = getattr(settings, "telegram_handoff_chat_id", "") or ""

    # Check if tenant has telegram notification settings in extra_data
    tenant_telegram = context.business_config.get("telegram_notifications") or {}
    if tenant_telegram.get("bot_token") and tenant_telegram.get("chat_id"):
        bot_token = tenant_telegram["bot_token"]
        chat_id = tenant_telegram["chat_id"]

    if bot_token and chat_id:
        client_id = args.client_name_or_phone or context.external_user_id
        notification_text = (
            "🚨 *NUEVO ESCALAMIENTO A HUMANO*\n\n"
            f"• *Negocio:* {context.tenant_name}\n"
            f"• *Cliente:* `{client_id}`\n"
            f"• *Canal:* {context.platform}\n"
            f"• *Motivo:* {args.reason}\n"
            f"• *Resumen:* {args.summary}\n\n"
            "_El bot ha pausado sus respuestas automáticas para este chat._"
        )
        try:
            await telegram_client.send_message(
                bot_token=bot_token,
                chat_id=chat_id,
                text=notification_text,
                parse_mode="Markdown",
            )
            logger.info("Telegram escalation notification sent successfully")
        except Exception as exc:
            logger.warning("Failed to dispatch Telegram escalation alert: {e}", e=exc)

    return (
        f"Se ha registrado la solicitud de escalamiento por '{args.reason}'. "
        "Informa al cliente amablemente que un asesor revisará los detalles y se contactará pronto."
    )
