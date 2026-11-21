"""Extractors to convert URLs, PDFs, and raw text into clean, structured Markdown."""

from __future__ import annotations

import io
import re
import typing as t
from bs4 import BeautifulSoup, Tag
import httpx
from loguru import logger
from pypdf import PdfReader


def normalize_markdown(text: str) -> str:
    """Normalize whitespace and remove excessive blank lines from markdown."""
    text = re.sub(r"\r\n|\r", "\n", text)
    # Remove null bytes or non-printable chars
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", text)
    # Collapse 3+ newlines into 2
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def extract_from_text(text: str, default_title: str = "Documento") -> tuple[str, str]:
    """Clean and structure raw text/markdown input."""
    cleaned = normalize_markdown(text)
    # Try to extract title from the first # Heading
    first_heading_match = re.search(r"^#\s+(.+)$", cleaned, re.MULTILINE)
    title = first_heading_match.group(1).strip() if first_heading_match else default_title
    return title, cleaned


async def extract_from_url(url: str, timeout: float = 15.0) -> tuple[str, str]:
    """Fetch a web page and convert its core readable content into clean Markdown.

    Strips navigation, footer, scripts, styles, forms, and cookie notices.
    """
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36 NuncaCierroBot/1.0"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-CO,es;q=0.9,en;q=0.8",
    }

    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        response = await client.get(url, headers=headers)
        response.raise_for_status()
        html = response.text

    soup = BeautifulSoup(html, "html.parser")

    # Extract page title
    title = ""
    if soup.title and soup.title.string:
        title = soup.title.string.strip()
    if not title:
        h1 = soup.find("h1")
        if h1 and h1.get_text():
            title = h1.get_text().strip()
    if not title:
        title = url.split("//")[-1].split("/")[0]

    # Decompose non-content / boilerplate elements
    for tag_name in [
        "script",
        "style",
        "noscript",
        "nav",
        "footer",
        "header",
        "aside",
        "iframe",
        "svg",
        "form",
        "button",
        "dialog",
    ]:
        for el in soup.find_all(tag_name):
            el.decompose()

    # Also decompose cookie banners, popups, and ad containers by common class/id patterns
    noisy_patterns = re.compile(r"cookie|banner|consent|modal|popup|advert|disclaimer|share-buttons", re.I)
    for el in soup.find_all(attrs={"class": noisy_patterns}):
        el.decompose()
    for el in soup.find_all(attrs={"id": noisy_patterns}):
        el.decompose()

    # Focus on main/article body if present, else fall back to body
    content_root = soup.find("main") or soup.find("article") or soup.find("body") or soup

    markdown_lines: list[str] = []
    if title:
        markdown_lines.append(f"# {title}\n")

    def _convert_node(node: Tag | str) -> None:
        if isinstance(node, str):
            text = node.strip()
            if text:
                markdown_lines.append(text)
            return

        name = node.name.lower() if node.name else ""

        if name in ("h1", "h2", "h3", "h4", "h5", "h6"):
            level = int(name[1])
            heading_text = node.get_text().strip()
            if heading_text:
                markdown_lines.append(f"\n{'#' * level} {heading_text}\n")
        elif name == "p":
            para_text = node.get_text().strip()
            if para_text:
                markdown_lines.append(f"\n{para_text}\n")
        elif name in ("ul", "ol"):
            markdown_lines.append("")
            for li in node.find_all("li", recursive=False):
                li_text = li.get_text().strip()
                if li_text:
                    markdown_lines.append(f"- {li_text}")
            markdown_lines.append("")
        elif name == "table":
            # Simple markdown table extraction
            rows = node.find_all("tr")
            if rows:
                markdown_lines.append("")
                for r_idx, row in enumerate(rows):
                    cols = [c.get_text().strip().replace("\n", " ") for c in row.find_all(["td", "th"])]
                    if cols:
                        markdown_lines.append("| " + " | ".join(cols) + " |")
                        if r_idx == 0:
                            markdown_lines.append("| " + " | ".join(["---"] * len(cols)) + " |")
                markdown_lines.append("")
        elif name in ("div", "section"):
            for child in node.children:
                if isinstance(child, (Tag, str)):
                    _convert_node(child)
        else:
            text = node.get_text().strip()
            if text and len(text) > 30:
                markdown_lines.append(f"\n{text}\n")

    for child in content_root.children:
        if isinstance(child, (Tag, str)):
            _convert_node(child)

    raw_md = "\n".join(markdown_lines)
    return title, normalize_markdown(raw_md)


def extract_from_pdf(file_bytes: bytes, default_title: str = "Documento PDF") -> tuple[str, str]:
    """Extract structured text from a PDF and format into clean Markdown."""
    reader = PdfReader(io.BytesIO(file_bytes))
    meta = reader.metadata or {}
    title = meta.title if hasattr(meta, "title") and meta.title else default_title

    pages_text: list[str] = []
    for idx, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        # Clean header/footer lines that look like "Page 1 of 10" or bare numbers
        cleaned_page_lines: list[str] = []
        for line in text.split("\n"):
            stripped = line.strip()
            if re.match(r"^(p[áa]gina|\d+)(\s+de\s+\d+)?$", stripped, re.I):
                continue
            cleaned_page_lines.append(stripped)
        page_content = "\n".join(cleaned_page_lines).strip()
        if page_content:
            pages_text.append(f"## Página {idx + 1}\n\n{page_content}")

    full_text = f"# {title}\n\n" + "\n\n".join(pages_text)
    return title, normalize_markdown(full_text)
