import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user_id, get_db
from app.models.push_subscription import PushSubscription
from app.services import notifications

router = APIRouter(prefix="/push", tags=["push"])


class PushStatus(BaseModel):
    email_enabled: bool
    push_enabled: bool
    vapid_public_key: str | None = None


class SubscriptionKeys(BaseModel):
    p256dh: str
    auth: str


class SubscriptionCreate(BaseModel):
    endpoint: str
    keys: SubscriptionKeys


class SubscriptionDelete(BaseModel):
    endpoint: str


@router.get("/status", response_model=PushStatus)
async def push_status(user_id: uuid.UUID = Depends(get_current_user_id)):
    """Which extra reminder channels the server is configured for."""
    push_on = notifications.push_configured()
    return PushStatus(
        email_enabled=notifications.email_configured(),
        push_enabled=push_on,
        vapid_public_key=settings.vapid_public_key if push_on else None,
    )


@router.post("/subscriptions", status_code=204)
async def subscribe(
    payload: SubscriptionCreate,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    existing = (
        await db.execute(select(PushSubscription).where(PushSubscription.endpoint == payload.endpoint))
    ).scalar_one_or_none()
    if existing is None:
        db.add(
            PushSubscription(
                user_id=user_id,
                endpoint=payload.endpoint,
                p256dh=payload.keys.p256dh,
                auth=payload.keys.auth,
            )
        )
    else:
        # Same browser re-subscribing (possibly after a different user logged in).
        existing.user_id = user_id
        existing.p256dh = payload.keys.p256dh
        existing.auth = payload.keys.auth
    await db.commit()


@router.delete("/subscriptions", status_code=204)
async def unsubscribe(
    payload: SubscriptionDelete,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    existing = (
        await db.execute(
            select(PushSubscription).where(
                PushSubscription.endpoint == payload.endpoint, PushSubscription.user_id == user_id
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        await db.delete(existing)
        await db.commit()
