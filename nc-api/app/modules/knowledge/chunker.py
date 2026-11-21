"""Markdown-aware semantic chunker with hierarchy path prefix injection."""

from __future__ import annotations

import re
from dataclasses import dataclass
import typing as t


@dataclass
class ChunkItem:
    """A semantic chunk derived from a Markdown document with hierarchical context."""
    chunk_index: int
    breadcrumb: str
    content: str
    char_count: int


class MarkdownSemanticChunker:
    """Splits Markdown documents into dense, context-preserving chunks.

    Injects breadcrumb headers ([Documento: Título > Sección > Subsección])
    so each chunk retains its topical identity for high-precision retrieval.
    """

    def __init__(self, target_chars: int = 1000, max_chars: int = 1500) -> None:
        self.target_chars = target_chars
        self.max_chars = max_chars

    def chunk(self, markdown_text: str, document_title: str = "Documento") -> list[ChunkItem]:
        """Split a markdown string into hierarchy-prefixed chunks."""
        lines = markdown_text.strip().split("\n")
        if not lines or not any(l.strip() for l in lines):
            return []

        # Parse sections based on heading patterns
        sections: list[tuple[int, str, list[str]]] = []  # (level, title, text_lines)
        current_level = 1
        current_title = document_title
        current_lines: list[str] = []

        heading_re = re.compile(r"^(#{1,6})\s+(.+)$")

        for line in lines:
            match = heading_re.match(line.strip())
            if match:
                # Flush existing section
                if current_lines:
                    sections.append((current_level, current_title, current_lines))
                    current_lines = []
                current_level = len(match.group(1))
                current_title = match.group(2).strip()
            else:
                current_lines.append(line)

        if current_lines:
            sections.append((current_level, current_title, current_lines))

        # Build chunks preserving hierarchical breadcrumbs
        chunks: list[ChunkItem] = []
        heading_stack: dict[int, str] = {1: document_title}
        chunk_idx = 0

        for level, title, body_lines in sections:
            # Update stack: keep headings at higher levels, clear lower levels
            heading_stack = {lvl: text for lvl, text in heading_stack.items() if lvl < level}
            heading_stack[level] = title

            # Generate breadcrumb string: e.g. "Clínica Dental > Ortodoncia > Precios"
            breadcrumb = " > ".join(heading_stack[lvl] for lvl in sorted(heading_stack.keys()))

            body_text = "\n".join(body_lines).strip()
            if not body_text:
                continue

            # Sub-split by paragraphs if body exceeds max_chars
            if len(body_text) <= self.max_chars:
                content = f"[{breadcrumb}]\n{body_text}"
                chunks.append(
                    ChunkItem(
                        chunk_index=chunk_idx,
                        breadcrumb=breadcrumb,
                        content=content,
                        char_count=len(content),
                    )
                )
                chunk_idx += 1
            else:
                paragraphs = [p.strip() for p in body_text.split("\n\n") if p.strip()]
                buffer: list[str] = []
                buffer_len = 0

                for p in paragraphs:
                    if buffer_len + len(p) > self.target_chars and buffer:
                        sub_body = "\n\n".join(buffer)
                        content = f"[{breadcrumb}]\n{sub_body}"
                        chunks.append(
                            ChunkItem(
                                chunk_index=chunk_idx,
                                breadcrumb=breadcrumb,
                                content=content,
                                char_count=len(content),
                            )
                        )
                        chunk_idx += 1
                        buffer = [p]
                        buffer_len = len(p)
                    else:
                        buffer.append(p)
                        buffer_len += len(p)

                if buffer:
                    sub_body = "\n\n".join(buffer)
                    content = f"[{breadcrumb}]\n{sub_body}"
                    chunks.append(
                        ChunkItem(
                            chunk_index=chunk_idx,
                            breadcrumb=breadcrumb,
                            content=content,
                            char_count=len(content),
                        )
                    )
                    chunk_idx += 1

        return chunks
