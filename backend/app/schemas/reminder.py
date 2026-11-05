import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ReminderCreate(BaseModel):
    task_id: uuid.UUID
    remind_at: datetime
    via_email: bool = False
    via_push: bool = False


class ReminderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    task_id: uuid.UUID
    remind_at: datetime
    is_dismissed: bool
    via_email: bool = False
    via_push: bool = False
    email_sent_at: datetime | None = None
    push_sent_at: datetime | None = None
    task_content: str | None = None
