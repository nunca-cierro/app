"""Utility functions for AiAgent — formatting business config into prompt context."""

from __future__ import annotations

from typing import Any


DEFAULT_INSTRUCTIONS = (
    "Eres un asistente de atención al cliente entusiasta y eficiente.\n"
    "- REGLA DE ORO: Responde de forma BREVE y LLAMATIVA. Máximo 2-3 párrafos cortos.\n"
    "- Usa EMOJIS (iconos) para resaltar puntos clave y hacer la lectura amena (ej: ✅, 📍, 💰, 🚀).\n"
    "- Responde SOLO con la información del negocio proporcionada.\n"
    "- Si no sabes algo, no inventes — di amablemente que un asesor humano ayudará.\n"
    "- Haz máximo UNA pregunta por mensaje para no abrumar al cliente.\n"
    "- La venta debe sentirse como una sugerencia natural y útil, no como presión.\n"
    "- Saluda con energía y ofrece ayuda clara."
)


def format_business_config(config: dict[str, Any] | None) -> str:
    """Convert a structured *business_config* dict into readable prompt text.

    The output becomes the system prompt — it includes behaviour instructions
    first, then structured business data (hours, products, FAQ, etc.).
    This replaces the old free-text system prompt approach.
    """
    if not config:
        return ""

    blocks: list[str] = []

    # ── Instructions (behaviour rules) ───────────────────────────────
    instructions = (config.get("instructions") or "").strip()
    if instructions:
        blocks.append(f"=== INSTRUCCIONES ===\n{instructions}")

    # ── Business info ────────────────────────────────────────────────
    info = config.get("business_info") or {}
    info_lines: list[str] = []
    if info.get("name"):
        info_lines.append(f"Nombre del negocio: {info['name']}")
    if info.get("description"):
        info_lines.append(f"Descripción: {info['description']}")
    if info.get("schedule"):
        info_lines.append(f"Horarios: {info['schedule']}")
    if info.get("location"):
        info_lines.append(f"Ubicación: {info['location']}")
    if info.get("phone"):
        info_lines.append(f"Teléfono: {info['phone']}")
    if info.get("website"):
        info_lines.append(f"Sitio web: {info['website']}")
    if info.get("social"):
        info_lines.append(f"Redes sociales: {info['social']}")
    if info_lines:
        blocks.append(
            "=== INFORMACIÓN DEL NEGOCIO ===\n" + "\n".join(info_lines)
        )

    # ── Products / services ──────────────────────────────────────────
    products = config.get("products_services") or []
    if products:
        product_lines: list[str] = []
        for i, p in enumerate(products, 1):
            name = p.get("name", f"Producto {i}")
            price = p.get("price", "")
            duration = p.get("duration", "")
            parts = [name]
            if price:
                parts.append(f"${price}")
            if duration:
                parts.append(f"({duration})")
            product_lines.append(f"  {i}. {' — '.join(parts)}")
        blocks.append(
            "=== PRODUCTOS / SERVICIOS ===\n" + "\n".join(product_lines)
        )

    # ── FAQ ──────────────────────────────────────────────────────────
    faq = config.get("faq") or []
    if faq:
        faq_lines: list[str] = []
        for i, item in enumerate(faq, 1):
            q = item.get("question", "")
            a = item.get("answer", "")
            if q and a:
                faq_lines.append(f"  P{i}: {q}\n  R{i}: {a}")
        if faq_lines:
            blocks.append(
                "=== PREGUNTAS FRECUENTES ===\n" + "\n\n".join(faq_lines)
            )

    # ── Tone ─────────────────────────────────────────────────────────
    tone = config.get("tone", "")
    if tone:
        blocks.append(f"=== TONO DE RESPUESTA ===\n{tone}")

    # ── Escalate keywords ────────────────────────────────────────────
    keywords = config.get("keywords_to_escalate") or []
    if keywords:
        kw_list = ", ".join(k.lower() for k in keywords)
        blocks.append(
            "=== DERIVACIÓN A HUMANO ===\n"
            f"Si el cliente menciona alguna de estas palabras, "
            f"derivalo a un asesor humano: {kw_list}."
        )

    # ── Fallback ─────────────────────────────────────────────────────
    fallback = config.get("fallback_message", "")
    if fallback:
        blocks.append(
            "=== MENSAJE DE RESPUESTA NO DISPONIBLE ===\n" f"{fallback}"
        )

    return "\n\n".join(blocks)
