"""Filter-query interpreter.

Todoist's filter language (observed in its public "Introduction to
filters" help article, see docs/TODOIST_REFERENCE_ANALYSIS.md) is a
boolean expression language:

  |  OR        &  AND        !  NOT        ( )  grouping
  ,  separate lists (we treat a top-level comma as a union)
  \\  escape a special character, e.g. #Shopping\\ list
  #Project   ##Project (incl. sub-projects)   %label   p1..p4   today   tomorrow   overdue   recurring
  no date    no time  subtask  search: text
  date: X    date before: X    date after: X   (also "due ...")

Legacy syntax from the first implementation still works: whitespace or the
word AND between atoms means AND, and `label:Name` / `project:Name` match
a label/project by name. Atoms we do not recognise are ignored (they
neither match nor exclude), so a hand-edited saved filter degrades
gracefully rather than erroring.
"""

import re
from datetime import date, timedelta

from sqlalchemy import and_, func, not_, or_, select, true

from app.models.label import Label
from app.models.project import Project
from app.models.task import Task
from app.models.task_label import TaskLabel

_ESC_SPACE = "\x00"
_OPERATORS = set("|&!(),")


def _tokenize(query: str) -> list[str]:
    tokens: list[str] = []
    buf: list[str] = []

    def flush() -> None:
        text = "".join(buf).strip()
        buf.clear()
        if text:
            tokens.append(text)

    i = 0
    while i < len(query):
        ch = query[i]
        if ch == "\\" and i + 1 < len(query):
            nxt = query[i + 1]
            buf.append(_ESC_SPACE if nxt == " " else "\x01" + nxt)
            i += 2
            continue
        if ch in _OPERATORS:
            flush()
            tokens.append(ch)
        else:
            buf.append(ch)
        i += 1
    flush()
    return tokens


def _unescape(text: str) -> str:
    return re.sub(r"\x01(.)", r"\1", text.replace(_ESC_SPACE, " "))


def _parse_date(text: str, today: date) -> date | None:
    value = text.strip().lower()
    if value == "today":
        return today
    if value == "tomorrow":
        return today + timedelta(days=1)
    if value == "yesterday":
        return today - timedelta(days=1)
    if value == "next week":
        return today + timedelta(days=7 - today.weekday())  # next Monday
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def _atom_clause(raw: str, today: date):
    """Return a SQL clause for one atom, or None if it isn't recognised."""
    text = _unescape(raw).strip()
    lower = text.lower()

    if re.fullmatch(r"p[1-4]", lower):
        return Task.priority == int(lower[1])
    if lower in ("overdue", "over due", "od"):
        return and_(Task.due_date < today, Task.is_completed.is_(False))
    if lower == "today":
        return Task.due_date == today
    if lower == "tomorrow":
        return Task.due_date == today + timedelta(days=1)
    if lower == "yesterday":
        return Task.due_date == today - timedelta(days=1)
    if lower in ("no date", "no due date"):
        return Task.due_date.is_(None)
    if lower == "no time":
        return Task.due_time.is_(None)
    if lower == "recurring":
        return Task.is_recurring.is_(True)
    if lower == "subtask":
        return Task.parent_task_id.is_not(None)
    if lower == "completed":
        return Task.is_completed.is_(True)
    if lower == "all":
        return true()

    days_match = re.fullmatch(r"(?:next\s+)?(\d+)\s+days?", lower)
    if days_match:
        horizon = today + timedelta(days=int(days_match.group(1)))
        return and_(Task.due_date >= today, Task.due_date <= horizon)

    # Names end at whitespace; spaces inside names must be escaped (\ ).
    if lower.startswith(("#", "%", "label:", "project:")) and re.search(r"\s", raw.strip()):
        return None
    if lower.startswith("##"):
        name = text[2:].lower()
        tree = select(Project.id).where(func.lower(Project.name) == name).cte("project_tree", recursive=True)
        tree = tree.union_all(select(Project.id).where(Project.parent_project_id == tree.c.id))
        return Task.project_id.in_(select(tree.c.id))
    if lower.startswith("#"):
        name = _unescape(raw).strip()[1:].lstrip("#").lower()
        return Task.project.has(func.lower(Project.name) == name)
    if lower.startswith("%"):
        name = text[1:].lower()
        return Task.labels.any(TaskLabel.label.has(func.lower(Label.name) == name))
    if lower.startswith("label:"):
        return Task.labels.any(TaskLabel.label.has(func.lower(Label.name) == text[6:].strip().lower()))
    if lower.startswith("project:"):
        return Task.project.has(func.lower(Project.name) == text[8:].strip().lower())
    if lower.startswith("search:"):
        return Task.content.ilike(f"%{text[7:].strip()}%")

    date_match = re.fullmatch(r"(?:date|due)(?:\s+(before|after))?\s*:\s*(.+)", lower)
    if date_match:
        target = _parse_date(date_match.group(2), today)
        if target is None:
            return None
        direction = date_match.group(1)
        if direction == "before":
            return Task.due_date < target
        if direction == "after":
            return Task.due_date > target
        return Task.due_date == target

    # A bare date such as "2026-03-04" means "due on that date".
    target = _parse_date(text, today)
    if target is not None:
        return Task.due_date == target
    return None


def _legacy_atom(raw: str, today: date):
    """Try the whole atom; else treat whitespace/AND as AND between words."""
    clause = _atom_clause(raw, today)
    if clause is not None:
        return clause
    words = [w for w in re.split(r"\s+|\bAND\b", raw) if w and w.upper() != "AND"]
    if len(words) <= 1:
        return None
    clauses = [c for c in (_atom_clause(w, today) for w in words) if c is not None]
    return and_(*clauses) if clauses else None


class _Parser:
    """or_expr := and_expr ('|' and_expr)* ; and_expr := unary ('&' unary)*"""

    def __init__(self, tokens: list[str], today: date):
        self.tokens = tokens
        self.pos = 0
        self.today = today

    def _peek(self) -> str | None:
        return self.tokens[self.pos] if self.pos < len(self.tokens) else None

    def _next(self) -> str | None:
        tok = self._peek()
        self.pos += 1
        return tok

    def parse_or(self):
        parts = [self.parse_and()]
        while self._peek() in ("|", ","):
            self._next()
            parts.append(self.parse_and())
        parts = [p for p in parts if p is not None]
        return or_(*parts) if parts else None

    def parse_and(self):
        parts = [self.parse_unary()]
        while self._peek() == "&":
            self._next()
            parts.append(self.parse_unary())
        parts = [p for p in parts if p is not None]
        return and_(*parts) if parts else None

    def parse_unary(self):
        tok = self._peek()
        if tok == "!":
            self._next()
            inner = self.parse_unary()
            return None if inner is None else not_(inner)
        if tok == "(":
            self._next()
            inner = self.parse_or()
            if self._peek() == ")":
                self._next()
            return inner
        if tok is None or tok in _OPERATORS:
            # Stray operator (e.g. unbalanced ")" or trailing "&"): skip it.
            if tok is not None and tok != ")":
                self._next()
            return None
        self._next()
        return _legacy_atom(tok, self.today)


def build_filter_clause(query: str, today: date | None = None):
    """Compile a filter query into a SQLAlchemy clause on Task.

    Returns None when nothing in the query is recognised, meaning "do not
    narrow the task list".
    """
    parser = _Parser(_tokenize(query), today or date.today())
    # Anything left over after the first expression (e.g. a stray ")") is ignored.
    return parser.parse_or()

