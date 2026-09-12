import uuid

from pydantic import BaseModel, ConfigDict


class LabelCreate(BaseModel):
    name: str
    color: str = "#808080"


class LabelUpdate(BaseModel):
    name: str | None = None
    color: str | None = None


class LabelRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    color: str
