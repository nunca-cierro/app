"""Integration tests for Agent-Connection Link."""

from __future__ import annotations

import uuid
import pytest
from unittest.mock import AsyncMock, patch
from app.modules.platform_connections.models import PlatformConnection
from app.modules.tenants.models import Tenant
from app.modules.agents.models import AiAgent
from app.core.encryption import encrypt

async def _create_tenant(db_session) -> Tenant:
    tenant = Tenant(
        id=uuid.uuid4(),
        name="Integration Test Tenant",
        slug=f"integration-test-{uuid.uuid4().hex[:6]}",
        status="active",
        plan="basic",
        timezone="UTC",
        locale="en",
    )
    db_session.add(tenant)
    await db_session.commit()
    await db_session.refresh(tenant)
    return tenant

@pytest.mark.asyncio
async def test_evolution_respects_linked_agent_integration(client, db_session) -> None:
    """Verify that the evolution handler uses the specifically linked agent."""
    # 1. Setup Tenant
    tenant = await _create_tenant(db_session)
    
    # 2. Setup two agents for the tenant
    agent_fallback = AiAgent(
        id=uuid.uuid4(), 
        tenant_id=tenant.id, 
        name="Fallback Agent", 
        enabled=True, 
        model="gpt-fallback"
    )
    agent_linked = AiAgent(
        id=uuid.uuid4(), 
        tenant_id=tenant.id, 
        name="Linked Agent", 
        enabled=True, 
        model="gpt-linked"
    )
    db_session.add_all([agent_fallback, agent_linked])
    await db_session.commit()
    
    # 3. Setup Connection linked to agent_linked
    conn = PlatformConnection(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        platform_type="evolution",
        display_name="Evolution Conn",
        credentials=encrypt({"token": "xyz", "base_url": "http://evo"}),
        status="active",
        agent_id=agent_linked.id
    )
    db_session.add(conn)
    await db_session.commit()
    
    # 4. Mock Groq and Evolution Adapter
    # We mock groq_client.generate to capture the model name
    with patch("app.modules.evolution.handler.groq_client.generate", new=AsyncMock(return_value="AI Reply")) as mock_gen, \
         patch("app.modules.evolution.handler.EvolutionAdapter.send_message", new=AsyncMock()), \
         patch("app.modules.evolution.adapter.EvolutionAdapter.validate_webhook", return_value=True):
         
        # 5. Simulate incoming message
        payload = {
            "event": "messages.upsert",
            "instance": "test",
            "data": {
                "key": {"remoteJid": "123@s.whatsapp.net", "fromMe": False, "id": "msg123"},
                "message": {"conversation": "Hi"},
                "messageType": "conversation",
                "messageTimestamp": 123456789
            }
        }
        
        # Call the webhook endpoint
        response = await client.post(f"/webhook/evolution/{conn.id}", json=payload)
        
        assert response.status_code == 200
        
        # 6. Verify Agent Linked was used (model "gpt-linked")
        assert mock_gen.call_args.kwargs["model"] == "gpt-linked"

@pytest.mark.asyncio
async def test_evolution_falls_back_when_no_link_integration(client, db_session) -> None:
    """Verify that the evolution handler falls back to tenant default when no agent is linked."""
    # 1. Setup Tenant
    tenant = await _create_tenant(db_session)
    
    # 2. Setup an enabled agent (default)
    agent_default = AiAgent(
        id=uuid.uuid4(), 
        tenant_id=tenant.id, 
        name="Default Agent", 
        enabled=True, 
        model="gpt-default"
    )
    db_session.add(agent_default)
    await db_session.commit()
    
    # 3. Setup Connection WITHOUT linked agent
    conn = PlatformConnection(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        platform_type="evolution",
        display_name="Evolution Conn",
        credentials=encrypt({"token": "xyz", "base_url": "http://evo"}),
        status="active",
        agent_id=None # NO LINK
    )
    db_session.add(conn)
    await db_session.commit()
    
    # 4. Mock Groq and Evolution Adapter
    with patch("app.modules.evolution.handler.groq_client.generate", new=AsyncMock(return_value="AI Reply")) as mock_gen, \
         patch("app.modules.evolution.handler.EvolutionAdapter.send_message", new=AsyncMock()), \
         patch("app.modules.evolution.adapter.EvolutionAdapter.validate_webhook", return_value=True):
         
        # 5. Simulate incoming message
        payload = {
            "event": "messages.upsert",
            "instance": "test",
            "data": {
                "key": {"remoteJid": "123@s.whatsapp.net", "fromMe": False, "id": "msg123"},
                "message": {"conversation": "Hi"},
                "messageType": "conversation",
                "messageTimestamp": 123456789
            }
        }
        
        # Call the webhook endpoint
        response = await client.post(f"/webhook/evolution/{conn.id}", json=payload)
        
        assert response.status_code == 200
        
        # 6. Verify Default Agent was used (model "gpt-default")
        assert mock_gen.call_args.kwargs["model"] == "gpt-default"
