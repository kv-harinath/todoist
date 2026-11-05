# Todoist Gap Analysis

Compares `docs/TODOIST_REFERENCE_ANALYSIS.md` (public evidence only) with this repository.
Status: functional / partial / missing / n-a. Only the filter rows were exercised (by automated tests). Other
rows come from `PROGRESS.md`, `README.md` and file names, and were **not** run in a browser; no database was
started in this session.

| Feature | Todoist (evidence) | Repo implementation | Status | Gap / action | Test |
|---|---|---|---|---|---|
| Filter operators `& \| ! ( )` | Documented in help article | `backend/app/services/filters.py` (`build_filter_clause`), used by `GET /tasks?filter_id=` in `api/v1/tasks.py`; model `models/filter.py` | **functional (fixed this session; was AND-only)** | done | `backend/tests/test_filters.py` (SQL-rendering tests) |
| `#Project`, `%label`, `search:`, `recurring`, `no time`, `subtask`, `date/due [before/after]:` | Documented | same | functional | `##Project` implemented (recursive CTE); `next week` implemented; still missing `deadline:` and `+4 hours`; top-level comma is a union, not separate lists | unit tests only; no live-DB test |
| Filter description / edit | Documented | `models/filter.py` + migration `0002`, `Filters.jsx` (Edit query), `FilterView.jsx` (Add a description) | **implemented, not run against a DB** | apply migration `alembic upgrade head` | none (no DB) |
| Today / Upcoming | yes | `Today.jsx`, `Upcoming.jsx`, `api/v1/views.py` | functional per PROGRESS | not run here | none |
| Projects, sections, board/list/calendar | yes; Calendar (Pro) | `Project.jsx`, `CalendarView.jsx` (month grid, drag a task to a day to reschedule) | **implemented, not run in a browser** | none | build only |
| Sub-tasks | yes (nestable) | `TaskList.jsx` builds the tree, `TaskItem.jsx` renders up to 4 levels with an Add sub-task button; `tasks.py::_check_parent` rejects cycles, foreign parents and >4 levels | **implemented; backend validation unit-tested, UI not run in a browser** | none | `test_subtask_parent.py` (5 tests) |
| Labels, priorities, descriptions | yes | `labels.py`, `PrioritySelector.jsx`, `TaskEditPanel.jsx` | functional per PROGRESS | none | none |
| Quick Add NL | rich | `quickAddParser.js` + `QuickAdd.jsx`: `#project`, `/section`, `@label`, p1-p4, dates, `in N days`, `at 3pm`, `every ...` incl. `every other`, `every N weeks/months`, `every!` | **implemented** | none known | `quickAddParser.test.js` (9 tests) |
| Recurring | yes | `services/recurrence.py`: every day/weekday/week/month, N days/weeks/months, other, weekday names, `every!` after-completion | **functional** | none known | `test_recurrence.py` (11 tests) |
| Reminders | yes (email/push) | `models/reminder.py`, `api/v1/reminders.py`, `api/v1/push.py`, `services/notifications.py` (SMTP + Web Push/VAPID), `services/reminder_worker.py` (30s loop in API lifespan), `public/sw.js`, `utils/push.js`, `ReminderEditor.jsx`, `ReminderWatcher.jsx`; migrations `0002`, `0003` | **implemented (in-app, email, web push); not run against a DB, real SMTP server or browser push service** | mobile-app push, email to other addresses | `test_reminder_delivery.py` (8 tests with fake DB/SMTP/webpush), `test_reminders_routes.py` |
| Comments / sharing / assignees | yes | none (single-user by design) | missing / n-a | out of scope | none |
| Stats / Karma | daily/weekly goals, Karma, activity history | `models/completion_event.py` (history incl. recurring tasks), `services/stats.py`, `api/v1/stats.py` (`/stats/summary`, `PATCH /stats/goals`), `Stats.jsx`; migration `0004` (backfills history) | **implemented; Karma formula is this project's own (Todoist's is not public); not run against a DB** | activity-history list page | `test_stats_service.py`, `test_stats_summary.py` |
| Search | yes | `Search.jsx`, `q=` param | functional per PROGRESS | none | none |
| Uploads, integrations, templates | yes | none | missing / n-a | out of scope | none |
| Responsive app UI | marketing site collapses at 390px | `AppLayout.jsx`, `Sidebar.jsx` | unknown | verify at 390px | none |
| Auth | login/signup | `auth.py`, JWT | functional; no password reset | none | `test_security.py` |

## Prioritized plan
Done: boolean filter language, Quick Add tokens, filter description, vitest harness, sub-tasks UI, calendar layout, reminders.
Remaining: run migrations (0002-0004) + manual browser verification (incl. real SMTP/push), responsive audit of the app UI, comments/sharing (out of scope for single-user).

The authenticated Todoist UI (spacing, dialogs, menus) was not observable, so UI-fidelity gaps cannot be scored
from evidence.
