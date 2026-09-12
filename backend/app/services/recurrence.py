"""Minimal recurrence rule interpreter (plan section 6).

Rules are short human-readable strings, matching Todoist's own display
style, rather than full RRULE/iCal. Supported forms:

  "every day" / "every weekday"
  "every <weekday>"            e.g. "every mon", "every monday"
  "every N days"                e.g. "every 3 days"
  "every week" / "every month"

On completing a recurring task the caller computes the next due_date
from the *current* due_date (or today, if the task had none) and
updates the same row, rather than inserting a new task instance - this
matches Todoist's "one task rolls forward" behavior and keeps the data
model in plan section 4 free of a separate recurrence-instances table.
"""

import re
from datetime import date, timedelta

from dateutil.relativedelta import relativedelta

_WEEKDAYS = {
    "mon": 0, "monday": 0,
    "tue": 1, "tues": 1, "tuesday": 1,
    "wed": 2, "wednesday": 2,
    "thu": 3, "thur": 3, "thurs": 3, "thursday": 3,
    "fri": 4, "friday": 4,
    "sat": 5, "saturday": 5,
    "sun": 6, "sunday": 6,
}


class InvalidRecurrenceRule(ValueError):
    pass


def compute_next_due_date(current: date | None, rule: str) -> date:
    """Given the task's current due_date (or None) and its recurrence
    rule, return the next due_date. Raises InvalidRecurrenceRule if the
    rule isn't recognized."""

    base = current or date.today()
    normalized = rule.strip().lower()

    if normalized in ("every day", "daily"):
        return base + timedelta(days=1)

    if normalized in ("every weekday",):
        next_day = base + timedelta(days=1)
        while next_day.weekday() >= 5:  # Sat/Sun
            next_day += timedelta(days=1)
        return next_day

    if normalized in ("every week", "weekly"):
        return base + timedelta(weeks=1)

    if normalized in ("every month", "monthly"):
        return base + relativedelta(months=1)

    every_n_days = re.match(r"^every (\d+) days?$", normalized)
    if every_n_days:
        n = int(every_n_days.group(1))
        if n < 1:
            raise InvalidRecurrenceRule(rule)
        return base + timedelta(days=n)

    every_weekday_name = re.match(r"^every ([a-z]+)$", normalized)
    if every_weekday_name and every_weekday_name.group(1) in _WEEKDAYS:
        target = _WEEKDAYS[every_weekday_name.group(1)]
        days_ahead = (target - base.weekday()) % 7
        days_ahead = days_ahead or 7  # always move forward, never same day
        return base + timedelta(days=days_ahead)

    raise InvalidRecurrenceRule(rule)
