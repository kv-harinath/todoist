import uuid
from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user_id, get_db
from app.models.task import Task
from app.schemas.stats import StatsSummary

router = APIRouter(prefix="/stats", tags=["stats"])


async def _compute_streak(db: AsyncSession, user_id: uuid.UUID) -> int:
    """Consecutive-day streak of having completed at least one task,
    counting back from today. A lightweight stand-in for Todoist's full
    Karma system (plan section 2/9 explicitly scope this down)."""
    today = date.today()
    cutoff = today - timedelta(days=400)
    result = await db.execute(
        select(func.date(Task.completed_at))
        .where(Task.user_id == user_id, Task.is_completed.is_(True), Task.completed_at >= cutoff)
        .distinct()
    )
    completed_dates = set(result.scalars().all())

    streak = 0
    day = today
    if day not in completed_dates:
        day -= timedelta(days=1)
    while day in completed_dates:
        streak += 1
        day -= timedelta(days=1)
    return streak


@router.get("/summary", response_model=StatsSummary)
async def stats_summary(
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    today = date.today()
    start_of_week = today - timedelta(days=today.weekday())  # Monday

    completed_today = await db.scalar(
        select(func.count(Task.id)).where(
            Task.user_id == user_id,
            Task.is_completed.is_(True),
            func.date(Task.completed_at) == today,
        )
    )
    completed_this_week = await db.scalar(
        select(func.count(Task.id)).where(
            Task.user_id == user_id,
            Task.is_completed.is_(True),
            func.date(Task.completed_at) >= start_of_week,
        )
    )
    streak = await _compute_streak(db, user_id)

    return StatsSummary(
        completed_today=completed_today or 0,
        completed_this_week=completed_this_week or 0,
        streak=streak,
    )
