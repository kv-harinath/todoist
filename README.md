# Todoist Clone

Single-user Todoist-style task manager. React + FastAPI + PostgreSQL.

See `todoist-clone-plan.md` for the full build plan and `PROGRESS.md` for milestone status. See "Implementation status" below for what is done, pending and still untested. Real accounts exist now (see "Creating an account" below) - each user only sees their own projects/tasks.

## Option A: Run everything with Docker Compose (recommended)

Requires Docker Desktop (or Docker Engine) installed and running. This builds the backend/frontend inside Linux containers, so nothing needs to be installed on your host machine.

```bash
cp .env.example .env   # already done for local dev, only needed once
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000 (docs at /docs)
- Backend health check: http://localhost:8000/api/v1/health

Stop everything with `Ctrl+C`, or `docker compose down` to also remove the containers (add `-v` to also wipe the Postgres data volume).

## Option B: Run backend and frontend directly on your machine (no Docker)

Use this if you don't have Docker, or want tighter IDE/debugger integration. You'll need Python 3.12+, Node.js 20+, and a running PostgreSQL 16 instance.

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

pip install -r requirements.txt

# backend/.env holds DATABASE_URL for this local (no Docker) setup - it's
# separate from the .env at the project root, which Docker Compose uses.
# Edit backend/.env if your Postgres user/password/db name/host/port differ
# from the defaults (todoist/todoist/todoist on localhost:5432).

alembic upgrade head   # creates the tables and seeds the default local user

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Backend API: http://localhost:8000 (docs at /docs)
- `alembic upgrade head` only needs to be re-run when a new migration is added (e.g. a future milestone). It's safe to re-run any time - it's a no-op once the schema is already at the latest revision.
- If `pip install` fails on `passlib`/`bcrypt` (an `AttributeError: module 'bcrypt' has no attribute '__about__'` when you first hit /auth/register or /auth/login), your environment picked up a newer `bcrypt` than passlib 1.7.4 expects - `requirements.txt` now pins `bcrypt==4.0.1` to avoid this; re-run `pip install -r requirements.txt` if you installed before this was added.
- If `pip install` fails trying to compile a package from source (e.g. asyncpg) on Windows, make sure you're on an up-to-date `pip` (`python -m pip install --upgrade pip`) and reasonably recent Python — the pinned versions in `requirements.txt` ship prebuilt Windows wheels, so a source build usually means an older/newer Python than the wheels target.
- You need a real Postgres server reachable at that `DATABASE_URL` — either install Postgres locally (see below), or run just the `db` service from Docker Compose: `docker compose up db`.

#### Setting up a native PostgreSQL install (Windows)

1. Install PostgreSQL from https://www.postgresql.org/download/windows/ (the EDB installer). During setup you'll set a password for the default `postgres` superuser — remember it, you'll need it for the next step. Make sure it's listening on the default port `5432`.
2. Create a database and a dedicated user matching the app's config (`.env.example`). Open **SQL Shell (psql)** from the Start menu (or run `psql -U postgres` from a terminal), connect as the `postgres` superuser, then run:

   ```sql
   CREATE USER todoist WITH PASSWORD 'todoist';
   CREATE DATABASE todoist OWNER todoist;
   ```

   You can use different values, just make sure they match the `DATABASE_URL` you export before starting the backend (see above) and the `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` in `.env`.
3. Confirm you can connect: `psql -U todoist -d todoist -h localhost` (it will prompt for the password).
4. Once the backend is running (see above), confirm it can reach the database by hitting http://localhost:8000/api/v1/health — a `{"status": "ok"}` response means the connection works. A connection error there (not a 404) usually means the `DATABASE_URL` doesn't match what you created in step 2, or Postgres isn't running.
5. Run `alembic upgrade head` (from the `backend` folder, with `DATABASE_URL` pointing at this database) to create the tables and seed the default user, before starting the backend.

### Frontend

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0
```

