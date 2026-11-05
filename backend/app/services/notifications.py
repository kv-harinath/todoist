"""Email (SMTP) and Web Push senders for reminders.

Both senders are blocking libraries, so callers run them via
asyncio.to_thread. Each channel is "configured" only when its settings are
present; otherwise it is skipped rather than raising.
"""

import json
import smtplib
from email.message import EmailMessage

from pywebpush import WebPushException, webpush

from app.core.config import settings


class PushGone(Exception):
    """The push endpoint is no longer valid (404/410); the subscription should be deleted."""


def email_configured() -> bool:
    return bool(settings.smtp_host)


def push_configured() -> bool:
    return bool(settings.vapid_public_key and settings.vapid_private_key)


def build_reminder_email(to_address: str, task_content: str, remind_at_text: str) -> EmailMessage:
    message = EmailMessage()
    message["From"] = settings.smtp_from
    message["To"] = to_address
    message["Subject"] = f"Reminder: {task_content}"
    message.set_content(f"This is your reminder for:\n\n  {task_content}\n\nScheduled for {remind_at_text}.\n")
    return message


def send_email(message: EmailMessage) -> None:
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as smtp:
        if settings.smtp_starttls:
            smtp.starttls()
        if settings.smtp_username:
            smtp.login(settings.smtp_username, settings.smtp_password)
        smtp.send_message(message)


def build_push_payload(task_content: str, task_id: str) -> str:
    return json.dumps({"title": "Task reminder", "body": task_content, "task_id": task_id})


def send_push(endpoint: str, p256dh: str, auth: str, payload: str) -> None:
    try:
        webpush(
            subscription_info={"endpoint": endpoint, "keys": {"p256dh": p256dh, "auth": auth}},
            data=payload,
            vapid_private_key=settings.vapid_private_key,
            vapid_claims={"sub": settings.vapid_subject},
        )
    except WebPushException as exc:
        status = getattr(getattr(exc, "response", None), "status_code", None)
        if status in (404, 410):
            raise PushGone() from exc
        raise
