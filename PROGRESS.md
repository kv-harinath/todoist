# Build Progress

Tracking milestones from `todoist-clone-plan.md` section 8.

- [x] 1. Infra: Docker Compose skeleton (Postgres + FastAPI hello world + Alembic wired up); React app skeleton with routing and a login screen.
- [x] 2. Auth: register/login, JWT issuance, protected routes on both sides. Real email/password accounts (`backend/app/api/v1/auth.py`), passwords hashed with bcrypt, JWT bearer tokens (`backend/app/core/deps.py`), frontend `AuthContext` + `ProtectedRoute` guarding every page except /login and /register.
- [x] 3. Core CRUD: Projects and Tasks - working Inbox list end to end, including complete/reopen, drag-and-drop reordering.
- [x] 4. Views: Today (due + overdue) and Upcoming (grouped by date).
- [x] 5. Organization: Sections (list/board toggle), Labels, Filters (flat AND-only query language), favorites, search.
- [x] 6. Recurrence engine (`backend/app/services/recurrence.py`) and quick-add NLP-lite parsing (`frontend/src/utils/quickAddParser.js`).
- [x] 7. Stats page (completed today/week, streak), favorites, light/dark theming, UI polish pass (cream sidebar, red accent, icons - matching the reference screenshot).
- [ ] 8. Testing pass + deployment write-up. **Intentionally skipped for now** - a handful of backend unit tests exist (`backend/tests/`) but there's no integration test suite, frontend tests, or deployment write-up yet.

See the README's "What's implemented" section for feature-level detail and known scope limitations.
