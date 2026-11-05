from datetime import date, timedelta
from types import SimpleNamespace

from app.api.v1.stats import _summary

TODAY = date(2026, 10, 28)  # Wednesday; the week starts Monday 2026-10-26


def test_summary_assembly():
    user = SimpleNamespace(daily_goal=2, weekly_goal=4, days_off="", vacation_mode=False)
    counts = {TODAY: 2, TODAY - timedelta(days=1): 3}
    s = _summary(user, counts, TODAY)
    assert (s.completed_today, s.completed_this_week) == (2, 5)
    assert s.daily_goal_streak == 2 and s.streak == 2
    assert s.karma == 5 + 5 * 2 + 25
    assert len(s.last_7_days) == 7 and s.last_7_days[-1].count == 2


def test_summary_respects_days_off_and_vacation():
    user = SimpleNamespace(daily_goal=1, weekly_goal=1, days_off="1", vacation_mode=False)  # Tuesday off
    counts = {TODAY: 1, TODAY - timedelta(days=2): 1}  # Wed and Mon done, Tue skipped
    assert _summary(user, counts, TODAY).daily_goal_streak == 2
    assert _summary(user, {TODAY - timedelta(days=5): 1}, TODAY).streak == 0
