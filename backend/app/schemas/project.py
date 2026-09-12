import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ProjectBase(BaseModel):
    name: str
    color: str = "#808080"
    parent_project_id: uuid.UUID | None = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: str | None = None
    color: str | None = None
    is_favorite: bool | None = None
    parent_project_id: uuid.UUID | None = None


class ProjectRead(ProjectBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    is_favorite: bool
    sort_order: int
    created_at: datetime
