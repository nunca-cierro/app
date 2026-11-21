"""Engine module — platform-agnostic conversation orchestration."""

from app.modules.engine.schemas import (
    ChannelAdapter,
    HandoffEvent,
    InboundMessage,
    OutboundMessage,
)
from app.modules.engine.service import EngineService, engine_service

__all__ = [
    "ChannelAdapter",
    "EngineService",
    "HandoffEvent",
    "InboundMessage",
    "OutboundMessage",
    "engine_service",
]
