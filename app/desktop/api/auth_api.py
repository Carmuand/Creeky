"""
Authentication and profile API.

Accounts are stored in the database while password hashes and the active
session are kept in the system credential manager.
"""

# Standard library
from __future__ import annotations
import re
from typing import Any

# Third-party
from sqlalchemy import select
from sqlalchemy.orm import Session

# Project imports
from desktop.core import credentials
from desktop.core.errors import ApiError
from desktop.database.engine import session_scope
from desktop.database.models import User
from desktop.database.serializers import serialize_user
from desktop.utills.dates import new_id, now_ms
from desktop.utills.logger import log, Tags

_EMAIL_PATTERN: re.Pattern[str] = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
_MIN_PASSWORD_LENGTH: int = 4


def current_user(session: Session) -> User | None:
    """Return the signed-in user, clearing a session that points to a missing account."""
    user_id: str | None = credentials.read_session()
    if not user_id:
        return None
    user: User | None = session.get(User, user_id)
    if user is None:
        credentials.clear_session()
    return user


def _require_user(session: Session) -> User:
    """Return the signed-in user or fail when there is no session."""
    user: User | None = current_user(session)
    if user is None:
        raise ApiError("not_authenticated")
    return user


def _find_by_email(session: Session, email: str) -> User | None:
    """Return the account registered with the given email."""
    return session.scalar(select(User).where(User.email == email))


def sign_up(name: str, email: str, password: str) -> dict[str, Any]:
    """Create an account, store its password hash and start a session."""
    clean_name: str = (name or "").strip()
    clean_email: str = (email or "").strip()
    if not clean_name:
        raise ApiError("name_required")
    if not _EMAIL_PATTERN.match(clean_email):
        raise ApiError("invalid_email")
    if len(password or "") < _MIN_PASSWORD_LENGTH:
        raise ApiError("weak_password")
    with session_scope() as session:
        if _find_by_email(session, clean_email) is not None:
            raise ApiError("email_taken")
        user: User = User(
            id=new_id("u"), name=clean_name, email=clean_email, created_at=now_ms()
        )
        session.add(user)
        session.flush()
        credentials.store_password(user.id, password)
        credentials.store_session(user.id)
        log("SUCCESS", Tags.AUTH, f"Account created: {user.id}")
        return serialize_user(user)


def sign_in(email: str, password: str) -> dict[str, Any]:
    """Verify the credentials and start a session."""
    with session_scope() as session:
        user: User | None = _find_by_email(session, (email or "").strip())
        if user is None or not credentials.check_password(user.id, password or ""):
            raise ApiError("invalid_credentials")
        credentials.store_session(user.id)
        log("INFO", Tags.AUTH, f"Session started: {user.id}")
        return serialize_user(user)


def sign_out() -> None:
    """End the active session."""
    credentials.clear_session()
    log("INFO", Tags.AUTH, "Session closed")


def update_profile(name: str, email: str, password: str | None = None) -> dict[str, Any]:
    """Update the signed-in user's name and email, and optionally the password."""
    clean_name: str = (name or "").strip()
    clean_email: str = (email or "").strip()
    if not clean_name:
        raise ApiError("name_required")
    if not _EMAIL_PATTERN.match(clean_email):
        raise ApiError("invalid_email")
    if password and len(password) < _MIN_PASSWORD_LENGTH:
        raise ApiError("weak_password")
    with session_scope() as session:
        user: User = _require_user(session)
        other: User | None = _find_by_email(session, clean_email)
        if other is not None and other.id != user.id:
            raise ApiError("email_taken")
        user.name = clean_name
        user.email = clean_email
        if password:
            credentials.store_password(user.id, password)
        return serialize_user(user)


def set_avatar(data_url: str | None) -> dict[str, Any]:
    """Set or remove the signed-in user's profile photo."""
    with session_scope() as session:
        user: User = _require_user(session)
        user.avatar = data_url or None
        return serialize_user(user)


def delete_all_credentials() -> None:
    """Remove every stored password hash and the active session."""
    with session_scope() as session:
        user_ids: list[str] = list(session.scalars(select(User.id)))
    for user_id in user_ids:
        credentials.delete_password(user_id)
    credentials.clear_session()
