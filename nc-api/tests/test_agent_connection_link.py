"""Tests for Agent-Connection Link (SDD Implementation)."""

from __future__ import annotations

import uuid
import pytest
from app.modules.platform_connections.models import PlatformConnection

class TestPlatformConnectionAgentLinkModel:
    """Verify the agent_id field in PlatformConnection model."""

    def test_has_agent_id(self) -> None:
        """Test that agent_id field exists in the model."""
        # This will fail if agent_id is not defined in the model
        col = PlatformConnection.__table__.columns["agent_id"]
        assert col is not None
        assert col.nullable
        assert col.foreign_keys
        # Check that it points to ai_agents.id
        fk = list(col.foreign_keys)[0]
        assert fk.target_fullname == "ai_agents.id"

from app.modules.platform_connections.schemas import (
    PlatformConnectionCreate,
    PlatformConnectionUpdate,
    PlatformConnectionResponse,
)

class TestPlatformConnectionAgentLinkSchemas:
    """Verify agent_id in Pydantic schemas."""

    def test_create_schema_has_agent_id(self) -> None:
        data = {
            "tenant_id": uuid.uuid4(),
            "platform_type": "whatsapp",
            "display_name": "Test",
            "credentials": {"token": "x"},
            "agent_id": uuid.uuid4()
        }
        schema = PlatformConnectionCreate(**data)
        assert schema.agent_id == data["agent_id"]

    def test_create_schema_agent_id_none(self) -> None:
        data = {
            "tenant_id": uuid.uuid4(),
            "platform_type": "whatsapp",
            "display_name": "Test",
            "credentials": {"token": "x"},
            "agent_id": None
        }
        schema = PlatformConnectionCreate(**data)
        assert schema.agent_id is None

    def test_update_schema_has_agent_id(self) -> None:
        agent_id = uuid.uuid4()
        schema = PlatformConnectionUpdate(agent_id=agent_id)
        assert schema.agent_id == agent_id

    def test_response_schema_has_agent_id(self) -> None:
        data = {
            "id": uuid.uuid4(),
            "tenant_id": uuid.uuid4(),
            "platform_type": "whatsapp",
            "display_name": "Test",
            "extra_data": None,
            "status": "active",
            "is_primary": False,
            "agent_id": uuid.uuid4(),
            "created_at": "2026-05-27T10:00:00Z",
            "updated_at": "2026-05-27T10:00:00Z",
        }
        schema = PlatformConnectionResponse(**data)
        assert schema.agent_id == data["agent_id"]

from unittest.mock import AsyncMock, MagicMock, patch
from app.modules.evolution.handler import handle_evolution_incoming

