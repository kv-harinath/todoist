import uuid

from pydantic import BaseModel, ConfigDict


class SectionCreate(BaseModel):
    name: str


class SectionUpdate(BaseModel):
    name: str | None = None


class SectionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    sort_order: int
