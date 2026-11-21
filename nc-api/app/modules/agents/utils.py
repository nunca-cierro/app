"""Utility functions for AiAgent — formatting business config into prompt context and text matching."""

from __future__ import annotations

import re
from typing import Any

# ── Accent folding and text matching helpers ─────────────────────────────────

_ACCENT_FOLD: dict[int, int] = str.maketrans(
    "áéíóúüñÁÉÍÓÚÜÑ",
    "aeiouunAEIOUUN",
)

SPANISH_STOPWORDS: frozenset[str] = frozenset(
    {
        "de", "la", "el", "los", "las", "y", "o", "a", "en", "que",
        "cual", "cuál", "como", "cómo", "donde", "dónde", "cuando", "cuándo",
        "para", "por", "con", "es", "un", "una", "al", "del", "mi", "su",
        "me", "se", "te",
        "esta", "estas", "estan", "estamos", "estoy", "hay",
    }
)

_WORD_RE: re.Pattern[str] = re.compile(r"[a-z0-9]+")


def _fold_accents(text_content: str) -> str:
    """Return text lowercased with Spanish accents folded for matching."""
    return text_content.translate(_ACCENT_FOLD).lower()


def _significant_words(text_content: str) -> set[str]:
    """Accent-folded, punctuation-stripped, stopword-free word token set."""
    return set(_WORD_RE.findall(_fold_accents(text_content))) - SPANISH_STOPWORDS


def _faq_answer_for(user_text: str, faq: list[dict[str, Any]]) -> str | None:
    """Best FAQ answer for user query with significant words scoring."""
    if not faq:
        return None
    user_words = _significant_words(user_text)
    best_answer: str | None = None
    best_score = 0

    for item in faq:
        if not isinstance(item, dict):
            continue
        q = str(item.get("question") or item.get("q", ""))
        a = str(item.get("answer") or item.get("a", ""))
        if not q or not a:
            continue
        q_words = _significant_words(q)
        if not q_words:
            continue
        overlap = len(user_words & q_words)
        required = 1 if len(q_words) == 1 else min(2, (len(q_words) + 1) // 2)
        if overlap >= required and overlap > best_score:
            best_score = overlap
            best_answer = a

    return best_answer


def _matches_escalation_keyword(user_text: str, keyword: str) -> bool:
    """Check if user text triggers an escalation keyword on word boundaries."""
    if not isinstance(keyword, str):
        return False
    folded_user = _fold_accents(user_text)
    kw_words = _significant_words(keyword)
    if kw_words:
        return all(
            re.search(rf"\b{re.escape(w)}\b", folded_user) is not None
            for w in kw_words
        )
    return re.search(
        rf"\b{re.escape(_fold_accents(keyword).strip())}\b", folded_user
    ) is not None


# ── Universal WhatsApp format block ──────────────────────────────────────────

UNIVERSAL_FORMAT_RULES = (
    "Reglas de formato (aplican SOLO si las instrucciones del negocio no indican "
    "lo contrario): escribe como una persona real en WhatsApp; párrafos cortos de "
    "1-3 líneas; nada de markdown (sin **negritas**, sin títulos, sin listas "
    "numeradas ni viñetas); usa saltos de línea simples; responde en el mismo "
    "idioma y registro del usuario; máximo una pregunta por mensaje; sin firmas "
    "formales ni despedidas largas."
)


def universal_format_block() -> str:
    """Return the universal WhatsApp formatting rules as a subordinate prompt block.

    Must be appended at the END of the AI system prompt so per-business
    instructions (business_config) always take precedence over these defaults.
    """
    return UNIVERSAL_FORMAT_RULES


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
    if info.get("address"):
        info_lines.append(f"Dirección: {info['address']}")
    if info.get("phone"):
        info_lines.append(f"Teléfono: {info['phone']}")
    if info.get("email"):
        info_lines.append(f"Email: {info['email']}")
    if info.get("website"):
        info_lines.append(f"Sitio web: {info['website']}")
    if info_lines:
        blocks.append("=== INFORMACIÓN DEL NEGOCIO ===\n" + "\n".join(info_lines))

    # ── Hours ────────────────────────────────────────────────────────
    hours = config.get("hours") or {}
    if hours:
        hour_lines = [f"• {day}: {time}" for day, time in hours.items()]
        blocks.append("=== HORARIOS DE ATENCIÓN ===\n" + "\n".join(hour_lines))

    # ── Products / Services ──────────────────────────────────────────
    items = config.get("products_or_services") or []
    if items:
        item_lines: list[str] = []
        for item in items:
            name = item.get("name", "Producto/Servicio")
            price = item.get("price")
            desc = item.get("description", "")
            cat = item.get("category", "")
            line = f"• {name}"
            if cat:
                line += f" [{cat}]"
            if price:
                line += f": {price}"
            if desc:
                line += f" — {desc}"
            item_lines.append(line)
        blocks.append("=== PRODUCTOS Y SERVICIOS ===\n" + "\n".join(item_lines))

    # ── FAQs ─────────────────────────────────────────────────────────
    faqs = config.get("faq") or []
    if faqs:
        faq_lines: list[str] = []
        for f in faqs:
            q = f.get("question") or f.get("q", "")
            a = f.get("answer") or f.get("a", "")
            if q and a:
                faq_lines.append(f"P: {q}\nR: {a}")
        if faq_lines:
            blocks.append("=== PREGUNTAS FRECUENTES ===\n" + "\n\n".join(faq_lines))

    # ── Escalation keywords & fallback message ───────────────────────
    keywords = config.get("keywords_to_escalate") or []
    fallback = config.get("fallback_message") or ""
    esc_lines: list[str] = []
    if keywords:
        esc_lines.append(f"Palabras clave para derivar a humano: {', '.join(keywords)}")
    if fallback:
        esc_lines.append(f"Mensaje de espera para el cliente: {fallback}")
    if esc_lines:
        blocks.append("=== ESCALACIÓN A HUMANO ===\n" + "\n".join(esc_lines))

    return "\n\n".join(blocks)