@pytest.mark.asyncio
class TestEvolutionHandlerAgentResolution:
    """Verify agent resolution logic in evolution handler."""

    async def test_resolve_linked_agent(self) -> None:
        """Scenario: Resolve linked agent."""
        session = AsyncMock()
        connection = MagicMock(spec=PlatformConnection)
        connection.id = uuid.uuid4()
        connection.tenant_id = uuid.uuid4()
        connection.agent_id = uuid.uuid4()

        event = {
            "event": "messages.upsert",
            "instance": "test",
            "data": {
                "key": {"remoteJid": "123@s.whatsapp.net", "fromMe": False, "id": "msg123"},
                "pushName": "John",
                "message": {"conversation": "Hello"},
                "messageType": "conversation",
                "messageTimestamp": 123456789
            }
        }

        # Mock Tenant
        tenant = MagicMock()
        tenant.id = connection.tenant_id
        tenant.name = "Test Tenant"
        session.get.return_value = tenant

        # Mock linked agent
        linked_agent = MagicMock()
        linked_agent.id = connection.agent_id
        linked_agent.enabled = True
        linked_agent.model = "gpt-4"
        linked_agent.temperature = 0.7
        linked_agent.max_tokens = 1000
        linked_agent.business_config = {}

        # The first call to execute in the handler is for Conversation (line 71)
        # The second call is for history (line 107)
        # The third call is for Agent (line 137) - THIS is what we want to test
        # The fourth call is for Prompts (line 145)

        # We'll use side_effect to return different results for different queries
        mock_conversation = MagicMock()
        mock_conversation.id = uuid.uuid4()
        
        result_conv = MagicMock()
        result_conv.scalar_one_or_none.return_value = mock_conversation

        result_history = MagicMock()
        result_history.scalars.return_value.all.return_value = []

        result_agent = MagicMock()
        result_agent.scalar_one_or_none.return_value = linked_agent

        result_prompts = MagicMock()
        result_prompts.scalars.return_value.all.return_value = []

        session.execute.side_effect = [result_conv, result_history, result_agent, result_prompts]

        with patch("app.modules.evolution.handler.groq_client") as mock_groq, \
             patch("app.modules.evolution.handler.EvolutionAdapter") as mock_adapter:
            
            mock_groq.generate = AsyncMock(return_value="AI Response")
            mock_adapter.return_value.send_message = AsyncMock(return_value={"key": {"id": "out123"}})

            await handle_evolution_incoming(event, connection, session)

            # Verify that the agent query used agent_id
            # Agent query is the 3rd one
            agent_query = session.execute.call_args_list[2][0][0]
            # Verify agent_id was used in bind params
            params = agent_query.compile().params
            assert params["id_1"] == connection.agent_id
            
            # Verify groq was called with agent's model
            mock_groq.generate.assert_called_once()
            kwargs = mock_groq.generate.call_args.kwargs
            assert kwargs["model"] == "gpt-4"

from app.modules.platform_connections.service import create_connection, update_connection
from app.modules.agents.models import AiAgent
from fastapi import HTTPException

