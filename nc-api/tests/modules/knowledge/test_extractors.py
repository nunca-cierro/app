"""Tests for knowledge text, URL, and PDF extractors."""

from __future__ import annotations

import io
import pytest
from unittest.mock import AsyncMock, patch

from pypdf import PdfWriter

from app.modules.knowledge.extractors import (
    extract_from_text,
    extract_from_pdf,
    extract_from_url,
    normalize_markdown,
)


def test_normalize_markdown():
    raw = "Línea 1\r\n\r\n\r\n\r\nLínea 2\x00\x08   "
    res = normalize_markdown(raw)
    assert "Línea 1\n\nLínea 2" in res
    assert "\x00" not in res


def test_extract_from_text_with_heading():
    raw = "# Clínica San José\n\nServicios de medicina general y odontología.\n\n- Consulta: $50.000"
    title, md = extract_from_text(raw)
    assert title == "Clínica San José"
    assert "Servicios de medicina general" in md
    assert "- Consulta: $50.000" in md


def test_extract_from_text_default_title():
    raw = "Solo texto plano sin encabezado alguno."
    title, md = extract_from_text(raw, default_title="Notas")
    assert title == "Notas"
    assert md == raw


def test_extract_from_pdf():
    # Build a minimal valid PDF in memory
    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    # Add metadata
    writer.add_metadata({"/Title": "Catálogo de Servicios 2026"})
    pdf_stream = io.BytesIO()
    writer.write(pdf_stream)
    pdf_bytes = pdf_stream.getvalue()

    title, md = extract_from_pdf(pdf_bytes, default_title="Manual")
    assert title == "Catálogo de Servicios 2026"
    assert "Catálogo de Servicios 2026" in md


@pytest.mark.asyncio
async def test_extract_from_url_strips_noise():
    html_sample = """
    <!DOCTYPE html>
    <html>
      <head><title>Restaurante La Esquina</title></head>
      <body>
        <nav><a href="#">Inicio</a><a href="#">Contacto</a></nav>
        <header><p>Aviso de cabecera</p></header>
        <div class="cookie-banner"><p>Acepta nuestras cookies</p></div>
        <main>
          <h1>Menú del Día</h1>
          <p>Ofrecemos almuerzos ejecutivos de lunes a viernes.</p>
          <h2>Platos Principales</h2>
          <ul>
            <li>Bandeja Paisa - $25.000</li>
            <li>Sancocho de Pescado - $22.000</li>
          </ul>
        </main>
        <footer><p>Derechos reservados 2026</p></footer>
      </body>
    </html>
    """
    mock_resp = AsyncMock()
    mock_resp.text = html_sample
    mock_resp.raise_for_status = AsyncMock()

    with patch("httpx.AsyncClient.get", return_value=mock_resp):
        title, md = await extract_from_url("https://laesquina.com")

    assert "Restaurante La Esquina" in title
    assert "Menú del Día" in md
    assert "Bandeja Paisa" in md
    # Noisy elements should have been removed
    assert "Acepta nuestras cookies" not in md
    assert "Aviso de cabecera" not in md
    assert "Derechos reservados" not in md