- Frontend: http://localhost:5173
- By default it calls the backend at `http://localhost:8000/api/v1` (see `frontend/src/api/client.js`). Override with a `.env` file in `frontend/` setting `VITE_API_BASE_URL` if your backend runs elsewhere.

## Creating an account

There's no seed account to log in with - visit http://localhost:5173/register to create one (email, password,
optional display name), which logs you in immediately. Any projects/tasks you create belong only to your
account; other accounts (or the old pre-auth dev data owned by the seeded `local@todoist.clone` user - see
`backend/app/core/constants.py`) won't show up for you. Tokens are JWTs stored in the browser's local storage;
logging out (sidebar) or letting the token expire clears them and sends you back to /login.

## Implementation status

Reference: public Todoist pages inspected with the Rea MCP (see `docs/TODOIST_REFERENCE_ANALYSIS.md`); feature-by-feature
comparison in `docs/TODOIST_GAP_ANALYSIS.md`. **Everything below marked "completed" has been written and
unit-tested or build-checked, but the app has not yet been run end to end** - see "Required testing".

### Completed

- **Accounts:** email/password registration and login, JWT bearer tokens, protected routes on both sides.
- **Projects & tasks:** CRUD, Inbox, complete/reopen, drag-and-drop reordering (Inbox and project lists).
- **Sub-tasks:** nested up to 4 levels with an "Add sub-task" button; the backend rejects cycles, foreign
  parents and nesting deeper than 4 levels (`_check_parent` in `backend/app/api/v1/tasks.py`).
- **Views:** Today, Upcoming, Inbox, Search, and per-project **List / Board / Calendar** layouts (the calendar
  is a month grid; drag a task onto a day to reschedule it).
- **Organization:** sections, labels, favorites, priorities, task descriptions, due dates and times.
- **Filters:** saved filters with a Todoist-style boolean language (`&`, `|`, `!`, parentheses, `,`, `\` escapes,
  `#Project`, `##Project` incl. sub-projects, `%label`, `p1`-`p4`, `today`, `tomorrow`, `yesterday`, `overdue`,
  `no date`, `no time`, `recurring`, `subtask`, `search:`, `date/due [before|after]: ...`, `N days`,
  `next week`), plus filter descriptions and query editing. See `backend/app/services/filters.py`.
- **Quick Add** (inline box and the global Add task dialog): `#Project`, `/Section`, `@label` (auto-created),
  `p1`-`p4`, `today/tomorrow/next mon`, `in N days`, `Mar 5`, `2026-12-01`, `at 3pm`, and recurrence phrases
  (`every day/weekday/week/month`, `every N days/weeks/months`, `every other ...`, `every mon`, `every! ...`).
- **Recurrence:** rule engine in `backend/app/services/recurrence.py`, including "after completion" (`every!`).
- **Reminders:** per-task reminders with an in-app toast (30s poll), plus optional **email** (SMTP) and
  **browser push** (Web Push/VAPID) delivered by a background worker; each channel is sent once and failed
  sends are retried.
- **Stats, goals and Karma:** daily/weekly goals with progress bars, goal streaks, days off, vacation mode, a
  7-day chart and a Karma score. Every completion is stored in `completion_events`, so recurring tasks keep
  their history. The Karma formula (1 point per task, +5 per daily goal met, +25 per weekly goal met; level
  thresholds in `backend/app/services/stats.py`) is this project's own - Todoist's is not public.
- **Theming:** light/dark toggle.
- **Docs and tests:** Todoist reference + gap analysis in `docs/`; 54 backend tests (pytest) and 9 frontend
  tests (vitest, Quick Add parser).

### Pending (not implemented)

- **Filters:** `deadline:` queries (tasks have no deadline field), `+4 hours`-style relative times, and a comma
  producing separate result lists (it is currently a union). Team filters do not apply (single-user app).
