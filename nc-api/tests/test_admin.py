import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.tenants.models import Tenant
from app.modules.auth.models import User, UserRole
from app.modules.auth.user_tenant import UserTenant
from app.modules.auth.deps import get_current_user
from app.main import app
from sqlalchemy import select

def create_tenant(session, name, slug):
    tenant = Tenant(id=uuid.uuid4(), name=name, slug=slug, status="active", plan="basic", timezone="UTC", locale="en")
    session.add(tenant)
    return tenant

@pytest.mark.asyncio
async def test_assign_tenant_as_superadmin(client: AsyncClient, db_session: AsyncSession):
    # Setup
    tenant = create_tenant(db_session, "Omega", "omega")
    user_to_assign = User(id=uuid.uuid4(), email="john@doe.com", name="John Doe", password_hash="hash")
    db_session.add(user_to_assign)
    await db_session.commit()

    superadmin = User(id=uuid.uuid4(), email="super@test.com", name="Super", password_hash="hash")
    setattr(superadmin, "current_role", UserRole.SUPERADMIN)

    # Override auth
    async def mock_get_current_user():
        return superadmin
    app.dependency_overrides[get_current_user] = mock_get_current_user

    payload = {
        "user_id": str(user_to_assign.id),
        "tenant_id": str(tenant.id),
        "role": "agent"
    }
    response = await client.post("/api/v1/admin/assign-tenant", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"

    # Verify in DB
    result = await db_session.execute(
        select(UserTenant).where(
            UserTenant.user_id == user_to_assign.id,
            UserTenant.tenant_id == tenant.id
        )
    )
    assoc = result.scalar_one_or_none()
    assert assoc is not None
    assert assoc.role == "agent"
    assert assoc.is_primary is True


def override_current_user(mock_user: User) -> None:
    """Point get_current_user at a mock user (role context attached via setattr)."""
    async def _mock() -> User:
        return mock_user
    app.dependency_overrides[get_current_user] = _mock


def make_user(role: UserRole, email: str) -> User:
    return User(id=uuid.uuid4(), email=email, name=email.split("@")[0], password_hash="hash", role=role.value)


# ── PATCH /admin/users/{user_id} — role edit (R1) ─────────────────────────


@pytest.mark.asyncio
async def test_update_user_role_as_superadmin(client: AsyncClient, db_session: AsyncSession):
    target = make_user(UserRole.ADMIN, "target@test.com")
    db_session.add(target)
    await db_session.commit()

    superadmin = make_user(UserRole.SUPERADMIN, "super@test.com")
    setattr(superadmin, "current_role", UserRole.SUPERADMIN)
    override_current_user(superadmin)

    response = await client.patch(
        f"/api/v1/admin/users/{target.id}", json={"role": "client"}
    )

    assert response.status_code == 200
    assert response.json()["role"] == "client"

    await db_session.refresh(target)
    assert target.role == "client"


@pytest.mark.asyncio
async def test_update_user_role_forbidden_for_non_superadmin(client: AsyncClient, db_session: AsyncSession):
    target = make_user(UserRole.CLIENT, "target@test.com")
    db_session.add(target)
    await db_session.commit()

    admin = make_user(UserRole.ADMIN, "admin@test.com")
    setattr(admin, "current_role", UserRole.ADMIN)
    override_current_user(admin)

    response = await client.patch(
        f"/api/v1/admin/users/{target.id}", json={"role": "agent"}
    )

    assert response.status_code == 403

    await db_session.refresh(target)
    assert target.role == "client"


@pytest.mark.asyncio
async def test_update_user_role_self_edit_blocked(client: AsyncClient, db_session: AsyncSession):
    superadmin = make_user(UserRole.SUPERADMIN, "super@test.com")
    db_session.add(superadmin)
    await db_session.commit()

    setattr(superadmin, "current_role", UserRole.SUPERADMIN)
    override_current_user(superadmin)

    response = await client.patch(
        f"/api/v1/admin/users/{superadmin.id}", json={"role": "client"}
    )

    assert response.status_code == 403

    await db_session.refresh(superadmin)
    assert superadmin.role == "superadmin"


@pytest.mark.asyncio
async def test_update_user_role_last_superadmin_protected(client: AsyncClient, db_session: AsyncSession):
    # Target is the ONLY persisted superadmin. The caller passes the
    # superadmin guard via current_role context, but its persisted role is
    # admin — so demoting the target would leave zero superadmins.
    target = make_user(UserRole.SUPERADMIN, "target@test.com")
    db_session.add(target)
    await db_session.commit()

    caller = make_user(UserRole.ADMIN, "caller@test.com")
    setattr(caller, "current_role", UserRole.SUPERADMIN)
    override_current_user(caller)

    response = await client.patch(
        f"/api/v1/admin/users/{target.id}", json={"role": "client"}
    )

    assert response.status_code == 400
    assert "last superadmin" in response.json()["detail"].lower()

    await db_session.refresh(target)
    assert target.role == "superadmin"


@pytest.mark.asyncio
async def test_update_user_role_unknown_user(client: AsyncClient, db_session: AsyncSession):
    superadmin = make_user(UserRole.SUPERADMIN, "super@test.com")
    setattr(superadmin, "current_role", UserRole.SUPERADMIN)
    override_current_user(superadmin)

    response = await client.patch(
        f"/api/v1/admin/users/{uuid.uuid4()}", json={"role": "client"}
    )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_user_role_invalid_role_rejected(client: AsyncClient, db_session: AsyncSession):
    target = make_user(UserRole.CLIENT, "target@test.com")
    db_session.add(target)
    await db_session.commit()

    superadmin = make_user(UserRole.SUPERADMIN, "super@test.com")
    setattr(superadmin, "current_role", UserRole.SUPERADMIN)
    override_current_user(superadmin)

    response = await client.patch(
        f"/api/v1/admin/users/{target.id}", json={"role": "made-up"}
    )

    assert response.status_code == 422

    await db_session.refresh(target)
    assert target.role == "client"


# ── POST /admin/users — superadmin-grant policy (R2) ──────────────────────


@pytest.mark.asyncio
async def test_non_superadmin_cannot_create_superadmin(client: AsyncClient, db_session: AsyncSession):
    admin = make_user(UserRole.ADMIN, "admin@test.com")
    setattr(admin, "current_role", UserRole.ADMIN)
    override_current_user(admin)

    response = await client.post(
        "/api/v1/admin/users",
        json={
            "email": "escalated@test.com",
            "password": "secret123",
            "name": "Escalated",
            "role": "superadmin",
        },
    )

    assert response.status_code == 403

    result = await db_session.execute(
        select(User).where(User.role == UserRole.SUPERADMIN.value)
    )
    assert result.scalars().first() is None


@pytest.mark.asyncio
async def test_assign_tenant_unauthorized_agent(client: AsyncClient, db_session: AsyncSession):
    # Setup
    tenant = create_tenant(db_session, "Omega", "omega")
    user_to_assign = User(id=uuid.uuid4(), email="john@doe.com", name="John Doe", password_hash="hash")
    db_session.add(user_to_assign)
    await db_session.commit()

    agent_user = User(id=uuid.uuid4(), email="agent@test.com", name="Agent", password_hash="hash")
    setattr(agent_user, "current_role", UserRole.AGENT)

    # Override auth
    async def mock_get_current_user():
        return agent_user
    app.dependency_overrides[get_current_user] = mock_get_current_user

    payload = {
        "user_id": str(user_to_assign.id),
        "tenant_id": str(tenant.id),
        "role": "agent"
    }
    response = await client.post("/api/v1/admin/assign-tenant", json=payload)

    assert response.status_code == 403
