import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Reminder(Base):
    __tablename__ = "reminders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    task_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), index=True
    )
    remind_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    is_dismissed: Mapped[bool] = mapped_column(Boolean, default=False)
    # Extra delivery channels (the in-app toast is always shown). A channel
    # is sent once: *_sent_at is stamped by the reminder worker on success.
    via_email: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    via_push: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    email_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    push_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
