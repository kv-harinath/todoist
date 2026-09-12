# Todoist Clone — Build Plan (MVP, Single-User, Dockerized)

Stack: React (frontend) · FastAPI (backend) · PostgreSQL (database) · Docker Compose (local/self-hosted runtime)

## 1. Scope for this plan

Single-user accounts, no sharing/teams. Focus is the core Todoist experience: projects, sections, tasks, subtasks, labels, priorities, due dates (including recurring), Today/Upcoming/Inbox views, filters, and basic productivity stats. A "Phase 2+" roadmap at the end lists what a fuller clone would add later (collaboration, karma, NLP date parsing, integrations, reminders/notifications, offline support).

## 2. Feature list for the MVP

Task management: create/edit/delete/complete tasks, due date + due time, priority (P1–P4), subtasks (one level), task description/notes, drag-and-drop reordering, recurring due dates (daily/weekly/custom interval), overdue detection.

Organization: projects (flat, with an option to nest one level as "sub-projects"), sections within a project, labels (many-to-many with tasks), favorites (pin a project).

Views: Inbox (tasks with no project), Today, Upcoming (next N days, grouped by date), a single project view (list + simple board/kanban toggle grouped by section), Filters (saved queries like "priority 1 AND overdue"), search.

Account: email/password auth (JWT), basic profile (name, avatar, theme preference light/dark), no email verification required for MVP (flag it as a config option).

