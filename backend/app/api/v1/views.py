import uuid
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user_id, get_db
from app.models.task import Task
from app.schemas.task import TaskRead
from app.api.v1.tasks import _task_query

router = APIRouter(prefix="/views", tags=["views"])


@router.get("/inbox", response_model=list[TaskRead])
async def view_inbox(
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    stmt = (
        _task_query()
        .where(Task.user_id == user_id, Task.project_id.is_(None), Task.is_completed.is_(False))
        .order_by(Task.sort_order, Task.created_at)
    )
    result = await db.execute(stmt)
    tasks = result.scalars().unique().all()
    return [TaskRead.from_orm_task(t) for t in tasks]


@router.get("/today", response_model=list[TaskRead])
async def view_today(
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    """Today's view, Todoist-style: anything due today *or overdue*
    (still incomplete) shows up here so nothing falls through the
    cracks - matching the plan's "overdue detection" feature."""
    today = date.today()
    stmt = (
        _task_query()
        .where(Task.user_id == user_id, Task.due_date <= today, Task.is_completed.is_(False))
        .order_by(Task.due_date, Task.priority, Task.sort_order)
    )
    result = await db.execute(stmt)
    tasks = result.scalars().unique().all()
    return [TaskRead.from_orm_task(t) for t in tasks]


@router.get("/upcoming", response_model=list[TaskRead])
async def view_upcoming(
    days: int = Query(default=7, ge=1, le=60),
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    """Next `days` days, starting tomorrow (today's tasks live in
    /views/today). Returned flat and sorted by due_date; the frontend
    groups them by date for display."""
    start = date.today() + timedelta(days=1)
    end = date.today() + timedelta(days=days)
    stmt = (
        _task_query()
        .where(
            Task.user_id == user_id,
            Task.due_date >= start,
            Task.due_date <= end,
            Task.is_completed.is_(False),
        )
        .order_by(Task.due_date, Task.priority, Task.sort_order)
    )
    result = await db.execute(stmt)
    tasks = result.scalars().unique().all()
    return [TaskRead.from_orm_task(t) for t in tasks]
