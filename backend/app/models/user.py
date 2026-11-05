import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), default="")
    display_name: Mapped[str] = mapped_column(String(255), default="")
    theme: Mapped[str] = mapped_column(String(20), default="light")
    # Productivity goals (Stats page); days_off is a CSV of weekday numbers, Monday=0.
    daily_goal: Mapped[int] = mapped_column(Integer, default=5, server_default="5")
    weekly_goal: Mapped[int] = mapped_column(Integer, default=30, server_default="30")
    days_off: Mapped[str] = mapped_column(String(20), default="", server_default="")
    vacation_mode: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
