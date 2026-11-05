"""reminder delivery channels and push subscriptions

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-26
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("reminders", sa.Column("via_email", sa.Boolean, nullable=False, server_default=sa.false()))
    op.add_column("reminders", sa.Column("via_push", sa.Boolean, nullable=False, server_default=sa.false()))
    op.add_column("reminders", sa.Column("email_sent_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("reminders", sa.Column("push_sent_at", sa.DateTime(timezone=True), nullable=True))
    op.create_table(
        "push_subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("endpoint", sa.Text, nullable=False, unique=True),
        sa.Column("p256dh", sa.String(255), nullable=False),
        sa.Column("auth", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_push_subscriptions_user_id", "push_subscriptions", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_push_subscriptions_user_id", table_name="push_subscriptions")
    op.drop_table("push_subscriptions")
    op.drop_column("reminders", "push_sent_at")
    op.drop_column("reminders", "email_sent_at")
    op.drop_column("reminders", "via_push")
    op.drop_column("reminders", "via_email")
