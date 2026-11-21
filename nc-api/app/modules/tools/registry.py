"""Tool registry and execution engine for LLM function calling with Pydantic validation."""

from __future__ import annotations

import inspect
import json
import typing as t
from dataclasses import dataclass, field
from loguru import logger
from pydantic import BaseModel


@dataclass
class ToolContext:
    """Execution context injected into tools when called by the agent graph."""

    tenant_id: str
    conversation_id: str
    platform: str
    external_user_id: str
    tenant_name: str
    business_config: dict[str, t.Any] = field(default_factory=dict)
    handoff_requested: bool = False
    handoff_reason: str | None = None
    metadata: dict[str, t.Any] = field(default_factory=dict)


@dataclass
class RegisteredTool:
    """Internal metadata and schema for a registered tool."""

    name: str
    description: str
    args_schema: type[BaseModel]
    handler: t.Callable[..., t.Coroutine[t.Any, t.Any, str]]

    def to_openai_spec(self) -> dict[str, t.Any]:
        """Convert Pydantic model to OpenAI Function Calling spec."""
        schema = self.args_schema.model_json_schema()
        # Clean up JSON schema titles for LLM compatibility
        schema.pop("title", None)
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": schema,
            },
        }


class ToolRegistry:
    """Registry managing available Pydantic tools and their execution."""

    def __init__(self) -> None:
        self._tools: dict[str, RegisteredTool] = {}

    def register(
        self,
        name: str,
        description: str,
        args_schema: type[BaseModel],
    ) -> t.Callable[[t.Callable[..., t.Coroutine[t.Any, t.Any, str]]], t.Callable[..., t.Coroutine[t.Any, t.Any, str]]]:
        """Decorator to register a tool handler function with explicit Pydantic schema."""

        def decorator(
            func: t.Callable[..., t.Coroutine[t.Any, t.Any, str]]
        ) -> t.Callable[..., t.Coroutine[t.Any, t.Any, str]]:
            self._tools[name] = RegisteredTool(
                name=name,
                description=description,
                args_schema=args_schema,
                handler=func,
            )
            return func

        return decorator

    def get_tool(self, name: str) -> RegisteredTool | None:
        """Lookup a registered tool by its function name."""
        return self._tools.get(name)

    def get_all_openai_specs(self) -> list[dict[str, t.Any]]:
        """Return all registered tools as an OpenAI-compatible function calling list."""
        return [tool.to_openai_spec() for tool in self._tools.values()]

    async def execute(
        self,
        tool_name: str,
        arguments: dict[str, t.Any] | str,
        context: ToolContext,
    ) -> str:
        """Validate arguments against Pydantic schema and execute tool asynchronously.

        Args:
            tool_name: Function name to invoke.
            arguments: Dict or raw JSON string of arguments from the LLM.
            context: Injected runtime context.

        Returns:
            Tool output string to be fed back to the LLM or caller.
        """
        tool = self._tools.get(tool_name)
        if not tool:
            logger.warning("Attempted to execute unregistered tool: {name}", name=tool_name)
            return f"Error: Tool '{tool_name}' no está registrada en el sistema."

        if isinstance(arguments, str):
            try:
                parsed_args = json.loads(arguments) if arguments.strip() else {}
            except Exception as exc:
                logger.warning("Failed to parse tool JSON arguments: {e}", e=exc)
                return f"Error: argumentos JSON inválidos para {tool_name}."
        else:
            parsed_args = arguments

        try:
            validated = tool.args_schema.model_validate(parsed_args)
        except Exception as exc:
            logger.warning("Tool argument validation failed for {name}: {e}", name=tool_name, e=exc)
            return f"Error de validación de parámetros para {tool_name}: {exc}"

        logger.info(
            "Executing tool | name={name} | tenant={tid} | conv={cid}",
            name=tool_name,
            tid=context.tenant_id,
            cid=context.conversation_id,
        )

        try:
            # Check handler signature to see if it accepts context
            sig = inspect.signature(tool.handler)
            if "context" in sig.parameters:
                result = await tool.handler(validated, context=context)
            else:
                result = await tool.handler(validated)
            return str(result)
        except Exception as exc:
            logger.error("Tool execution failed for {name}: {e}", name=tool_name, e=exc)
            return f"Error al ejecutar la herramienta {tool_name}: {exc}"


tool_registry = ToolRegistry()
