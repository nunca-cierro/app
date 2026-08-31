from app.modules.auth.models import UserRole, TenantStatus
from app.modules.auth.user_tenant import UserTenant
import uuid

def test_user_role_enum():
    """Role model is exactly 3 values — agent was dropped (UR-1)."""
    assert UserRole.SUPERADMIN == "superadmin"
    assert UserRole.ADMIN == "admin"
    assert UserRole.CLIENT == "client"
    assert set(UserRole) == {
        UserRole.SUPERADMIN,
        UserRole.ADMIN,
        UserRole.CLIENT,
    }
    assert {r.value for r in UserRole} == {"superadmin", "admin", "client"}


def test_user_tenant_role_default_is_client():
    """user_tenants.role default is CLIENT, not AGENT (UR-2)."""
    default = UserTenant.__table__.c.role.default.arg
    assert default == UserRole.CLIENT

def test_tenant_status_enum():
    assert TenantStatus.ACTIVE == "active"
    assert TenantStatus.INACTIVE == "inactive"
    assert TenantStatus.SUSPENDED == "suspended"

def test_user_tenant_model_structure():
    user_id = uuid.uuid4()
    tenant_id = uuid.uuid4()
    ut = UserTenant(
        user_id=user_id,
        tenant_id=tenant_id,
        role=UserRole.ADMIN,
        is_primary=True
    )
    assert ut.user_id == user_id
    assert ut.tenant_id == tenant_id
    assert ut.role == UserRole.ADMIN
    assert ut.is_primary is True
