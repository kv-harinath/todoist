from pydantic import BaseModel


class StatsSummary(BaseModel):
    completed_today: int
    completed_this_week: int
    streak: int
