"""Dynamic multi-tenant knowledge retrieval service.

Provides factual, isolated, per-tenant knowledge lookups for hours, services,
catalog, pricing, policies, and FAQs without monolithic prompt dumping.
"""

from __future__ import annotations

import typing as t
from loguru import logger

from app.modules.agents.utils import _significant_words, _fold_accents


class KnowledgeService:
    """Service to query structured and semantic knowledge for any tenant."""

    async def query_knowledge(
        self,
        tenant_id: str,
        query: str,
        category: str | None = None,
        biz_config: dict[str, t.Any] | None = None,
    ) -> str:
        """Retrieve factual, targeted knowledge for a tenant based on user query.

        Args:
            tenant_id: Unique tenant identifier for tenant isolation.
            query: The user query or topic being investigated.
            category: Optional domain filter ("hours", "services", "pricing", "faq", "info").
            biz_config: Business configuration dict holding structured tenant data.

        Returns:
            Formatted, concise factual knowledge string.
        """
        config = biz_config or {}
        cat_lower = (category or "").lower().strip()
        query_folded = _fold_accents(query)
        q_words = _significant_words(query)

        results: list[str] = []

        # ── 1. Business Info (name, address, phone, email, website) ──────────
        info = config.get("business_info") or {}
        if cat_lower in ("info", "general", "") or any(
            w in query_folded for w in ("donde", "ubicacion", "direccion", "telefono", "contacto", "web")
        ):
            info_parts: list[str] = []
            if info.get("name"):
                info_parts.append(f"Nombre: {info['name']}")
            if info.get("address"):
                info_parts.append(f"Dirección: {info['address']}")
            if info.get("phone"):
                info_parts.append(f"Teléfono: {info['phone']}")
            if info.get("email"):
                info_parts.append(f"Email: {info['email']}")
            if info.get("website"):
                info_parts.append(f"Sitio web: {info['website']}")
            if info.get("description"):
                info_parts.append(f"Descripción: {info['description']}")
            if info_parts:
                results.append("Información de contacto y ubicación:\n" + "\n".join(info_parts))

        # ── 2. Hours ─────────────────────────────────────────────────────────
        hours = config.get("hours") or {}
        if cat_lower in ("hours", "horarios", "") or any(
            w in query_folded for w in ("hora", "horario", "abren", "cierran", "abierto", "domingo", "sabado", "festivo")
        ):
            if hours:
                hour_lines = [f"• {day}: {time}" for day, time in hours.items()]
                results.append("Horarios de atención:\n" + "\n".join(hour_lines))

        # ── 3. Products / Services / Pricing ──────────────────────────────────
        items = config.get("products_or_services") or []
        if cat_lower in ("services", "pricing", "productos", "servicios", "precios", "") or any(
            w in query_folded for w in ("precio", "costo", "vale", "cuanto", "servicio", "producto", "carta", "menu")
        ):
            matching_items: list[str] = []
            for item in items:
                if not isinstance(item, dict):
                    continue
                name = item.get("name", "Servicio")
                price = item.get("price")
                desc = item.get("description", "")
                cat = item.get("category", "")

                # Score relevance if query words are present
                item_text = f"{name} {desc} {cat}"
                item_words = _significant_words(item_text)
                if not q_words or (q_words & item_words) or cat_lower in ("services", "pricing"):
                    line = f"• {name}"
                    if price:
                        line += f": {price}"
                    if desc:
                        line += f" ({desc})"
                    matching_items.append(line)

            if matching_items:
                results.append("Servicios y precios relevantes:\n" + "\n".join(matching_items[:8]))

        # ── 4. Frequently Asked Questions (FAQs) ─────────────────────────────
        faqs = config.get("faq") or []
        if faqs:
            matching_faqs: list[str] = []
            for f in faqs:
                if not isinstance(f, dict):
                    continue
                question = str(f.get("question") or f.get("q", "")).strip()
                answer = str(f.get("answer") or f.get("a", "")).strip()
                if not question or not answer:
                    continue

                faq_words = _significant_words(question)
                if q_words and faq_words and (q_words & faq_words):
                    matching_faqs.append(f"Pregunta: {question}\nRespuesta oficial: {answer}")

            if matching_faqs:
                results.append("Preguntas frecuentes oficiales:\n" + "\n\n".join(matching_faqs[:3]))

        if not results:
            logger.debug(
                "No specific knowledge matched query | tenant={tid} | query={q}",
                tid=tenant_id,
                q=query[:60],
            )
            return "No se encontró información específica registrada para esta consulta en el negocio."

        return "\n\n".join(results)


knowledge_service = KnowledgeService()
