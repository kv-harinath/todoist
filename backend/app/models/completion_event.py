import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CompletionEvent(Base):
    """One row per task completion, so recurring tasks (which roll forward
    on the same row) and later reopen/delete still keep stats history."""

    __tablename__ = "completion_events"
    __table_args__ = (Index("ix_completion_events_user_completed", "user_id", "completed_at"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    task_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True, index=True
    )
    task_content: Mapped[str] = mapped_column(String(500), default="")
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
