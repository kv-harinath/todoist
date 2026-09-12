import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user_id, get_db
from app.models.filter import Filter
from app.models.label import Label
from app.models.project import Project
from app.models.task import Task
from app.models.task_label import TaskLabel
from app.schemas.common import ReorderRequest
from app.schemas.task import TaskCreate, TaskRead, TaskUpdate
from app.services.filters import parse_filter_query
from app.services.recurrence import InvalidRecurrenceRule, compute_next_due_date

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _task_query():
    return select(Task).options(selectinload(Task.labels).selectinload(TaskLabel.label))


async def _get_owned_task(task_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession) -> Task:
    result = await db.execute(_task_query().where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if task is None or task.user_id != user_id:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


async def _valid_label_ids(label_ids: list[uuid.UUID], user_id: uuid.UUID, db: AsyncSession) -> set[uuid.UUID]:
    if not label_ids:
        return set()
    result = await db.execute(select(Label.id).where(Label.user_id == user_id, Label.id.in_(label_ids)))
    return set(result.scalars().all())


async def _add_labels(task_id: uuid.UUID, label_ids: list[uuid.UUID] | None, user_id: uuid.UUID, db: AsyncSession):
    """For a brand-new task: no existing TaskLabel rows to diff against,
    so this just inserts - no need to touch task.labels (which would
    otherwise trigger an unawaited lazy-load under the async engine,
    see _replace_labels)."""
    if not label_ids:
        return
    valid_ids = await _valid_label_ids(label_ids, user_id, db)
    for label_id in valid_ids:
        db.add(TaskLabel(task_id=task_id, label_id=label_id))


async def _replace_labels(task: Task, label_ids: list[uuid.UUID] | None, user_id: uuid.UUID, db: AsyncSession):
    """For an existing task: diffs against task.labels. Callers must
    have loaded `task` via _task_query()/_get_owned_task() (which
    eager-loads labels with selectinload) before calling this - reading
    task.labels on a task that wasn't loaded that way triggers an
    implicit lazy-load, which SQLAlchemy's async engine can't do here
    and raises MissingGreenlet."""
    if label_ids is None:
        return
    valid_ids = await _valid_label_ids(label_ids, user_id, db)
    for existing in list(task.labels):
        if existing.label_id not in valid_ids:
            await db.delete(existing)
    current_ids = {tl.label_id for tl in task.labels if tl.label_id in valid_ids}
    for label_id in valid_ids - current_ids:
        db.add(TaskLabel(task_id=task.id, label_id=label_id))


@router.get("", response_model=list[TaskRead])
async def list_tasks(
    project_id: uuid.UUID | None = None,
    label_id: uuid.UUID | None = None,
    due: date | None = None,
    completed: bool | None = None,
    filter_id: uuid.UUID | None = None,
    q: str | None = Query(default=None, description="search task content"),
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    stmt = _task_query().where(Task.user_id == user_id)

    if project_id is not None:
        stmt = stmt.where(Task.project_id == project_id)
    if label_id is not None:
        stmt = stmt.where(Task.labels.any(TaskLabel.label_id == label_id))
    if due is not None:
        stmt = stmt.where(Task.due_date == due)
    if completed is not None:
        stmt = stmt.where(Task.is_completed == completed)
    if q:
        stmt = stmt.where(Task.content.ilike(f"%{q}%"))

    if filter_id is not None:
        saved_filter = await db.get(Filter, filter_id)
        if saved_filter is None or saved_filter.user_id != user_id:
            raise HTTPException(status_code=404, detail="Filter not found")
        parsed = parse_filter_query(saved_filter.query)
        today = date.today()

        if parsed.priorities:
            stmt = stmt.where(Task.priority.in_(parsed.priorities))
        if parsed.overdue:
            stmt = stmt.where(Task.due_date < today, Task.is_completed.is_(False))
        if parsed.due_today:
            stmt = stmt.where(Task.due_date == today)
        if parsed.no_date:
            stmt = stmt.where(Task.due_date.is_(None))
        if parsed.completed is not None:
            stmt = stmt.where(Task.is_completed == parsed.completed)
        if parsed.label_names:
            stmt = stmt.where(
                Task.labels.any(TaskLabel.label.has(func.lower(Label.name).in_([n.lower() for n in parsed.label_names])))
            )
        if parsed.project_names:
            stmt = stmt.where(
                Task.project.has(func.lower(Project.name).in_([n.lower() for n in parsed.project_names]))
            )

    stmt = stmt.order_by(Task.sort_order, Task.created_at)
    result = await db.execute(stmt)
    tasks = result.scalars().unique().all()
    return [TaskRead.from_orm_task(t) for t in tasks]


@router.post("", response_model=TaskRead, status_code=201)
async def create_task(
    payload: TaskCreate,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    data = payload.model_dump(exclude={"label_ids"})
    max_sort = await db.scalar(select(func.max(Task.sort_order)).where(Task.user_id == user_id))
    task = Task(user_id=user_id, sort_order=(max_sort or 0) + 1, **data)
    db.add(task)
    await db.flush()
    await _add_labels(task.id, payload.label_ids, user_id, db)
    await db.commit()
    return await _get_owned_task(task.id, user_id, db)


@router.get("/{task_id}", response_model=TaskRead)
async def get_task(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    task = await _get_owned_task(task_id, user_id, db)
    return TaskRead.from_orm_task(task)


@router.patch("/{task_id}", response_model=TaskRead)
async def update_task(
    task_id: uuid.UUID,
    payload: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    task = await _get_owned_task(task_id, user_id, db)
    updates = payload.model_dump(exclude_unset=True, exclude={"label_ids"})
    for field, value in updates.items():
        setattr(task, field, value)
    if "label_ids" in payload.model_fields_set:
        await _replace_labels(task, payload.label_ids, user_id, db)
    await db.commit()
    task = await _get_owned_task(task_id, user_id, db)
    return TaskRead.from_orm_task(task)


@router.delete("/{task_id}", status_code=204)
async def delete_task(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    task = await _get_owned_task(task_id, user_id, db)
    await db.delete(task)
    await db.commit()


@router.post("/{task_id}/complete", response_model=TaskRead)
async def complete_task(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    task = await _get_owned_task(task_id, user_id, db)
    now = datetime.now(timezone.utc)

    if task.is_recurring and task.recurrence_rule:
        try:
            task.due_date = compute_next_due_date(task.due_date, task.recurrence_rule)
        except InvalidRecurrenceRule:
            raise HTTPException(status_code=422, detail=f"Invalid recurrence rule: {task.recurrence_rule!r}")
        # Rolls forward onto the same row rather than completing it -
        # see app/services/recurrence.py. We still stamp completed_at so
        # "last completed" is visible, even though is_completed stays False.
        task.completed_at = now
    else:
        task.is_completed = True
        task.completed_at = now

    await db.commit()
    task = await _get_owned_task(task_id, user_id, db)
    return TaskRead.from_orm_task(task)


@router.post("/{task_id}/reopen", response_model=TaskRead)
async def reopen_task(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    task = await _get_owned_task(task_id, user_id, db)
    task.is_completed = False
    task.completed_at = None
    await db.commit()
    task = await _get_owned_task(task_id, user_id, db)
    return TaskRead.from_orm_task(task)


@router.patch("/{task_id}/reorder", response_model=TaskRead)
async def reorder_task(
    task_id: uuid.UUID,
    payload: ReorderRequest,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    task = await _get_owned_task(task_id, user_id, db)
    task.sort_order = payload.sort_order
    await db.commit()
    task = await _get_owned_task(task_id, user_id, db)
    return TaskRead.from_orm_task(task)
