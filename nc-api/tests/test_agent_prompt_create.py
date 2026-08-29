"""Tests: POST /agents/{id}/prompts no longer fails with duplicate kwargs.

Regression: PromptCreate already carries tenant_id/agent_id, so constructing
``Prompt(agent_id=..., tenant_id=..., **body.model_dump())`` raised
``TypeError: got multiple values for keyword argument`` → HTTP 500.
"""

from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.modules.agents.models import AiAgent
from app.modules.auth.deps import get_current_user
from app.modules.auth.models import User, UserRole
from app.modules.tenants.models import Tenant


def _create_tenant_row(db_session: AsyncSession, name: str, slug: str) -> Tenant:
    tenant = Tenant(
        id=uuid.uuid4(),
        name=name,
        slug=slug,
        status="active",
        plan="basic",
        timezone="UTC",
        locale="en",
    )
    db_session.add(tenant)
    return tenant


def _create_agent_row(db_session: AsyncSession, tenant_id: uuid.UUID) -> AiAgent:
    agent = AiAgent(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        name="Prompt Agent",
        business_config={"instructions": "test"},
        provider="groq",
        model="openai/gpt-oss-120b",
        temperature=0,
        max_tokens=512,
    )
    db_session.add(agent)
    return agent


@pytest.mark.asyncio
async def test_create_agent_prompt_returns_201(
    client: AsyncClient, db_session: AsyncSession,
):
    """Creating a prompt version succeeds instead of raising TypeError."""
    tenant = _create_tenant_row(db_session, "Prompt Tenant", "prompt-tenant")
    await db_session.flush()
    agent = _create_agent_row(db_session, tenant.id)
    user = User(
        id=uuid.uuid4(),
        email="prompt-sa@test.com",
        password_hash="hash",
        name="Prompt SA",
        role=UserRole.SUPERADMIN,
    )
    db_session.add_all([agent, user])
    await db_session.commit()

    setattr(user, "current_role", UserRole.SUPERADMIN)
    setattr(user, "current_tenant_id", None)

    async def override_auth() -> User:
        return user

    app.dependency_overrides[get_current_user] = override_auth
    try:
        response = await client.post(
            f"/api/v1/agents/{agent.id}/prompts",
            json={"tenant_id": str(tenant.id), "content": "You are a helpful assistant."},
        )
        assert response.status_code == 201, response.text
        data = response.json()
        # tenant_id always comes from the verified agent, never the body
        assert data["tenant_id"] == str(tenant.id)
        assert data["agent_id"] == str(agent.id)
        assert data["version"] == 1
        assert data["content"] == "You are a helpful assistant."
    finally:
        app.dependency_overrides.clear()
