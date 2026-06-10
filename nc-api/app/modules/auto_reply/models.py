"""AutoReply ORM model — programmed keyword-based responses for Basic/Trial plans."""
from __future__ import annotations
import uuid
from datetime import UTC, datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class AutoReply(Base):
    __tablename__ = "auto_replies"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    keywords: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    match_type: Mapped[str] = mapped_column(String(20), nullable=False, default="any")
    response_text: Mapped[str] = mapped_column(Text, nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    priority: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))
    
    tenant = relationship("Tenant", back_populates="auto_replies")
    
    def __repr__(self) -> str:
        return f"<AutoReply {self.id} | tenant={self.tenant_id} | keywords={self.keywords}>"
