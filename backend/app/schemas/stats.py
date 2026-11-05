from pydantic import BaseModel, Field


class DayCount(BaseModel):
    date: str
    count: int


class StatsSummary(BaseModel):
    completed_today: int
    completed_this_week: int
    streak: int
    daily_goal: int = 5
    weekly_goal: int = 30
    daily_goal_streak: int = 0
    weekly_goal_streak: int = 0
    karma: int = 0
    karma_level: str = "Beginner"
    karma_next_level_at: int | None = 500
    last_7_days: list[DayCount] = []
    days_off: list[int] = []
    vacation_mode: bool = False


class GoalsUpdate(BaseModel):
    daily_goal: int | None = Field(default=None, ge=0, le=500)
    weekly_goal: int | None = Field(default=None, ge=0, le=3500)
    days_off: list[int] | None = None
    vacation_mode: bool | None = None