Stats: a simple "completed today/this week" count and a streak counter (lightweight version of Todoist's Karma — not the full point system).

## 3. Architecture overview

```
┌─────────────┐      HTTPS/JSON       ┌──────────────┐      SQL       ┌────────────┐
│  React SPA   │ ───────────────────► │   FastAPI     │ ─────────────► │ PostgreSQL │
│  (Vite)      │ ◄─────────────────── │  (REST + JWT) │ ◄───────────── │            │
└─────────────┘                        └──────────────┘                └────────────┘
```

- Frontend: React + Vite, React Router, a data-fetching layer (TanStack Query recommended) for caching/optimistic updates, Zustand or Context for local UI state, a component library base (Radix UI or plain CSS/Tailwind) styled to resemble Todoist's clean list UI.
- Backend: FastAPI, SQLAlchemy 2.0 (async) + Alembic for migrations, Pydantic v2 schemas, `python-jose` or `fastapi-users` for auth, `croniter`/`dateutil` for recurrence math.
- DB: PostgreSQL 16, one schema, UUID primary keys.
- Dev/runtime: Docker Compose with three services (`frontend`, `backend`, `db`) plus a named volume for Postgres data; `.env` for secrets; Alembic migrations run as a backend startup step or a separate one-off container.

## 4. Data model

Entities and key fields:

- **User**: id, email (unique), hashed_password, display_name, theme, created_at.
- **Project**: id, user_id (FK), name, color, is_favorite, parent_project_id (nullable, self-FK for one level of nesting), sort_order, created_at.
- **Section**: id, project_id (FK), name, sort_order.
- **Task**: id, user_id (FK), project_id (nullable FK — null means Inbox), section_id (nullable FK), parent_task_id (nullable self-FK for subtasks), content, description, priority (1–4), due_date, due_time (nullable), is_recurring, recurrence_rule (text, e.g. "every monday"), is_completed, completed_at, sort_order, created_at, updated_at.
- **Label**: id, user_id (FK), name (unique per user), color.
- **TaskLabel**: task_id (FK), label_id (FK) — many-to-many join table.
- **Filter**: id, user_id (FK), name, query (text, stored filter expression), color.

Indexes worth adding early: `task(user_id, due_date)`, `task(user_id, project_id)`, `task(user_id, is_completed)`.

## 5. API surface (REST, versioned under `/api/v1`)

Auth: `POST /auth/register`, `POST /auth/login` (returns JWT), `GET /auth/me`.

Projects: `GET/POST /projects`, `GET/PATCH/DELETE /projects/{id}`, `PATCH /projects/{id}/reorder`.

Sections: `GET/POST /projects/{id}/sections`, `PATCH/DELETE /sections/{id}`.

Tasks: `GET /tasks` (query params: `project_id`, `label_id`, `due`, `completed`, `filter_id`), `POST /tasks`, `GET/PATCH/DELETE /tasks/{id}`, `POST /tasks/{id}/complete`, `POST /tasks/{id}/reopen`, `PATCH /tasks/{id}/reorder`.

Labels: `GET/POST /labels`, `PATCH/DELETE /labels/{id}`.

Filters: `GET/POST /filters`, `PATCH/DELETE /filters/{id}`.

Views (convenience endpoints so the frontend doesn't reimplement date logic): `GET /views/today`, `GET /views/upcoming?days=7`, `GET /views/inbox`.

Stats: `GET /stats/summary` (completed today/week, current streak).

## 6. Recurrence handling

Store recurrence as a simple human-readable rule string (Todoist does this too, e.g. "every day", "every mon", "every 3 days") parsed by a small rule interpreter rather than full RRULE/iCal at first — enough to cover daily/weekly/custom-interval cases. On completing a recurring task, the backend computes the next due_date from the rule and either updates the same row or inserts a fresh instance (recommend updating the same row for MVP simplicity — matches Todoist's behavior of one task rolling forward rather than an infinite series).

## 7. Suggested repo layout

```
todoist-clone/
├── docker-compose.yml
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/ (config, security, deps)
│   │   ├── models/ (SQLAlchemy models)
│   │   ├── schemas/ (Pydantic)
│   │   ├── api/v1/ (routers: auth, projects, tasks, labels, filters, views, stats)
│   │   ├── services/ (recurrence engine, filter-query parser)
│   │   └── db/ (session, base)
│   ├── alembic/
│   ├── tests/
│   └── Dockerfile
└── frontend/
    ├── src/
    │   ├── pages/ (Inbox, Today, Upcoming, Project, Filters, Settings)
    │   ├── components/ (TaskItem, TaskList, QuickAdd, Sidebar, ProjectForm, LabelPicker, PrioritySelector)
    │   ├── api/ (typed API client)
    │   ├── store/ (auth + UI state)
    │   └── hooks/ (useTasks, useProjects, etc. via TanStack Query)
    └── Dockerfile
```

## 8. Build order (milestones)

1. Infra: Docker Compose skeleton (Postgres + FastAPI "hello world" + Alembic wired up); React app skeleton with routing and a login screen.
2. Auth: register/login, JWT issuance, protected routes on both sides.
3. Core CRUD: Projects and Tasks (no sections/labels yet) — get a working Inbox list end to end, including complete/reopen.
4. Views: Today and Upcoming, since these depend on date logic that touches most of the task model.
5. Organization: Sections, Labels, drag-and-drop reordering (sort_order field), Filters.
6. Recurrence engine and priority/quick-add natural-language-lite parsing (e.g. detect "tomorrow", "next mon" in the quick-add box — a stripped-down version of Todoist's parser).
7. Stats page, favorites, theming (light/dark), polish pass on UI to match Todoist's visual density and interactions.
8. Testing pass (backend pytest for services/recurrence logic, frontend component tests for TaskItem/QuickAdd), then a deployment write-up (even though MVP targets Docker Compose, note what changes for a real deploy — managed Postgres, HTTPS, env secrets).

## 9. Phase 2+ roadmap (full Todoist parity, not in MVP scope)

Collaboration (shared projects, task assignment, comments, activity log), full Karma/gamification system, richer natural-language date parsing, a proper filter query DSL (AND/OR/parentheses like Todoist's), reminders with push/email notifications, calendar integrations (Google Calendar two-way sync), templates gallery, file attachments on tasks, offline-first sync with conflict resolution, mobile apps, multi-language support, browser extension for quick-add from any page.
