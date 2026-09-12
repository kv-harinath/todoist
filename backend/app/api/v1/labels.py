import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user_id, get_db
from app.models.label import Label
from app.schemas.label import LabelCreate, LabelRead, LabelUpdate

router = APIRouter(prefix="/labels", tags=["labels"])


async def _get_owned_label(label_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession) -> Label:
    label = await db.get(Label, label_id)
    if label is None or label.user_id != user_id:
        raise HTTPException(status_code=404, detail="Label not found")
    return label


@router.get("", response_model=list[LabelRead])
async def list_labels(
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    result = await db.execute(select(Label).where(Label.user_id == user_id).order_by(Label.name))
    return result.scalars().all()


@router.post("", response_model=LabelRead, status_code=201)
async def create_label(
    payload: LabelCreate,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    label = Label(user_id=user_id, **payload.model_dump())
    db.add(label)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="A label with this name already exists")
    await db.refresh(label)
    return label


@router.patch("/{label_id}", response_model=LabelRead)
async def update_label(
    label_id: uuid.UUID,
    payload: LabelUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    label = await _get_owned_label(label_id, user_id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(label, field, value)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="A label with this name already exists")
    await db.refresh(label)
    return label


@router.delete("/{label_id}", status_code=204)
async def delete_label(
    label_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    label = await _get_owned_label(label_id, user_id, db)
    await db.delete(label)
    await db.commit()
