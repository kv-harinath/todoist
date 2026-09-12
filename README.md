# Todoist Clone

Single-user Todoist-style task manager. React + FastAPI + PostgreSQL.

See `todoist-clone-plan.md` for the full build plan and `PROGRESS.md` for milestone status. Milestones 1-7 are implemented; milestone 8 (automated test suite + deployment write-up) is intentionally out of scope for now. Real accounts exist now (see "Creating an account" below) - each user only sees their own projects/tasks.

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

## What's implemented

- **Projects & tasks** (milestone 3): full CRUD, Inbox view, complete/reopen, drag-and-drop reordering.
- **Views** (milestone 4): Today (due + overdue), Upcoming (next 7 days, grouped by date), Inbox.
- **Organization** (milestone 5): sections (with a list/board toggle per project), labels, favorites, and
  saved filters using a small AND-only query language (see the Filters page for the token syntax).
- **Recurrence & quick-add** (milestone 6): a rule interpreter (`backend/app/services/recurrence.py`)
  supporting "every day", "every N days", "every week/month", "every weekday", and "every &lt;weekday&gt;";
  the quick-add box (`frontend/src/utils/quickAddParser.js`) recognizes "today", "tomorrow", "next mon", and
  "p1".."p4" and strips them out of the task text.
- **Stats & theming** (milestone 7): a lightweight stats page (completed today/this week, a day streak),
  and a light/dark theme toggle in the sidebar (persisted in the browser's local storage).
- **Real accounts** (milestone 2): email/password registration and login, JWT bearer tokens, every API route
  requiring a valid token (`backend/app/core/deps.py`), and a protected-route wrapper on the frontend
  (`frontend/src/components/ProtectedRoute.jsx`) that redirects to /login when signed out or a token expires.

### Known scope limitations (by design, not bugs)

- **No automated test suite beyond a few unit tests** (milestone 8 is out of scope for now): there are unit
  tests for the recurrence engine, filter parser, and password/JWT helpers (`backend/tests/`), but no
  integration test suite or deployment write-up yet.
- No password reset, email verification, or session/refresh-token rotation - a lost password currently has no
  recovery path other than direct database access.
- Filters support a flat, implicitly-ANDed token list (no OR, no parentheses) - a fuller filter DSL is
  called out as Phase 2+ in `todoist-clone-plan.md`.
- Drag-and-drop reordering is available in the Inbox and within a project's list view, not in Today/Upcoming/
  Filters (their order comes from due date or the filter query, not a manually chosen order).
- A recurring task's completion history isn't fully tracked (the same row rolls its due date forward per the
  plan's recommendation), so the stats page's streak/weekly counts are most accurate for non-recurring tasks.

## Repo layout

- `backend/` — FastAPI app, SQLAlchemy models, Alembic migrations
- `frontend/` — React (Vite) SPA
- `docker-compose.yml` — db + backend + frontend services for local dev
