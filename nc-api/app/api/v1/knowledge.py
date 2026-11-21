"""Knowledge ingestion and document management endpoints — /api/v1/knowledge."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, HttpUrl
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.modules.auth.deps import get_current_user
from app.modules.auth.models import User
from app.modules.knowledge.extractors import extract_from_pdf, extract_from_text, extract_from_url
from app.modules.knowledge.models import KnowledgeDocument
from app.modules.knowledge.service import knowledge_service

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


class ExtractUrlRequest(BaseModel):
    url: str


class CreateDocumentRequest(BaseModel):
    title: str
    source_type: str = "manual"
    source_url: str | None = None
    raw_markdown: str


class ExtractResponse(BaseModel):
    title: str
    markdown: str
    source: str


class DocumentResponse(BaseModel):
    id: str
    title: str
    source_type: str
    source_url: str | None
    status: str
    created_at: str


@router.post("/extract-url", response_model=ExtractResponse)
async def extract_url_content(
    body: ExtractUrlRequest,
    current_user: User = Depends(get_current_user),
) -> ExtractResponse:
    """Fetch a public URL and convert its main body into clean Markdown."""
    url_str = body.url.strip()
    if not url_str.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="URL debe iniciar con http:// o https://")

    try:
        title, markdown = await extract_from_url(url_str)
        return ExtractResponse(title=title, markdown=markdown, source=url_str)
    except Exception as e:
        raise HTTPException(
            status_code=422, detail=f"No se pudo extraer contenido de la URL: {str(e)}"
        )


@router.post("/extract-file", response_model=ExtractResponse)
async def extract_file_content(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
) -> ExtractResponse:
    """Extract and format text from an uploaded PDF, TXT, or Markdown file."""
    filename = file.filename or "archivo"
    content_bytes = await file.read()
    if not content_bytes:
        raise HTTPException(status_code=400, detail="El archivo subido está vacío.")

    lower_name = filename.lower()
    try:
        if lower_name.endswith(".pdf"):
            title, markdown = extract_from_pdf(content_bytes, default_title=filename)
        elif lower_name.endswith((".txt", ".md", ".markdown")):
            text = content_bytes.decode("utf-8", errors="replace")
            title, markdown = extract_from_text(text, default_title=filename)
        else:
            raise HTTPException(
                status_code=400,
                detail="Formato no soportado. Por favor sube un archivo .pdf, .txt o .md",
            )
        return ExtractResponse(title=title, markdown=markdown, source=filename)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Error al procesar el archivo: {str(e)}")


@router.post("/documents", status_code=status.HTTP_201_CREATED)
async def create_knowledge_document(
    body: CreateDocumentRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Save an approved Markdown document and chunk it for semantic search."""
    tenant_id = current_user.current_tenant_id or current_user.tenant_id
    if not tenant_id:
        raise HTTPException(
            status_code=400, detail="El usuario no tiene un tenant activo seleccionado."
        )

    if not body.raw_markdown.strip():
        raise HTTPException(status_code=400, detail="El contenido en Markdown no puede estar vacío.")

    doc = await knowledge_service.create_document(
        tenant_id=tenant_id,
        title=body.title.strip() or "Documento de Conocimiento",
        source_type=body.source_type,
        raw_markdown=body.raw_markdown,
        db=session,
        source_url=body.source_url,
    )

    return {
        "id": str(doc.id),
        "title": doc.title,
        "source_type": doc.source_type,
        "status": doc.status,
        "chunks_count": len(doc.chunks) if doc.chunks else 0,
        "created_at": doc.created_at.isoformat(),
    }


@router.get("/documents")
async def list_knowledge_documents(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[dict]:
    """List all indexed knowledge documents for the active tenant."""
    tenant_id = current_user.current_tenant_id or current_user.tenant_id
    if not tenant_id:
        return []

    t_uuid = uuid.UUID(str(tenant_id)) if isinstance(tenant_id, str) else tenant_id
    stmt = (
        select(KnowledgeDocument)
        .where(KnowledgeDocument.tenant_id == t_uuid)
        .order_by(KnowledgeDocument.created_at.desc())
    )
    result = await session.execute(stmt)
    docs = result.scalars().all()

    return [
        {
            "id": str(d.id),
            "title": d.title,
            "source_type": d.source_type,
            "source_url": d.source_url,
            "status": d.status,
            "created_at": d.created_at.isoformat(),
        }
        for d in docs
    ]


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_knowledge_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    """Delete a knowledge document and its semantic chunks."""
    tenant_id = current_user.current_tenant_id or current_user.tenant_id
    t_uuid = uuid.UUID(str(tenant_id)) if isinstance(tenant_id, str) else tenant_id

    stmt = select(KnowledgeDocument).where(
        KnowledgeDocument.id == document_id,
        KnowledgeDocument.tenant_id == t_uuid,
    )
    result = await session.execute(stmt)
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado.")

    await session.delete(doc)
    await session.commit()
