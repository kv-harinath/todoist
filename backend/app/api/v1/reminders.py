import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user_id, get_db
from app.models.reminder import Reminder
from app.models.task import Task
from app.schemas.reminder import ReminderCreate, ReminderRead

router = APIRouter(prefix="/reminders", tags=["reminders"])


async def _read(reminder: Reminder, db: AsyncSession) -> ReminderRead:
    task = await db.get(Task, reminder.task_id)
    data = ReminderRead.model_validate(reminder)
    data.task_content = task.content if task else None
    return data


async def _get_owned(reminder_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession) -> Reminder:
    reminder = await db.get(Reminder, reminder_id)
    if reminder is None or reminder.user_id != user_id:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return reminder


@router.get("", response_model=list[ReminderRead])
async def list_reminders(
    task_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    stmt = select(Reminder).where(Reminder.user_id == user_id).order_by(Reminder.remind_at)
    if task_id is not None:
        stmt = stmt.where(Reminder.task_id == task_id)
    result = await db.execute(stmt)
    return [await _read(r, db) for r in result.scalars().all()]


@router.get("/due", response_model=list[ReminderRead])
async def due_reminders(
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    """Reminders whose time has passed, not yet dismissed, on open tasks."""
    stmt = (
        select(Reminder)
        .join(Task, Task.id == Reminder.task_id)
        .where(
            Reminder.user_id == user_id,
            Reminder.is_dismissed.is_(False),
            Reminder.remind_at <= datetime.now(timezone.utc),
            Task.is_completed.is_(False),
        )
        .order_by(Reminder.remind_at)
    )
    result = await db.execute(stmt)
    return [await _read(r, db) for r in result.scalars().all()]


@router.post("", response_model=ReminderRead, status_code=201)
async def create_reminder(
    payload: ReminderCreate,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    task = await db.get(Task, payload.task_id)
    if task is None or task.user_id != user_id:
        raise HTTPException(status_code=404, detail="Task not found")
    remind_at = payload.remind_at
    if remind_at.tzinfo is None:
        remind_at = remind_at.replace(tzinfo=timezone.utc)
    reminder = Reminder(
        user_id=user_id,
        task_id=task.id,
        remind_at=remind_at,
        via_email=payload.via_email,
        via_push=payload.via_push,
    )
    db.add(reminder)
    await db.commit()
    await db.refresh(reminder)
    return await _read(reminder, db)


@router.post("/{reminder_id}/dismiss", response_model=ReminderRead)
async def dismiss_reminder(
    reminder_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    reminder = await _get_owned(reminder_id, user_id, db)
    reminder.is_dismissed = True
    await db.commit()
    await db.refresh(reminder)
    return await _read(reminder, db)


@router.delete("/{reminder_id}", status_code=204)
async def delete_reminder(
    reminder_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    reminder = await _get_owned(reminder_id, user_id, db)
    await db.delete(reminder)
    await db.commit()
