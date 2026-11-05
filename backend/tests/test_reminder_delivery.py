import asyncio
import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from app.core.config import settings
from app.models.push_subscription import PushSubscription
from app.models.reminder import Reminder
from app.models.user import User
from app.services import notifications, reminder_worker

NOW = datetime(2026, 10, 26, 12, 0, tzinfo=timezone.utc)


@pytest.fixture(autouse=True)
def configured(monkeypatch):
    monkeypatch.setattr(settings, "smtp_host", "smtp.test")
    monkeypatch.setattr(settings, "vapid_public_key", "pub")
    monkeypatch.setattr(settings, "vapid_private_key", "priv")


def make_reminder(**kw):
    defaults = dict(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        task_id=uuid.uuid4(),
        remind_at=NOW - timedelta(minutes=1),
        is_dismissed=False,
        via_email=False,
        via_push=False,
        email_sent_at=None,
        push_sent_at=None,
    )
    defaults.update(kw)
    return Reminder(**defaults)


class FakeDB:
    def __init__(self, rows, user=None, subs=()):
        self.rows, self.user, self.subs = rows, user, list(subs)
        self.deleted, self.committed = [], False

    async def execute(self, stmt):
        rows, subs = self.rows, self.subs
        if "push_subscriptions" in str(stmt):
            return SimpleNamespace(scalars=lambda: SimpleNamespace(all=lambda: subs))
        return SimpleNamespace(all=lambda: rows)

    async def get(self, model, pk):
        return self.user

    async def delete(self, obj):
        self.deleted.append(obj)

    async def commit(self):
        self.committed = True


def run(coro):
    return asyncio.run(coro)


def test_pending_channels_respects_flags_config_and_sent():
    assert reminder_worker.pending_channels(make_reminder()) == set()
    assert reminder_worker.pending_channels(make_reminder(via_email=True, via_push=True)) == {"email", "push"}
    assert reminder_worker.pending_channels(make_reminder(via_email=True, email_sent_at=NOW)) == set()


def test_pending_channels_skips_unconfigured(monkeypatch):
    monkeypatch.setattr(settings, "smtp_host", "")
    monkeypatch.setattr(settings, "vapid_private_key", "")
    assert reminder_worker.pending_channels(make_reminder(via_email=True, via_push=True)) == set()


def test_build_email():
    msg = notifications.build_reminder_email("a@b.co", "Pay rent", "2026-10-26 12:00 UTC")
    assert msg["To"] == "a@b.co" and msg["Subject"] == "Reminder: Pay rent"
    assert "Pay rent" in msg.get_content()


def test_send_email_uses_starttls_and_login(monkeypatch):
    calls = []

    class FakeSMTP:
        def __init__(self, host, port, timeout):
            calls.append(("connect", host, port))

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def starttls(self):
            calls.append("starttls")

        def login(self, u, p):
            calls.append(("login", u))

        def send_message(self, m):
            calls.append("send")

    monkeypatch.setattr(notifications.smtplib, "SMTP", FakeSMTP)
    monkeypatch.setattr(settings, "smtp_username", "u")
    notifications.send_email(notifications.build_reminder_email("a@b.co", "x", "t"))
    assert calls == [("connect", "smtp.test", 587), "starttls", ("login", "u"), "send"]


def test_send_push_maps_gone_to_pushgone(monkeypatch):
    class Boom(notifications.WebPushException):
        def __init__(self):
            self.response = SimpleNamespace(status_code=410)

    def fake_webpush(**kwargs):
        raise Boom()

    monkeypatch.setattr(notifications, "webpush", fake_webpush)
    with pytest.raises(notifications.PushGone):
        notifications.send_push("https://e", "k", "a", "{}")


def test_dispatch_sends_email_and_push_and_stamps(monkeypatch):
    emails, pushes = [], []
    monkeypatch.setattr(notifications, "send_email", lambda m: emails.append(m))
    monkeypatch.setattr(notifications, "send_push", lambda *a: pushes.append(a))
    reminder = make_reminder(via_email=True, via_push=True)
    task = SimpleNamespace(id=reminder.task_id, content="Pay rent")
    sub = PushSubscription(user_id=reminder.user_id, endpoint="https://e", p256dh="k", auth="a")
    db = FakeDB([(reminder, task)], user=User(email="me@x.co"), subs=[sub])

    assert run(reminder_worker.dispatch_due_reminders(db, NOW)) == 2
    assert emails[0]["To"] == "me@x.co" and len(pushes) == 1
    assert reminder.email_sent_at == NOW and reminder.push_sent_at == NOW and db.committed


def test_failed_email_is_not_stamped_so_it_retries(monkeypatch):
    def fail(_m):
        raise OSError("smtp down")

    monkeypatch.setattr(notifications, "send_email", fail)
    reminder = make_reminder(via_email=True)
    db = FakeDB([(reminder, SimpleNamespace(id=reminder.task_id, content="x"))], user=User(email="me@x.co"))
    assert run(reminder_worker.dispatch_due_reminders(db, NOW)) == 0
    assert reminder.email_sent_at is None


def test_gone_subscription_deleted_and_not_retried_forever(monkeypatch):
    def gone(*_a):
        raise notifications.PushGone()

    monkeypatch.setattr(notifications, "send_push", gone)
    reminder = make_reminder(via_push=True)
    sub = PushSubscription(user_id=reminder.user_id, endpoint="https://e", p256dh="k", auth="a")
    db = FakeDB([(reminder, SimpleNamespace(id=reminder.task_id, content="x"))], subs=[sub])
    # Nothing delivered, but the only subscription was invalid: it is removed and
    # the reminder is left unsent so a re-subscribed browser can still receive it.
    assert run(reminder_worker.dispatch_due_reminders(db, NOW)) == 0
    assert db.deleted == [sub]
