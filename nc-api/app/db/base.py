"""SQLAlchemy declarative base + metadata.

DO NOT import models here — it creates circular imports.
Models import Base from this file, not the other way around.
Alembic discovers models via ``app.db.models`` (a separate import hub).
"""

from __future__ import annotations

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for all ORM models."""
