from app.services.filters import parse_filter_query


def test_priority_and_overdue():
    parsed = parse_filter_query("p1 AND overdue")
    assert parsed.priorities == {1}
    assert parsed.overdue is True


def test_no_date_token():
    parsed = parse_filter_query("no date")
    assert parsed.no_date is True


def test_label_and_project_tokens():
    parsed = parse_filter_query("label:Work project:Personal")
    assert parsed.label_names == ["Work"]
    assert parsed.project_names == ["Personal"]


def test_unrecognized_token_ignored():
    parsed = parse_filter_query("p2 gibberish today")
    assert parsed.priorities == {2}
    assert parsed.due_today is True