@pytest.mark.asyncio
class TestPlatformConnectionServiceValidation:
    """Verify agent_id validation in PlatformConnectionService."""

    async def test_create_connection_with_agent_id(self) -> None:
        """Test creating a connection with a valid agent_id."""
        db_session = AsyncMock()
        tenant_id = uuid.uuid4()
        agent_id = uuid.uuid4()
        
        data = PlatformConnectionCreate(
            tenant_id=tenant_id,
            platform_type="whatsapp",
            display_name="Test",
            credentials={"token": "x"},
            agent_id=agent_id
        )

        # Mock agent check
        mock_agent = MagicMock()
        mock_agent.tenant_id = tenant_id
        db_session.get.return_value = mock_agent

        with patch("app.modules.platform_connections.service.encrypt", return_value="enc"):
            conn = await create_connection(db_session, data)
            assert conn.agent_id == agent_id
            db_session.get.assert_called_with(AiAgent, agent_id)

    async def test_create_connection_with_invalid_agent_tenant(self) -> None:
        """Test creating a connection with an agent from another tenant."""
        db_session = AsyncMock()
        tenant_id = uuid.uuid4()
        other_tenant_id = uuid.uuid4()
        agent_id = uuid.uuid4()
        
        data = PlatformConnectionCreate(
            tenant_id=tenant_id,
            platform_type="whatsapp",
            display_name="Test",
            credentials={"token": "x"},
            agent_id=agent_id
        )

        # Mock agent from another tenant
        mock_agent = MagicMock()
        mock_agent.tenant_id = other_tenant_id
        db_session.get.return_value = mock_agent

        with pytest.raises(HTTPException) as exc:
            await create_connection(db_session, data)
        assert exc.value.status_code == 400
        assert "Agent belongs to a different tenant" in exc.value.detail

    async def test_update_connection_with_agent_id(self) -> None:
        """Test updating a connection with a valid agent_id."""
        db_session = AsyncMock()
        tenant_id = uuid.uuid4()
        agent_id = uuid.uuid4()
        
        connection = PlatformConnection(tenant_id=tenant_id)
        data = PlatformConnectionUpdate(agent_id=agent_id)

        # Mock agent check
        mock_agent = MagicMock()
        mock_agent.tenant_id = tenant_id
        db_session.get.return_value = mock_agent

        await update_connection(db_session, connection, data)
        assert connection.agent_id == agent_id

    async def test_update_connection_with_invalid_agent_tenant(self) -> None:
        """Test updating a connection with an agent from another tenant."""
        db_session = AsyncMock()
        tenant_id = uuid.uuid4()
        other_tenant_id = uuid.uuid4()
        agent_id = uuid.uuid4()
        
        connection = PlatformConnection(tenant_id=tenant_id)
        data = PlatformConnectionUpdate(agent_id=agent_id)

        # Mock agent from another tenant
        mock_agent = MagicMock()
        mock_agent.tenant_id = other_tenant_id
        db_session.get.return_value = mock_agent

        with pytest.raises(HTTPException) as exc:
            await update_connection(db_session, connection, data)
        assert exc.value.status_code == 400
        assert "Agent belongs to a different tenant" in exc.value.detail


    async def test_resolve_fallback_when_linked_disabled(self) -> None:
        """Scenario: Fallback to tenant default when linked agent is disabled."""
        session = AsyncMock()
        connection = MagicMock(spec=PlatformConnection)
        connection.id = uuid.uuid4()
        connection.tenant_id = uuid.uuid4()
        connection.agent_id = uuid.uuid4() # Linked but...

        event = {
            "event": "messages.upsert",
            "instance": "test",
            "data": {
                "key": {"remoteJid": "123@s.whatsapp.net", "fromMe": False, "id": "msg123"},
                "pushName": "John",
                "message": {"conversation": "Hello"},
                "messageType": "conversation",
                "messageTimestamp": 123456789
            }
        }

        # Mock Tenant
        tenant = MagicMock()
        tenant.id = connection.tenant_id
        tenant.name = "Test Tenant"
        session.get.return_value = tenant

        # Mock default agent
        default_agent = MagicMock()
        default_agent.id = uuid.uuid4()
        default_agent.enabled = True
        default_agent.model = "gpt-3.5-turbo"
        default_agent.temperature = 0.5
        default_agent.max_tokens = 500
        default_agent.business_config = {}

        mock_conversation = MagicMock()
        mock_conversation.id = uuid.uuid4()
        
        result_conv = MagicMock()
        result_conv.scalar_one_or_none.return_value = mock_conversation

        result_history = MagicMock()
        result_history.scalars.return_value.all.return_value = []

        # First call for agent: returns None (because we mock it as disabled in the query)
        result_linked_agent = MagicMock()
        result_linked_agent.scalar_one_or_none.return_value = None

        # Second call for agent: returns default_agent
        result_default_agent = MagicMock()
        result_default_agent.scalar_one_or_none.return_value = default_agent

        result_prompts = MagicMock()
        result_prompts.scalars.return_value.all.return_value = []

        session.execute.side_effect = [
            result_conv, 
            result_history, 
            result_linked_agent, # query with agent_id
            result_default_agent, # fallback query
            result_prompts
        ]

        with patch("app.modules.evolution.handler.groq_client") as mock_groq, \
             patch("app.modules.evolution.handler.EvolutionAdapter") as mock_adapter:
            
            mock_groq.generate = AsyncMock(return_value="AI Response")
            mock_adapter.return_value.send_message = AsyncMock(return_value={"key": {"id": "out123"}})

            await handle_evolution_incoming(event, connection, session)

            # 3rd call: query with agent_id
            agent_query_1 = session.execute.call_args_list[2][0][0]
            assert agent_query_1.compile().params["id_1"] == connection.agent_id
            
            # 4th call: fallback query without agent_id
            agent_query_2 = session.execute.call_args_list[3][0][0]
            assert "id_1" not in agent_query_2.compile().params
            
            # Verify groq was called with default agent's model
            mock_groq.generate.assert_called_once()
            kwargs = mock_groq.generate.call_args.kwargs
            assert kwargs["model"] == "gpt-3.5-turbo"
