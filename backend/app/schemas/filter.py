import uuid

from pydantic import BaseModel, ConfigDict


class FilterCreate(BaseModel):
    name: str
    query: str
    color: str = "#808080"
    description: str = ""


class FilterUpdate(BaseModel):
    name: str | None = None
    query: str | None = None
    color: str | None = None
    description: str | None = None


class FilterRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    query: str
    color: str
    description: str = ""
