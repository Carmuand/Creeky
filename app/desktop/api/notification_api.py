"""
In-app notifications and linked email providers API.
"""

# Standard library
from __future__ import annotations
from typing import Any

# Third-party
from sqlalchemy import select, update
from sqlalchemy.orm import Session

# Project imports
from desktop.core.errors import ApiError
from desktop.database.engine import session_scope
from desktop.database.models import EmailLink, Notification
from desktop.database.serializers import serialize_email_link
from desktop.utills.dates import new_id, now_ms

NOTIFICATION_KINDS: tuple[str, ...] = ("system", "calendar", "reminder")
EMAIL_PROVIDERS: tuple[str, ...] = ("gmail", "outlook", "apple")


def add_notification(session: Session, title: str, text: str, kind: str = "system") -> Notification:
    """Insert an unread notification and return it."""
    notification: Notification = Notification(
        id=new_id("n"),
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
        for item in items:
            add_notification(
                session,
                str(item.get("title") or ""),
                str(item.get("text") or ""),
                str(item.get("kind") or "system"),
            )
            session.flush()
    return len(items)


def mark_notification_read(notification_id: str) -> None:
    """Mark one notification as read."""
    with session_scope() as session:
        notification: Notification | None = session.get(Notification, notification_id)
        if notification is None:
            raise ApiError("notification_not_found")
        notification.unread = False


def mark_all_notifications_read() -> None:
    """Mark every notification as read."""
    with session_scope() as session:
        session.execute(update(Notification).values(unread=False))


def save_email_link(provider: str, email: str) -> dict[str, Any]:
    """Link an email address to a provider, replacing a previous address."""
    clean: str = (email or "").strip()
    if provider not in EMAIL_PROVIDERS:
        raise ApiError("invalid_provider")
    if not clean:
        raise ApiError("invalid_email")
    with session_scope() as session:
        link: EmailLink | None = session.get(EmailLink, provider)
        if link is None:
            link = EmailLink(provider=provider, email=clean, linked_at=now_ms())
            session.add(link)
            session.flush()
        else:
            link.email = clean
        return serialize_email_link(link)


def delete_email_link(provider: str) -> None:
    """Unlink the email address of a provider."""
    with session_scope() as session:
        link: EmailLink | None = session.get(EmailLink, provider)
        if link is not None:
            session.delete(link)


def mark_email_link_sent(provider: str) -> None:
    """Record that a backup was just sent through a provider."""
    with session_scope() as session:
        link: EmailLink | None = session.scalar(
            select(EmailLink).where(EmailLink.provider == provider)
        )
        if link is None:
            raise ApiError("invalid_provider")
        link.last_sent_at = now_ms()
