"""AgentTemplate CRUD endpoints — /api/v1/agent-templates."""

from __future__ import annotations

import uuid
import typing as t

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.modules.auth.deps import get_current_user, RoleChecker
from app.modules.auth.models import User, UserRole
from app.modules.agents.template_models import AgentTemplate
from app.modules.agents.template_schemas import (
    AgentTemplateCreate,
    AgentTemplateUpdate,
    AgentTemplateResponse,
)

router = APIRouter(prefix="/agent-templates", tags=["agent-templates"])

require_superadmin = RoleChecker([UserRole.SUPERADMIN])


@router.get("", response_model=t.List[AgentTemplateResponse])
async def list_templates(
    category: str | None = Query(None, description="Filter by template category"),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> t.Sequence[AgentTemplate]:
    """List all agent templates, optionally filtered by *category*."""
    query = select(AgentTemplate).order_by(AgentTemplate.category, AgentTemplate.name)

    if category:
        query = query.where(AgentTemplate.category == category)

    result = await session.execute(query)
    return result.scalars().all()


@router.get("/{template_id}", response_model=AgentTemplateResponse)
async def get_template(
    template_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> AgentTemplate:
    """Get a single agent template by ID."""
    template = await session.get(AgentTemplate, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.post("", response_model=AgentTemplateResponse, status_code=201)
async def create_template(
    body: AgentTemplateCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_superadmin),
) -> AgentTemplate:
    """Create a new agent template (superadmin only)."""
    template = AgentTemplate(**body.model_dump())
    session.add(template)
    await session.commit()
    await session.refresh(template)
    return template


@router.patch("/{template_id}", response_model=AgentTemplateResponse)
async def update_template(
    template_id: uuid.UUID,
    body: AgentTemplateUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_superadmin),
) -> AgentTemplate:
    """Update an existing agent template (superadmin only)."""
    template = await session.get(AgentTemplate, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(template, key, value)

    session.add(template)
    await session.commit()
    await session.refresh(template)
    return template


@router.delete("/{template_id}", status_code=204, response_class=Response)
async def delete_template(
    template_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_superadmin),
):
    """Delete an agent template (superadmin only)."""
    template = await session.get(AgentTemplate, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    await session.delete(template)
    await session.commit()
