import uuid
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user_id, get_db
from app.models.completion_event import CompletionEvent
from app.models.user import User
from app.schemas.stats import DayCount, GoalsUpdate, StatsSummary
from app.services import stats as stats_service

router = APIRouter(prefix="/stats", tags=["stats"])


async def _daily_counts(db: AsyncSession, user_id: uuid.UUID) -> dict[date, int]:
    """Completions per day from the completion_events history."""
    day = func.date(CompletionEvent.completed_at)
    rows = await db.execute(
        select(day, func.count()).where(CompletionEvent.user_id == user_id).group_by(day)
    )
    return {d: n for d, n in rows.all()}


async def _get_user(db: AsyncSession, user_id: uuid.UUID) -> User:
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _summary(user: User, counts: dict[date, int], today: date) -> StatsSummary:
    days_off = stats_service.parse_days_off(user.days_off)
    start_of_week = stats_service.week_start(today)
    points = stats_service.karma_points(counts, user.daily_goal, user.weekly_goal)
    level, next_at = stats_service.karma_level(points)
    return StatsSummary(
        completed_today=counts.get(today, 0),
        completed_this_week=sum(n for d, n in counts.items() if d >= start_of_week),
        # Plain streak: consecutive days with at least one completion.
        streak=stats_service.daily_goal_streak(counts, today, 1, days_off, user.vacation_mode),
        daily_goal=user.daily_goal,
        weekly_goal=user.weekly_goal,
        daily_goal_streak=stats_service.daily_goal_streak(counts, today, user.daily_goal, days_off, user.vacation_mode),
        weekly_goal_streak=stats_service.weekly_goal_streak(counts, today, user.weekly_goal),
        karma=points,
        karma_level=level,
        karma_next_level_at=next_at,
        last_7_days=[
            DayCount(date=(today - timedelta(days=i)).isoformat(), count=counts.get(today - timedelta(days=i), 0))
            for i in range(6, -1, -1)
        ],
        days_off=sorted(days_off),
        vacation_mode=user.vacation_mode,
    )


@router.get("/summary", response_model=StatsSummary)
async def stats_summary(
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    user = await _get_user(db, user_id)
    return _summary(user, await _daily_counts(db, user_id), date.today())


@router.patch("/goals", response_model=StatsSummary)
async def update_goals(
    payload: GoalsUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    user = await _get_user(db, user_id)
    if payload.daily_goal is not None:
        user.daily_goal = payload.daily_goal
    if payload.weekly_goal is not None:
        user.weekly_goal = payload.weekly_goal
    if payload.days_off is not None:
        if any(d < 0 or d > 6 for d in payload.days_off):
            raise HTTPException(status_code=422, detail="days_off values must be 0 (Mon) to 6 (Sun)")
        user.days_off = ",".join(str(d) for d in sorted(set(payload.days_off)))
    if payload.vacation_mode is not None:
        user.vacation_mode = payload.vacation_mode
    await db.commit()
    return _summary(user, await _daily_counts(db, user_id), date.today())
