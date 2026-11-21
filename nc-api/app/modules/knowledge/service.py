"""Dynamic multi-tenant knowledge retrieval service.

Provides factual, isolated, per-tenant knowledge lookups for hours, services,
catalog, pricing, policies, and FAQs, plus Markdown-aware semantic chunk search.
"""

from __future__ import annotations

import typing as t
import uuid
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.agents.utils import _significant_words, _fold_accents
from app.modules.knowledge.chunker import MarkdownSemanticChunker
from app.modules.knowledge.models import KnowledgeDocument, KnowledgeChunk


class KnowledgeService:
    """Service to query structured and semantic knowledge for any tenant."""

    def __init__(self) -> None:
        self.chunker = MarkdownSemanticChunker()

    async def create_document(
        self,
        tenant_id: str | uuid.UUID,
        title: str,
        source_type: str,
        raw_markdown: str,
        db: AsyncSession,
        source_url: str | None = None,
    ) -> KnowledgeDocument:
        """Parse, store, and chunk a Markdown knowledge document for a tenant."""
        t_uuid = uuid.UUID(str(tenant_id)) if isinstance(tenant_id, str) else tenant_id
        chunks_data = self.chunker.chunk(raw_markdown, document_title=title)

        doc = KnowledgeDocument(
            tenant_id=t_uuid,
            title=title,
            source_type=source_type,
            source_url=source_url,
            raw_markdown=raw_markdown,
            status="indexed",
        )
        db.add(doc)
        await db.flush()

        for c in chunks_data:
            chunk_record = KnowledgeChunk(
                document_id=doc.id,
                tenant_id=t_uuid,
                breadcrumb=c.breadcrumb,
                content=c.content,
                chunk_index=c.chunk_index,
            )
            db.add(chunk_record)

        await db.commit()
        await db.refresh(doc)
        logger.info(
            "Indexed knowledge document | tenant={tid} | title={title} | chunks={count}",
            tid=t_uuid,
            title=title,
            count=len(chunks_data),
        )
        return doc

    async def search_chunks(
        self,
        tenant_id: str | uuid.UUID,
        query: str,
        db: AsyncSession,
        top_k: int = 3,
    ) -> list[str]:
        """Retrieve the most relevant semantic chunks for a query within a tenant."""
        t_uuid = uuid.UUID(str(tenant_id)) if isinstance(tenant_id, str) else tenant_id
        q_words = _significant_words(query)
        if not q_words:
            return []

        stmt = select(KnowledgeChunk).where(KnowledgeChunk.tenant_id == t_uuid)
        result = await db.execute(stmt)
        chunks = result.scalars().all()

        scored: list[tuple[float, str]] = []
        for ch in chunks:
            text = f"{ch.breadcrumb} {ch.content}"
            ch_words = _significant_words(text)
            overlap = len(q_words & ch_words)
            if overlap > 0:
                score = overlap / len(q_words)
                scored.append((score, ch.content))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [c for _, c in scored[:top_k]]

    async def query_knowledge(
        self,
        tenant_id: str,
        query: str,
        category: str | None = None,
        biz_config: dict[str, t.Any] | None = None,
        db: AsyncSession | None = None,
    ) -> str:
        """Retrieve factual, targeted knowledge for a tenant based on user query.

        Combines structured business profile data with indexed semantic chunks.
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

        # ── 5. Indexed Document Chunks (RAG) ─────────────────────────────────
        if db is not None:
            try:
                matched_chunks = await self.search_chunks(tenant_id, query, db, top_k=2)
                if matched_chunks:
                    results.append("Base de conocimiento (documentos indexados):\n" + "\n\n".join(matched_chunks))
            except Exception as e:
                logger.warning("Error searching document chunks | tenant={tid} | err={err}", tid=tenant_id, err=e)

        if not results:
            logger.debug(
                "No specific knowledge matched query | tenant={tid} | query={q}",
                tid=tenant_id,
                q=query[:60],
            )
            return "No se encontró información específica registrada para esta consulta en el negocio."

        return "\n\n".join(results)


knowledge_service = KnowledgeService()
