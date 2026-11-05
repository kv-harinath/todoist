from datetime import date

from sqlalchemy.dialects import postgresql

from app.services.filters import build_filter_clause

TODAY = date(2026, 10, 26)


def sql(query: str) -> str:
    clause = build_filter_clause(query, TODAY)
    assert clause is not None
    return str(clause.compile(dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True}))


def test_priority_and_overdue_legacy_and():
    out = sql("p1 AND overdue")
    assert "tasks.priority = 1" in out
    assert "tasks.due_date < '2026-10-26'" in out
    assert " AND " in out


def test_ampersand_and_pipe_precedence():
    # & binds tighter than |
    out = sql("p1 | p2 & today")
    assert out.index(" OR ") > 0
    assert "tasks.priority = 1 OR" in out


def test_parentheses_override_precedence():
    out = sql("(today | overdue) & p1")
    assert out.startswith("(") and "tasks.priority = 1" in out
    assert out.index(" OR ") < out.index("tasks.priority = 1")


def test_not_operator():
    assert "NOT" in sql("!no date") or "IS NOT NULL" in sql("!no date")


def test_project_and_label_symbols():
    out = sql("#Work & %email")
    assert "lower(projects.name) = 'work'" in out
    assert "lower(labels.name) = 'email'" in out


def test_escaped_space_in_project_name():
    assert "lower(projects.name) = 'shopping list'" in sql(r"#Shopping\ list")


def test_legacy_label_project_syntax():
    out = sql("label:Work project:Personal")
    assert "lower(labels.name) = 'work'" in out
    assert "lower(projects.name) = 'personal'" in out


def test_no_date_and_no_time_and_recurring():
    assert "tasks.due_date IS NULL" in sql("no date")
    assert "tasks.due_time IS NULL" in sql("no time")
    assert "tasks.is_recurring IS true" in sql("recurring")


def test_date_before_and_after():
    assert "tasks.due_date < '2026-10-27'" in sql("due before: tomorrow")
    assert "tasks.due_date > '2026-10-26'" in sql("date after: today")


def test_next_n_days():
    assert "'2026-10-31'" in sql("5 days")


def test_search():
    assert "ILIKE '%%milk%%'" in sql("search: milk")


def test_comma_is_union():
    assert " OR " in sql("today, overdue")


def test_unrecognized_atoms_do_not_narrow():
    assert build_filter_clause("gibberish", TODAY) is None
    assert "priority = 2" in sql("p2 gibberish today")


def test_next_week_and_yesterday():
    # 2026-10-26 is a Monday, so "next week" starts 2026-11-02
    assert "tasks.due_date < '2026-11-02'" in sql("date before: next week")
    assert "tasks.due_date = '2026-10-25'" in sql("yesterday")


def test_double_hash_includes_sub_projects():
    out = sql("##Work & p1")
    assert "WITH RECURSIVE project_tree" in out
    assert "projects.parent_project_id = project_tree.id" in out
    assert "lower(projects.name) = 'work'" in out
