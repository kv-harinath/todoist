import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user_id, get_db
from app.models.filter import Filter
from app.schemas.filter import FilterCreate, FilterRead, FilterUpdate

router = APIRouter(prefix="/filters", tags=["filters"])


async def _get_owned_filter(filter_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession) -> Filter:
    saved_filter = await db.get(Filter, filter_id)
    if saved_filter is None or saved_filter.user_id != user_id:
        raise HTTPException(status_code=404, detail="Filter not found")
    return saved_filter


@router.get("", response_model=list[FilterRead])
async def list_filters(
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    result = await db.execute(select(Filter).where(Filter.user_id == user_id).order_by(Filter.name))
    return result.scalars().all()


@router.post("", response_model=FilterRead, status_code=201)
async def create_filter(
    payload: FilterCreate,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    saved_filter = Filter(user_id=user_id, **payload.model_dump())
    db.add(saved_filter)
    await db.commit()
    await db.refresh(saved_filter)
    return saved_filter


@router.patch("/{filter_id}", response_model=FilterRead)
async def update_filter(
    filter_id: uuid.UUID,
    payload: FilterUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    saved_filter = await _get_owned_filter(filter_id, user_id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(saved_filter, field, value)
    await db.commit()
    await db.refresh(saved_filter)
    return saved_filter


@router.delete("/{filter_id}", status_code=204)
async def delete_filter(
    filter_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    saved_filter = await _get_owned_filter(filter_id, user_id, db)
    await db.delete(saved_filter)
    await db.commit()
