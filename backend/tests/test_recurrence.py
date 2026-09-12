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
