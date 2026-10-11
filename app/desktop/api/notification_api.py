"""
In-app notifications and linked email providers API. Every call works on
the data of the signed-in user.
"""

# Standard library
from __future__ import annotations
from typing import Any

# Third-party
from sqlalchemy import select, update
from sqlalchemy.orm import Session

# Project imports
from desktop.api.auth_api import require_user
from desktop.core.errors import ApiError
from desktop.database.engine import session_scope
from desktop.database.models import EmailLink, Notification, NotificationPreference
from desktop.database.serializers import serialize_email_link
from desktop.utills.dates import new_id, now_ms

NOTIFICATION_KINDS: tuple[str, ...] = ("system", "calendar", "reminder", "unad")
DESKTOP_MASTER: str = "desktop"
DESKTOP_CATEGORIES: tuple[str, ...] = (
    DESKTOP_MASTER,
    "tasks",
    "habits",
    "pomodoro",
    "unad_changes",
    "unad_opening",
    "unad_deadline",
)
EMAIL_PROVIDERS: tuple[str, ...] = ("gmail", "outlook", "apple")


def read_preferences(session: Session, user_id: str) -> dict[str, bool]:
    """Return the desktop notification switches of a user; categories default to enabled."""
    stored: dict[str, bool] = {
        preference.category: preference.enabled
        for preference in session.scalars(
            select(NotificationPreference).where(NotificationPreference.user_id == user_id)
        )
    }
    return {category: stored.get(category, True) for category in DESKTOP_CATEGORIES}


def desktop_enabled(session: Session, user_id: str, category: str) -> bool:
    """Return whether a user wants desktop notifications of a category."""
    preferences: dict[str, bool] = read_preferences(session, user_id)
    return preferences[DESKTOP_MASTER] and preferences.get(category, True)


def set_notification_preference(category: str, enabled: bool) -> dict[str, bool]:
    """Turn the desktop notifications of a category on or off for the signed-in user."""
    if category not in DESKTOP_CATEGORIES:
        raise ApiError("invalid_category")
    with session_scope() as session:
        user_id: str = require_user(session).id
        preference: NotificationPreference | None = session.get(
            NotificationPreference, (user_id, category)
        )
        if preference is None:
            session.add(
                NotificationPreference(user_id=user_id, category=category, enabled=bool(enabled))
            )
        else:
            preference.enabled = bool(enabled)
        session.flush()
        return read_preferences(session, user_id)


def add_notification(
    session: Session, user_id: str, title: str, text: str, kind: str = "system"
) -> Notification:
    """Insert an unread notification for a user and return it."""
    notification: Notification = Notification(
        id=new_id("n"),
        user_id=user_id,
        title=title,
        text=text,
        kind=kind if kind in NOTIFICATION_KINDS else "system",
        unread=True,
        created_at=now_ms(),
    )
    session.add(notification)
    return notification


def create_notifications(items: list[dict[str, Any]]) -> int:
    """
    Store notifications produced by frontend actions.

    Args:
        items: Entries with ``title``, ``text`` and ``kind``.

    Returns:
        The number of notifications stored.
    """
    with session_scope() as session:
        user_id: str = require_user(session).id
        for item in items:
            add_notification(
                session,
                user_id,
                str(item.get("title") or ""),
                str(item.get("text") or ""),
                str(item.get("kind") or "system"),
            )
            session.flush()
    return len(items)


def mark_notification_read(notification_id: str) -> None:
    """Mark one notification as read."""
    with session_scope() as session:
        notification: Notification | None = session.scalar(
            select(Notification).where(
                Notification.user_id == require_user(session).id,
                Notification.id == notification_id,
            )
        )
        if notification is None:
            raise ApiError("notification_not_found")
        notification.unread = False


def mark_all_notifications_read() -> None:
    """Mark every notification as read."""
    with session_scope() as session:
        session.execute(
            update(Notification)
            .where(Notification.user_id == require_user(session).id)
            .values(unread=False)
        )


def save_email_link(provider: str, email: str) -> dict[str, Any]:
    """Link an email address to a provider, replacing a previous address."""
    clean: str = (email or "").strip()
    if provider not in EMAIL_PROVIDERS:
        raise ApiError("invalid_provider")
    if not clean:
        raise ApiError("invalid_email")
    with session_scope() as session:
        user_id: str = require_user(session).id
        link: EmailLink | None = session.get(EmailLink, (user_id, provider))
        if link is None:
            link = EmailLink(
                user_id=user_id, provider=provider, email=clean, linked_at=now_ms()
            )
            session.add(link)
            session.flush()
        else:
            link.email = clean
        return serialize_email_link(link)


def delete_email_link(provider: str) -> None:
    """Unlink the email address of a provider."""
    with session_scope() as session:
        link: EmailLink | None = session.get(EmailLink, (require_user(session).id, provider))
        if link is not None:
            session.delete(link)


def mark_email_link_sent(provider: str) -> None:
    """Record that a backup was just sent through a provider."""
    with session_scope() as session:
        link: EmailLink | None = session.get(EmailLink, (require_user(session).id, provider))
        if link is None:
            raise ApiError("invalid_provider")
        link.last_sent_at = now_ms()
