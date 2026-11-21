"""Tests for Markdown-aware semantic chunking."""

from __future__ import annotations

import pytest
from app.modules.knowledge.chunker import MarkdownSemanticChunker


def test_chunk_empty_input():
    chunker = MarkdownSemanticChunker()
    assert chunker.chunk("") == []
    assert chunker.chunk("   \n\n  ") == []


def test_chunk_preserves_hierarchy():
    doc = """
# Odontología Integral

## Ortodoncia
Contamos con brackets metálicos y de zafiro.
El tratamiento incluye controles mensuales.

### Precios y Financiación
La cuota inicial es de $200.000 COP y mensualidades de $80.000 COP.

## Blanqueamiento Dental
Procedimiento LED en una sola sesión de 60 minutos por $300.000 COP.
    """
    chunker = MarkdownSemanticChunker(target_chars=500, max_chars=800)
    chunks = chunker.chunk(doc, document_title="Odontología Integral")

    assert len(chunks) >= 3

    # Check breadcrumb path injection
    chunk_0 = chunks[0]
    assert "[Odontología Integral > Ortodoncia]" in chunk_0.content
    assert "brackets metálicos" in chunk_0.content

    chunk_1 = chunks[1]
    assert "[Odontología Integral > Ortodoncia > Precios y Financiación]" in chunk_1.content
    assert "$200.000 COP" in chunk_1.content

    chunk_2 = chunks[2]
    assert "[Odontología Integral > Blanqueamiento Dental]" in chunk_2.content
    assert "sesión de 60 minutos" in chunk_2.content


def test_chunk_subsplits_large_section_while_keeping_breadcrumb():
    para1 = "Párrafo 1 con información importante sobre la empresa. " * 10
    para2 = "Párrafo 2 con detalles adicionales sobre garantías y soporte. " * 10
    para3 = "Párrafo 3 con términos y condiciones finales. " * 10

    doc = f"""
# Políticas de Garantía

## Condiciones Generales
{para1}

{para2}

{para3}
    """
    chunker = MarkdownSemanticChunker(target_chars=400, max_chars=600)
    chunks = chunker.chunk(doc, document_title="Políticas")

    assert len(chunks) > 1
    # Every sub-chunk must keep the breadcrumb header
    for ch in chunks:
        assert "[Políticas de Garantía > Condiciones Generales]" in ch.content
