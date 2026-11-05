from datetime import date, timedelta

from app.services import stats

TODAY = date(2026, 10, 28)  # Wednesday


def days(*offsets_counts):
    return {TODAY - timedelta(days=o): n for o, n in offsets_counts}


def test_daily_streak_counts_back_and_ignores_unfinished_today():
    counts = days((1, 5), (2, 5), (3, 5))
    assert stats.daily_goal_streak(counts, TODAY, 5, set(), False) == 3  # today not done yet: not broken
    counts[TODAY] = 5
    assert stats.daily_goal_streak(counts, TODAY, 5, set(), False) == 4


def test_daily_streak_breaks_on_missed_day():
    counts = days((0, 5), (1, 5), (3, 5))
    assert stats.daily_goal_streak(counts, TODAY, 5, set(), False) == 2


def test_days_off_do_not_break_streak():
    # Sat (5) and Sun (6) off; Mon+Tue+Wed done, Fri done
    counts = {date(2026, 10, 28): 3, date(2026, 10, 27): 3, date(2026, 10, 26): 3, date(2026, 10, 23): 3}
    assert stats.daily_goal_streak(counts, TODAY, 3, {5, 6}, False) == 4


def test_vacation_freezes_streak_at_zero_activity():
    assert stats.daily_goal_streak(days((10, 9)), TODAY, 1, set(), True) == 0


def test_zero_goal_means_no_streak():
    assert stats.daily_goal_streak(days((0, 9)), TODAY, 0, set(), False) == 0
    assert stats.weekly_goal_streak(days((0, 9)), TODAY, 0) == 0


def test_weekly_streak():
    # this week (Mon 10/26..): 10 done; last week: 12; two weeks ago: 2
    counts = {date(2026, 10, 27): 10, date(2026, 10, 20): 12, date(2026, 10, 13): 2}
    assert stats.weekly_goal_streak(counts, TODAY, 10) == 2
    assert stats.weekly_goal_streak(counts, TODAY, 11) == 1  # current week short but in progress; last week ok


def test_karma_points_and_levels():
    counts = {date(2026, 10, 27): 5, date(2026, 10, 28): 2}
    # 7 tasks + 5 (one day met goal 5) + 25 (week total 7 >= goal 7)
    assert stats.karma_points(counts, 5, 7) == 7 + 5 + 25
    assert stats.karma_level(0) == ("Beginner", 500)
    assert stats.karma_level(2500) == ("Professional", 5000)
    assert stats.karma_level(25000) == ("Enlightened", None)


def test_parse_days_off():
    assert stats.parse_days_off("5, 6,x,9") == {5, 6}
    assert stats.parse_days_off("") == set()
