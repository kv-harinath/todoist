"""Pure stats helpers: goal streaks and Karma.

Todoist's public pages mention daily/weekly goals, productivity trends and
"Karma" but not the formulas, so the scoring here is this project's own:

  Karma = 1 point per completed task
          + 5 for every day the daily goal was met
          + 25 for every (Mon-Sun) week the weekly goal was met

Levels use fixed thresholds (LEVELS). Days off and vacation mode do not
break goal streaks: a day off is skipped when counting streak days.
"""

from datetime import date, timedelta

DAILY_BONUS = 5
WEEKLY_BONUS = 25

LEVELS = [
    (0, "Beginner"),
    (500, "Novice"),
    (2500, "Professional"),
    (5000, "Expert"),
    (7500, "Master"),
    (10000, "Grand Master"),
    (20000, "Enlightened"),
]


def parse_days_off(value: str) -> set[int]:
    """"5,6" -> {5, 6} (Monday=0). Ignores junk."""
    out = set()
    for part in (value or "").split(","):
        part = part.strip()
        if part.isdigit() and 0 <= int(part) <= 6:
            out.add(int(part))
    return out


def week_start(day: date) -> date:
    return day - timedelta(days=day.weekday())


def daily_goal_streak(counts: dict[date, int], today: date, goal: int, days_off: set[int], vacation: bool) -> int:
    """Consecutive days (counting back from today) on which `counts[day] >= goal`.

    Days off are skipped (neither extend nor break the streak). Today is
    not required to be complete yet. With vacation mode the streak is frozen
    at its current value by skipping every day.
    """
    if goal < 1:
        return 0
    streak = 0
    day = today
    first = True
    for _ in range(3650):
        if vacation or day.weekday() in days_off:
            day -= timedelta(days=1)
            first = False
            continue
        if counts.get(day, 0) >= goal:
            streak += 1
        elif not (first and day == today):
            break
        first = False
        day -= timedelta(days=1)
    return streak


def weekly_goal_streak(counts: dict[date, int], today: date, goal: int) -> int:
    """Consecutive Mon-Sun weeks (ending with this week, which may still be in progress) meeting `goal`."""
    if goal < 1:
        return 0
    totals: dict[date, int] = {}
    for day, n in counts.items():
        totals[week_start(day)] = totals.get(week_start(day), 0) + n
    streak = 0
    week = week_start(today)
    if totals.get(week, 0) < goal:
        week -= timedelta(weeks=1)  # current week still in progress
    while totals.get(week, 0) >= goal:
        streak += 1
        week -= timedelta(weeks=1)
    return streak


def karma_points(counts: dict[date, int], daily_goal: int, weekly_goal: int) -> int:
    total = sum(counts.values())
    if daily_goal >= 1:
        total += DAILY_BONUS * sum(1 for n in counts.values() if n >= daily_goal)
    if weekly_goal >= 1:
        weeks: dict[date, int] = {}
        for day, n in counts.items():
            weeks[week_start(day)] = weeks.get(week_start(day), 0) + n
        total += WEEKLY_BONUS * sum(1 for n in weeks.values() if n >= weekly_goal)
    return total


def karma_level(points: int) -> tuple[str, int | None]:
    """(level name, points needed for the next level or None at max)."""
    name = LEVELS[0][1]
    next_at: int | None = None
    for threshold, level in LEVELS:
        if points >= threshold:
            name = level
        else:
            next_at = threshold
            break
    return name, next_at
