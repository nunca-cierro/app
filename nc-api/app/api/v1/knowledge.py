"""Knowledge ingestion and document management endpoints — /api/v1/knowledge."""

from __future__ import annotations

import uuid
from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from pydantic import BaseModel
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
    tenant_id: str | None = None


class UpdateDocumentRequest(BaseModel):
    title: str
    raw_markdown: str
    tenant_id: str | None = None


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


def _get_target_tenant_id(
    current_user: User,
    explicit_tenant_id: str | uuid.UUID | None = None,
) -> uuid.UUID | None:
    tid = explicit_tenant_id or getattr(current_user, "current_tenant_id", None)
    if not tid:
        return None
    try:
        return uuid.UUID(str(tid)) if isinstance(tid, str) else tid
    except (ValueError, TypeError):
        return None


@router.post("/extract-url", response_model=ExtractResponse)
async def extract_url_content(
    body: ExtractUrlRequest,
    current_user: User = Depends(get_current_user),
) -> ExtractResponse:
    """Fetch a public URL and convert its main body into clean Markdown."""
    url_str = body.url.strip()
    if not url_str.startswith("http://") and not url_str.startswith("https://"):
        raise HTTPException(
            status_code=400,
            detail="La URL debe comenzar con http:// o https://",
        )

    try:
        title, markdown = await extract_from_url(url_str)
        return ExtractResponse(title=title, markdown=markdown, source=url_str)
    except Exception as e:
        raise HTTPException(
            status_code=422,
            detail=f"Error al extraer contenido de la URL: {str(e)}",
        )


@router.post("/extract-file", response_model=ExtractResponse)
async def extract_file_content(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
) -> ExtractResponse:
    """Extract content from uploaded PDF or TXT/MD file and convert to Markdown."""
    filename = file.filename or "archivo"
    content_bytes = await file.read()

    if len(content_bytes) == 0:
        raise HTTPException(status_code=400, detail="El archivo está vacío.")

    # Max 10MB limit
    if len(content_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="El archivo excede el tamaño máximo permitido (10MB).")

    try:
        if filename.lower().endswith(".pdf"):
            title, markdown = extract_from_pdf(content_bytes, default_title=filename)
        elif filename.lower().endswith((".txt", ".md", ".markdown")):
            text_content = content_bytes.decode("utf-8", errors="replace")
            title, markdown = extract_from_text(text_content, default_title=filename)
        else:
            raise HTTPException(
                status_code=400,
                detail="Formato de archivo no soportado. Suba un archivo .pdf, .txt o .md",
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
    tenant_id = _get_target_tenant_id(current_user, body.tenant_id)
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
    tenant_id: str | None = None,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[dict]:
    """List all indexed knowledge documents for the active tenant."""
    t_uuid = _get_target_tenant_id(current_user, tenant_id)
    if not t_uuid:
        return []

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
            "raw_markdown": d.raw_markdown,
            "status": d.status,
            "created_at": d.created_at.isoformat(),
        }
        for d in docs
    ]


@router.put("/documents/{document_id}")
async def update_knowledge_document(
    document_id: uuid.UUID,
    body: UpdateDocumentRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Update an existing knowledge document, replace chunks and re-index."""
    tenant_id = _get_target_tenant_id(current_user, body.tenant_id)
    if not tenant_id:
        raise HTTPException(
            status_code=400, detail="Tenant no especificado."
        )

    if not body.raw_markdown.strip():
        raise HTTPException(status_code=400, detail="El contenido en Markdown no puede estar vacío.")

    doc = await knowledge_service.update_document(
        document_id=document_id,
        tenant_id=tenant_id,
        title=body.title.strip() or "Documento de Conocimiento",
        raw_markdown=body.raw_markdown,
        db=session,
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado.")

    return {
        "id": str(doc.id),
        "title": doc.title,
        "source_type": doc.source_type,
        "status": doc.status,
        "chunks_count": len(doc.chunks) if doc.chunks else 0,
        "updated_at": doc.updated_at.isoformat(),
    }


@router.post("/documents/{document_id}/resync", response_model=ExtractResponse)
async def resync_knowledge_document(
    document_id: uuid.UUID,
    tenant_id: str | None = None,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ExtractResponse:
    """Re-scrape the source URL of an existing document for preview and update."""
    t_uuid = _get_target_tenant_id(current_user, tenant_id)

    stmt = select(KnowledgeDocument).where(KnowledgeDocument.id == document_id)
    if t_uuid:
        stmt = stmt.where(KnowledgeDocument.tenant_id == t_uuid)

    result = await session.execute(stmt)
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado.")

    if not doc.source_url:
        raise HTTPException(status_code=400, detail="El documento no tiene una URL web de origen asociada.")

    try:
        title, markdown = await extract_from_url(doc.source_url)
        return ExtractResponse(title=title, markdown=markdown, source=doc.source_url)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Error al re-sincronizar la URL: {str(e)}")


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_knowledge_document(
    document_id: uuid.UUID,
    tenant_id: str | None = None,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    """Delete a knowledge document and its semantic chunks."""
    t_uuid = _get_target_tenant_id(current_user, tenant_id)

    stmt = select(KnowledgeDocument).where(KnowledgeDocument.id == document_id)
    if t_uuid:
        stmt = stmt.where(KnowledgeDocument.tenant_id == t_uuid)

    result = await session.execute(stmt)
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado.")

    await session.delete(doc)
    await session.commit()
