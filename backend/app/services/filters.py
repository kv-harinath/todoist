"""Minimal filter-query interpreter (plan section 2/5).

Todoist's real filter language supports full boolean expressions with
parentheses; that's explicitly deferred to Phase 2+ (plan section 9).
For the MVP we support a flat, implicitly-ANDed list of tokens, which
covers the example from the plan ("priority 1 AND overdue"):

  p1 .. p4          priority equals 1..4
  overdue           due_date is before today and not completed
  today             due_date is today
  no date           task has no due_date
  completed         is_completed is true
  label:Name        task has a label with this name (case-insensitive)
  project:Name      task belongs to a project with this name (case-insensitive)

Tokens are separated by whitespace and/or the word "AND" (case
insensitive); unrecognized tokens are ignored rather than erroring, so
a saved filter degrades gracefully if edited by hand.
"""

import re
from dataclasses import dataclass, field


@dataclass
class ParsedFilter:
    priorities: set[int] = field(default_factory=set)
    overdue: bool = False
    due_today: bool = False
    no_date: bool = False
    completed: bool | None = None
    label_names: list[str] = field(default_factory=list)
    project_names: list[str] = field(default_factory=list)


def parse_filter_query(query: str) -> ParsedFilter:
    parsed = ParsedFilter()

    # Normalize "no date" to a single token before splitting.
    normalized = re.sub(r"\bno\s+date\b", "no_date", query, flags=re.IGNORECASE)
    tokens = [t for t in re.split(r"\s+|\bAND\b", normalized, flags=re.IGNORECASE) if t]

    for token in tokens:
        lower = token.lower()
        priority_match = re.match(r"^p([1-4])$", lower)
        if priority_match:
            parsed.priorities.add(int(priority_match.group(1)))
        elif lower == "overdue":
            parsed.overdue = True
        elif lower == "today":
            parsed.due_today = True
        elif lower == "no_date":
            parsed.no_date = True
        elif lower == "completed":
            parsed.completed = True
        elif lower.startswith("label:"):
            parsed.label_names.append(token[len("label:"):])
        elif lower.startswith("project:"):
            parsed.project_names.append(token[len("project:"):])
        # else: unrecognized token, ignored

    return parsed
