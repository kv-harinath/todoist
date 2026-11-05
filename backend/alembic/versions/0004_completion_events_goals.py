"""completion events and productivity goals

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-26
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("daily_goal", sa.Integer, nullable=False, server_default="5"))
    op.add_column("users", sa.Column("weekly_goal", sa.Integer, nullable=False, server_default="30"))
    op.add_column("users", sa.Column("days_off", sa.String(20), nullable=False, server_default=""))
    op.add_column("users", sa.Column("vacation_mode", sa.Boolean, nullable=False, server_default=sa.false()))
    op.create_table(
        "completion_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("task_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True),
        sa.Column("task_content", sa.String(500), nullable=False, server_default=""),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_completion_events_user_id", "completion_events", ["user_id"])
    op.create_index("ix_completion_events_task_id", "completion_events", ["task_id"])
    op.create_index("ix_completion_events_user_completed", "completion_events", ["user_id", "completed_at"])
    # Backfill history from tasks that are already completed.
    op.execute(
        """
        INSERT INTO completion_events (id, user_id, task_id, task_content, completed_at)
        SELECT gen_random_uuid(), user_id, id, content, completed_at
        FROM tasks WHERE is_completed = true AND completed_at IS NOT NULL
        """
    )


def downgrade() -> None:
    op.drop_index("ix_completion_events_user_completed", table_name="completion_events")
    op.drop_index("ix_completion_events_task_id", table_name="completion_events")
    op.drop_index("ix_completion_events_user_id", table_name="completion_events")
    op.drop_table("completion_events")
    op.drop_column("users", "vacation_mode")
    op.drop_column("users", "days_off")
    op.drop_column("users", "weekly_goal")
    op.drop_column("users", "daily_goal")
