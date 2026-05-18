"""AI Agent and Prompt CRUD endpoints — /api/v1/agents."""

from __future__ import annotations

import uuid
import typing as t

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.modules.agents.models import AiAgent, Prompt
from app.modules.agents.schemas import (
    AiAgentCreate,
    AiAgentResponse,
    AiAgentUpdate,
    PromptCreate,
    PromptResponse,
    PromptUpdate,
)

router = APIRouter(prefix="/agents", tags=["agents"])


# ── AiAgent ─────────────────────────────────────────────────────────────


@router.get("", response_model=list[AiAgentResponse])
async def list_agents(
    tenant_id: uuid.UUID | None = None,
    session: AsyncSession = Depends(get_session),
) -> t.Any:
    """List AI agents, optionally filtered by tenant."""
    query = select(AiAgent).order_by(AiAgent.created_at.desc())
    if tenant_id:
        query = query.where(AiAgent.tenant_id == tenant_id)
    result = await session.execute(query)
    return result.scalars().all()


@router.post("", response_model=AiAgentResponse, status_code=201)
async def create_agent(
    body: AiAgentCreate,
    session: AsyncSession = Depends(get_session),
) -> t.Any:
    """Create a new AI agent for a tenant."""
    agent = AiAgent(**body.model_dump())
    session.add(agent)
    await session.commit()
    await session.refresh(agent)
    return agent


@router.get("/{agent_id}", response_model=AiAgentResponse)
async def get_agent(
    agent_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> t.Any:
    """Get a single AI agent."""
    agent = await session.get(AiAgent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.patch("/{agent_id}", response_model=AiAgentResponse)
async def update_agent(
    agent_id: uuid.UUID,
    body: AiAgentUpdate,
    session: AsyncSession = Depends(get_session),
) -> t.Any:
    """Update an AI agent."""
    agent = await session.get(AiAgent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(agent, field, value)

    await session.commit()
    await session.refresh(agent)
    return agent


# ── Prompts (nested under agent) ────────────────────────────────────────


@router.get("/{agent_id}/prompts", response_model=list[PromptResponse])
async def list_prompts(
    agent_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> t.Any:
    """List prompts for an agent."""
    result = await session.execute(
        select(Prompt).where(Prompt.agent_id == agent_id).order_by(Prompt.version.desc())
    )
    return result.scalars().all()


@router.post("/{agent_id}/prompts", response_model=PromptResponse, status_code=201)
async def create_prompt(
    agent_id: uuid.UUID,
    body: PromptCreate,
    session: AsyncSession = Depends(get_session),
) -> t.Any:
    """Create a new prompt version for an agent."""
    # Auto-increment version
    last_version = await session.execute(
        select(Prompt.version)
        .where(Prompt.agent_id == agent_id)
        .order_by(Prompt.version.desc())
        .limit(1)
    )
    next_version = (last_version.scalar() or 0) + 1

    prompt = Prompt(**body.model_dump(exclude={"agent_id"}), agent_id=agent_id, version=next_version)
    session.add(prompt)
    await session.commit()
    await session.refresh(prompt)
    return prompt


@router.delete("/{agent_id}", status_code=204)
async def delete_agent(
    agent_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> None:
    """Delete an agent and its prompts."""
    agent = await session.get(AiAgent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Delete associated prompts first
    from sqlalchemy import delete as sa_delete
    await session.execute(sa_delete(Prompt).where(Prompt.agent_id == agent_id))

    await session.delete(agent)
    await session.commit()


@router.patch("/{agent_id}/prompts/{prompt_id}", response_model=PromptResponse)
async def update_prompt(
    agent_id: uuid.UUID,
    prompt_id: uuid.UUID,
    body: PromptUpdate,
    session: AsyncSession = Depends(get_session),
) -> t.Any:
    """Update a prompt."""
    prompt = await session.get(Prompt, prompt_id)
    if not prompt or prompt.agent_id != agent_id:
        raise HTTPException(status_code=404, detail="Prompt not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(prompt, field, value)

    await session.commit()
    await session.refresh(prompt)
    return prompt