- **Reminders:** push to a mobile app, and email to addresses other than the account's own.
- **Stats:** an activity-history / completed-tasks archive page.
- **Layout:** the Calendar layout exists only on project pages (not filters, labels, Today/Upcoming); drag
  reordering is not available in Today/Upcoming/Filters.
- **Accounts:** password reset, email verification, refresh-token rotation.
- **Quality:** integration tests against a database, browser (end-to-end) tests, a deployment write-up
  (milestone 8 in `PROGRESS.md`), and a responsive audit of the app UI at phone width.
- **Out of scope (single-user app):** comments, shared projects/assignees, team workspaces, file uploads,
  integrations, the templates gallery, AI features.
- **Unknown from the reference:** exact spacing, dialogs and menus of the authenticated Todoist app were behind
  login and could not be inspected, so UI-fidelity gaps are unscored.

### Required testing

None of the following has been run: this repo was developed without a running Postgres/Docker. Do these in order.

1. **Start and migrate.** `docker compose up --build` (or Option B + `alembic upgrade head`). Confirm migrations
   `0002` (reminders, filter description), `0003` (reminder channels, push subscriptions) and `0004`
   (completion events, goals; backfills history) apply cleanly, and that `/api/v1/health` returns ok.
2. **Automated checks.** `cd backend && python -m pytest` (54 pass) and `cd frontend && npm test` (9 pass),
   then `npm run build`.
3. **Quick Add.** Create tasks with e.g. `Buy milk #Home /Errands @shop p1 tomorrow at 3pm`,
   `Water plants every! 3 days`, `Sync every other mon`; check project, section, labels, date/time and recurrence.
4. **Sub-tasks.** Add sub-tasks to 4 levels; confirm a 5th level, making a task its own parent, and moving a
   task under its own descendant are rejected (HTTP 422).
5. **Calendar.** Open a project > Calendar; change month; drag a task to another day and confirm the due date
   changes; check the layout at phone width.
6. **Filters.** Save and open: `(today | overdue) & p1`, `!no date`, `##<parent project>`, `%label & !subtask`,
   `search: milk`, `date before: next week`; edit the query; add a filter description.
7. **Recurrence and Stats.** Complete a recurring task several times, a normal task, then reopen it; check the
   Stats counts, streaks and Karma change correctly (reopen must not double count); set goals, days off and
   vacation mode and confirm they persist after reload.
8. **In-app reminders.** Add a reminder a minute ahead; confirm the toast appears and Dismiss works.
9. **Email reminders.** Set `SMTP_*` in `.env` (a test inbox such as Mailpit works), add an email reminder, and
   confirm exactly one email arrives; break the SMTP host and confirm it retries and logs the failure.
10. **Push reminders.** Generate keys with `python backend/scripts/generate_vapid_keys.py`, set `VAPID_*`, open the
    app on `localhost`/HTTPS, add a push reminder and allow notifications; confirm the notification appears with
    the tab closed, and that revoking permission removes the dead subscription after the next send.
11. **Cross-user safety.** With two accounts, confirm one cannot read or modify the other's tasks, reminders,
    filters or push subscriptions.
12. **Responsive pass.** Check the sidebar, task list, edit panel, Stats and Calendar at 390px width.

### Configuration for optional features

**Stats goals** need no configuration. **Email and push reminders:** set these in `.env` (see `.env.example`)
and run `alembic upgrade head`:

- **Email:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM`. Sent to the account's email.
- **Push:** run `python backend/scripts/generate_vapid_keys.py` and set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
  `VAPID_SUBJECT`. Push needs HTTPS or `localhost`; the browser asks for permission when you add a push reminder.

A background worker inside the API process checks every `REMINDER_POLL_SECONDS` (default 30) and sends each
channel once. Disable it with `REMINDER_WORKER_ENABLED=false`; with several API replicas, enable it on one only
to avoid duplicate sends.

## Repo layout

- `backend/` — FastAPI app, SQLAlchemy models, Alembic migrations
- `frontend/` — React (Vite) SPA
- `docker-compose.yml` — db + backend + frontend services for local dev
