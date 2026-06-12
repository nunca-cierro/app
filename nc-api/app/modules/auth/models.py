"""User ORM model — SaaS operators (admin)."""

from __future__ import annotations

import enum
import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class UserRole(str, enum.Enum):
    SUPERADMIN = "superadmin"
    ADMIN = "admin"
    AGENT = "agent"
    CLIENT = "client"


class TenantStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    ACTIVE = "active"
    OVERDUE = "overdue"
    SUSPENDED = "suspended"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        String(20), nullable=False, default=UserRole.CLIENT
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    # relationships
    tenant_associations: Mapped[list["UserTenant"]] = relationship(
        "UserTenant", back_populates="user", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User {self.email}>"
