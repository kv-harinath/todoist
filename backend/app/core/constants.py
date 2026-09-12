"""Historical: milestone 1-6 ran without real auth, so every request
acted as this single seeded user (created by the initial migration).
Now that milestone 2 (real register/login/JWT) is implemented, this
user is no longer used by app/core/deps.py - it's kept only because
the initial migration still references it to seed that row, and any
projects/tasks created during local dev before auth was added still
belong to it. Log in as a real registered user instead.
"""

import uuid

DEFAULT_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
DEFAULT_USER_EMAIL = "local@todoist.clone"
DEFAULT_USER_DISPLAY_NAME = "Local User"
