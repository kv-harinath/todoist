"""Background worker that delivers due reminders by email and Web Push.

Runs inside the API process (started from the FastAPI lifespan). Each pass
picks reminders that are due, not dismissed, on open tasks, and have a
requested channel that has not been sent yet. A channel is stamped as sent
only after it succeeds, so a failed send is retried on the next pass.
"""

import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.config import settings
from app.models.push_subscription import PushSubscription
from app.models.reminder import Reminder
from app.models.task import Task
from app.models.user import User
from app.services import notifications

logger = logging.getLogger(__name__)


def pending_channels(reminder: Reminder) -> set[str]:
    channels = set()
    if reminder.via_email and reminder.email_sent_at is None and notifications.email_configured():
        channels.add("email")
    if reminder.via_push and reminder.push_sent_at is None and notifications.push_configured():
        channels.add("push")
    return channels


async def dispatch_due_reminders(db: AsyncSession, now: datetime | None = None) -> int:
    """Send every pending channel for due reminders. Returns number of sends."""
    now = now or datetime.now(timezone.utc)
    stmt = (
        select(Reminder, Task)
        .join(Task, Task.id == Reminder.task_id)
        .where(
            Reminder.is_dismissed.is_(False),
            Reminder.remind_at <= now,
            Task.is_completed.is_(False),
            or_(
                Reminder.via_email.is_(True) & Reminder.email_sent_at.is_(None),
                Reminder.via_push.is_(True) & Reminder.push_sent_at.is_(None),
            ),
        )
    )
    rows = (await db.execute(stmt)).all()
    sent = 0
    for reminder, task in rows:
        channels = pending_channels(reminder)
        if "email" in channels:
            user = await db.get(User, reminder.user_id)
            try:
                message = notifications.build_reminder_email(
                    user.email, task.content, reminder.remind_at.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
                )
                await asyncio.to_thread(notifications.send_email, message)
                reminder.email_sent_at = now
                sent += 1
            except Exception:  # retried next pass
                logger.exception("Reminder email failed for reminder %s", reminder.id)
        if "push" in channels:
            subs = (
                await db.execute(select(PushSubscription).where(PushSubscription.user_id == reminder.user_id))
            ).scalars().all()
            payload = notifications.build_push_payload(task.content, str(task.id))
            delivered = False
            for sub in subs:
                try:
                    await asyncio.to_thread(notifications.send_push, sub.endpoint, sub.p256dh, sub.auth, payload)
                    delivered = True
                except notifications.PushGone:
                    await db.delete(sub)
                except Exception:
                    logger.exception("Web push failed for reminder %s", reminder.id)
            # With no live subscription the reminder stays pending, so a browser
            # that subscribes later (before the task is done/dismissed) still gets it.
            if delivered:
                reminder.push_sent_at = now
                sent += 1
    await db.commit()
    return sent


async def run_reminder_worker(session_factory: async_sessionmaker[AsyncSession]) -> None:
    while True:
        try:
            async with session_factory() as db:
                await dispatch_due_reminders(db)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Reminder worker pass failed")
        await asyncio.sleep(settings.reminder_poll_seconds)
