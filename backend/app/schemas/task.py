import uuid
from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict

from app.schemas.label import LabelRead


class TaskBase(BaseModel):
    content: str
    description: str = ""
    priority: int = 4
    project_id: uuid.UUID | None = None
    section_id: uuid.UUID | None = None
    parent_task_id: uuid.UUID | None = None
    due_date: date | None = None
    due_time: time | None = None
    is_recurring: bool = False
    recurrence_rule: str | None = None


class TaskCreate(TaskBase):
    label_ids: list[uuid.UUID] = []


class TaskUpdate(BaseModel):
    content: str | None = None
    description: str | None = None
    priority: int | None = None
    project_id: uuid.UUID | None = None
    section_id: uuid.UUID | None = None
    parent_task_id: uuid.UUID | None = None
    due_date: date | None = None
    due_time: time | None = None
    is_recurring: bool | None = None
    recurrence_rule: str | None = None
    label_ids: list[uuid.UUID] | None = None


class TaskRead(TaskBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    is_completed: bool
    completed_at: datetime | None
    sort_order: int
    created_at: datetime
    updated_at: datetime
    labels: list[LabelRead] = []

    @classmethod
    def from_orm_task(cls, task) -> "TaskRead":
        data = {
            **{k: getattr(task, k) for k in TaskBase.model_fields},
            "id": task.id,
            "is_completed": task.is_completed,
            "completed_at": task.completed_at,
            "sort_order": task.sort_order,
            "created_at": task.created_at,
            "updated_at": task.updated_at,
            "labels": [tl.label for tl in task.labels],
        }
        return cls.model_validate(data)
