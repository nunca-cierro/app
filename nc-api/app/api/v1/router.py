"""v1 API router — aggregates all module endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.v1.auth import router as auth_router
from app.api.v1.admin import router as admin_router
from app.api.v1.tenants import router as tenants_router
from app.api.v1.whatsapp_numbers import router as whatsapp_router
from app.api.v1.agents import router as agents_router
from app.api.v1.conversations import router as conversations_router
from app.api.v1.metrics import router as metrics_router
from app.api.v1.platform_connections import router as platform_connections_router
from app.api.v1.agent_templates import router as agent_templates_router
from app.modules.auth.deps import get_current_user

router = APIRouter(prefix="/api/v1")

# Auth endpoints are public (register, login)
router.include_router(auth_router)

# All admin/domain endpoints require authentication
admin_deps = [Depends(get_current_user)]

# Admin endpoints (SaaS wide management)
router.include_router(admin_router, dependencies=admin_deps)

# Domain endpoints
router.include_router(tenants_router, dependencies=admin_deps)
router.include_router(whatsapp_router, dependencies=admin_deps)
router.include_router(agents_router, dependencies=admin_deps)
router.include_router(conversations_router, dependencies=admin_deps)
router.include_router(metrics_router, dependencies=admin_deps)
router.include_router(platform_connections_router, dependencies=admin_deps)
router.include_router(agent_templates_router, dependencies=admin_deps)
