import uuid

from pydantic import BaseModel, ConfigDict


class FilterCreate(BaseModel):
    name: str
    query: str
    color: str = "#808080"


class FilterUpdate(BaseModel):
    name: str | None = None
    query: str | None = None
    color: str | None = None


class FilterRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    query: str
    color: str
