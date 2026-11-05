from datetime import date, timedelta

import pytest

from app.services.recurrence import InvalidRecurrenceRule, compute_next_due_date


def test_every_day():
    assert compute_next_due_date(date(2026, 1, 1), "every day") == date(2026, 1, 2)


def test_every_n_days():
    assert compute_next_due_date(date(2026, 1, 1), "every 3 days") == date(2026, 1, 4)


def test_every_week():
    assert compute_next_due_date(date(2026, 1, 1), "every week") == date(2026, 1, 8)


def test_every_month():
    assert compute_next_due_date(date(2026, 1, 31), "every month") == date(2026, 2, 28)


def test_every_weekday_name_moves_forward_even_on_same_day():
    # 2026-01-05 is a Monday
    assert compute_next_due_date(date(2026, 1, 5), "every mon") == date(2026, 1, 12)


def test_every_weekday_skips_weekend():
    # 2026-01-02 is a Friday -> next weekday is Monday 2026-01-05
    assert compute_next_due_date(date(2026, 1, 2), "every weekday") == date(2026, 1, 5)


def test_no_due_date_falls_back_to_today():
    result = compute_next_due_date(None, "every day")
    assert result == date.today() + timedelta(days=1)


def test_invalid_rule_raises():
    with pytest.raises(InvalidRecurrenceRule):
        compute_next_due_date(date(2026, 1, 1), "every blah")


def test_every_other_and_n_weeks_months():
    assert compute_next_due_date(date(2026, 1, 1), "every other day") == date(2026, 1, 3)
    assert compute_next_due_date(date(2026, 1, 1), "every other week") == date(2026, 1, 15)
    assert compute_next_due_date(date(2026, 1, 31), "every 2 months") == date(2026, 3, 31)
    assert compute_next_due_date(date(2026, 1, 1), "every 3 weeks") == date(2026, 1, 22)


def test_every_other_weekday_name():
    # 2026-01-05 is a Monday: next Monday is the 12th, "other" skips one more week
    assert compute_next_due_date(date(2026, 1, 5), "every other mon") == date(2026, 1, 19)


def test_after_completion_counts_from_completion_date():
    due = date(2026, 1, 1)
    done = date(2026, 1, 10)
    assert compute_next_due_date(due, "every! 3 days", completed_on=done) == date(2026, 1, 13)
    assert compute_next_due_date(due, "every! week", completed_on=done) == date(2026, 1, 17)
    # plain rule still counts from the due date
    assert compute_next_due_date(due, "every 3 days", completed_on=done) == date(2026, 1, 4)
