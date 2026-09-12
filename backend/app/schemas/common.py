import uuid

from pydantic import BaseModel


class ReorderRequest(BaseModel):
    sort_order: int


class OrderedIdsRequest(BaseModel):
    """Bulk reorder: full ordered list of ids for a sibling group."""

    ids: list[uuid.UUID]
