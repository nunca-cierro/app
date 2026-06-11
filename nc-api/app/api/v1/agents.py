"""AI Agent and Prompt CRUD endpoints — /api/v1/agents."""

from __future__ import annotations

import uuid
import typing as t

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.modules.auth.deps import get_current_user
from app.modules.auth.models import User, UserRole
from app.modules.agents.models import AiAgent, Prompt
from app.modules.agents.schemas import (
    AiAgentCreate,
    AiAgentFromTemplate,
    AiAgentUpdate,
    AiAgentResponse,
    PromptCreate,
    PromptResponse,
)
from app.modules.agents.template_models import AgentTemplate
from app.modules.agents.templates import PlaceholderResolver
from app.modules.tenants.models import Tenant

router = APIRouter(prefix="/agents", tags=["agents"])


@router.post("/from-template", response_model=AiAgentResponse, status_code=201)
async def create_agent_from_template(
    body: AiAgentFromTemplate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> AiAgent:
    """Create an AI agent from a pre-built template with placeholder resolution.

    1. Loads the ``AgentTemplate`` and ``Tenant`` (with ``business_profile``)
    2. Deep-clones the template ``content``
    3. Resolves ``{{placeholder}}`` tokens from the tenant's profile
    4. Merges any ``overrides`` on top
    5. Creates and returns the ``AiAgent``
    """
    # Load template
    template = await session.get(AgentTemplate, body.template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Load tenant
    tenant = await session.get(Tenant, body.tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # Resolve placeholders from tenant business_profile
    resolved_content = PlaceholderResolver.resolve(
        template.content, tenant.business_profile
    )

    # Merge overrides on top of resolved content
    if body.overrides:
        resolved_content.update(body.overrides)

    # Build AiAgent from resolved content
    agent = AiAgent(
        tenant_id=body.tenant_id,
        name=body.name or template.name,
        business_config=resolved_content,
        provider="groq",
        model="llama-3.3-70b-versatile",
        temperature=0,
        max_tokens=512,
    )
    session.add(agent)
    await session.commit()
    await session.refresh(agent)
    return agent


@router.post("", response_model=AiAgentResponse, status_code=201)
async def create_new_agent(
    body: AiAgentCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> AiAgent:
    """Create a new AI Agent for the current tenant."""
    if current_user.current_role != UserRole.SUPERADMIN:
        if not current_user.current_tenant_id:
            raise HTTPException(status_code=403, detail="No tenant context")
        # Force tenant_id from user context
        agent_data = body.model_dump()
        agent_data["tenant_id"] = current_user.current_tenant_id
        agent = AiAgent(**agent_data)
    else:
        agent = AiAgent(**body.model_dump())
        
    session.add(agent)
    await session.commit()
    await session.refresh(agent)
    return agent


@router.get("", response_model=t.List[AiAgentResponse])
async def list_agents(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
) -> t.Sequence[AiAgent]:
    """List agents for the current tenant."""
    from sqlalchemy import select
    query = select(AiAgent).offset(skip).limit(limit)
    
    # Isolation
    if current_user.current_role != UserRole.SUPERADMIN:
        if not current_user.current_tenant_id:
            raise HTTPException(status_code=403, detail="No tenant context")
        query = query.where(AiAgent.tenant_id == current_user.current_tenant_id)
    
    result = await session.execute(query)
    return result.scalars().all()


@router.get("/{agent_id}", response_model=AiAgentResponse)
async def get_agent(
    agent_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> AiAgent:
    """Get a specific agent with isolation."""
    from sqlalchemy import select
    query = select(AiAgent).where(AiAgent.id == agent_id)
    
    if current_user.current_role != UserRole.SUPERADMIN:
        if not current_user.current_tenant_id:
            raise HTTPException(status_code=403, detail="No tenant context")
        query = query.where(AiAgent.tenant_id == current_user.current_tenant_id)
        
    result = await session.execute(query)
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.patch("/{agent_id}", response_model=AiAgentResponse)
async def update_agent_info(
    agent_id: uuid.UUID,
    body: AiAgentUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> AiAgent:
    """Update agent information with isolation."""
    from sqlalchemy import select
    query = select(AiAgent).where(AiAgent.id == agent_id)
    
    if current_user.current_role != UserRole.SUPERADMIN:
        if not current_user.current_tenant_id:
            raise HTTPException(status_code=403, detail="No tenant context")
        query = query.where(AiAgent.tenant_id == current_user.current_tenant_id)
        
    result = await session.execute(query)
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    update_data = body.model_dump(exclude_unset=True)
    # Never allow changing tenant_id via patch
    update_data.pop("tenant_id", None)
    
    for key, value in update_data.items():
        setattr(agent, key, value)

    session.add(agent)
    await session.commit()
    await session.refresh(agent)
    return agent


@router.delete("/{agent_id}", status_code=204, response_class=Response)
async def delete_agent(
    agent_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete an agent and its prompts with isolation."""
    from sqlalchemy import select
    query = select(AiAgent).where(AiAgent.id == agent_id)
    
    if current_user.current_role != UserRole.SUPERADMIN:
        if not current_user.current_tenant_id:
            raise HTTPException(status_code=403, detail="No tenant context")
        query = query.where(AiAgent.tenant_id == current_user.current_tenant_id)
        
    result = await session.execute(query)
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Delete associated prompts first
    from sqlalchemy import delete as sa_delete
    await session.execute(sa_delete(Prompt).where(Prompt.agent_id == agent_id))

    await session.delete(agent)
    await session.commit()


@router.get("/{agent_id}/prompts", response_model=t.List[PromptResponse])
async def list_agent_prompts(
    agent_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> t.Sequence[Prompt]:
    """Get history of prompts for an agent with isolation."""
    from sqlalchemy import select
    # Verify agent access
    agent_query = select(AiAgent).where(AiAgent.id == agent_id)
    if current_user.current_role != UserRole.SUPERADMIN:
        if not current_user.current_tenant_id:
            raise HTTPException(status_code=403, detail="No tenant context")
        agent_query = agent_query.where(AiAgent.tenant_id == current_user.current_tenant_id)
    
    agent_result = await session.execute(agent_query)
    if not agent_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Agent not found")

    result = await session.execute(
        select(Prompt).where(Prompt.agent_id == agent_id).order_by(Prompt.version.desc())
    )
    return result.scalars().all()


@router.post("/{agent_id}/prompts", response_model=PromptResponse, status_code=201)
async def create_agent_prompt(
    agent_id: uuid.UUID,
    body: PromptCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Prompt:
    """Create a new prompt version for an agent with isolation."""
    from sqlalchemy import select, func
    # Verify agent access
    agent_query = select(AiAgent).where(AiAgent.id == agent_id)
    if current_user.current_role != UserRole.SUPERADMIN:
        if not current_user.current_tenant_id:
            raise HTTPException(status_code=403, detail="No tenant context")
        agent_query = agent_query.where(AiAgent.tenant_id == current_user.current_tenant_id)
    
    agent_result = await session.execute(agent_query)
    agent = agent_result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Find current max version
    version_result = await session.execute(
        select(func.max(Prompt.version)).where(Prompt.agent_id == agent_id)
    )
    current_version = version_result.scalar() or 0
    
    prompt = Prompt(
        agent_id=agent_id,
        tenant_id=agent.tenant_id,
        version=current_version + 1,
        **body.model_dump()
    )
    session.add(prompt)
    await session.commit()
    await session.refresh(prompt)
    return prompt
