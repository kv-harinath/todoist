# Import order matters for relationship() string lookups but not for
# Base.metadata registration - all classes below register themselves
# on import. Alembic's env.py imports this package.
from app.models.user import User  # noqa: F401
from app.models.project import Project  # noqa: F401
from app.models.section import Section  # noqa: F401
from app.models.label import Label  # noqa: F401
from app.models.task import Task  # noqa: F401
from app.models.task_label import TaskLabel  # noqa: F401
from app.models.filter import Filter  # noqa: F401
from app.models.reminder import Reminder  # noqa: F401
from app.models.push_subscription import PushSubscription  # noqa: F401
from app.models.completion_event import CompletionEvent  # noqa: F401
