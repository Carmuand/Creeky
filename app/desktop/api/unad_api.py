"""
UNAD Campus integration API. Every call works on the account linked by
the signed-in user.
"""

# Standard library
from __future__ import annotations
from typing import Any

# Third-party
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

# Project imports
from desktop.api.auth_api import require_user
from desktop.api.notification_api import add_notification
from desktop.api.settings_api import read_language
from desktop.core import credentials
from desktop.core.errors import ApiError
from desktop.core.unad_service import (
    MAX_DEADLINE_DAYS,
    MAX_INTERVAL_MINUTES,
    MIN_INTERVAL_MINUTES,
    apply_agenda,
    apply_profile,
    fetch_agenda,
    sync_user,
    unad_service,
    verify_credentials,
)
from desktop.database.engine import session_scope
from desktop.database.models import UnadAccount, UnadActivity, UnadAgenda
from desktop.unad.client import DOCUMENT_TYPES
from desktop.unad.parser import extract_agenda_code
from desktop.unad.schemas import CampusProfile, CourseAgenda
from desktop.utills.dates import new_id, now_ms
from desktop.utills.logger import log, Tags

_AGENDA_COLORS: tuple[str, ...] = (
    "#0277BD",
    "#6A1B9A",
    "#00897B",
    "#EF6C00",
    "#C62828",
    "#3949AB",
    "#2E7D32",
    "#AD1457",
)


def _serialize_activity(activity: UnadActivity) -> dict[str, Any]:
    """Return an agenda activity."""
    return {
        "id": activity.id,
        "section": activity.section,
        "moment": activity.moment,
        "rac": activity.rac,
        "name": activity.name,
        "description": activity.description,
        "type": activity.activity_type,
        "weight": activity.weight,
        "startsAt": activity.starts_at,
        "endsAt": activity.ends_at,
        "startRaw": activity.start_raw,
        "endRaw": activity.end_raw,
        "alert": activity.alert,
        "feedback": activity.feedback,
    }


def _serialize_agenda(agenda: UnadAgenda) -> dict[str, Any]:
    """Return a followed agenda with its activities."""
    return {
        "id": agenda.id,
        "code": agenda.code,
        "url": agenda.url,
        "name": agenda.name,
        "credits": agenda.credits,
        "period": agenda.period,
        "color": agenda.color,
        "syncedAt": agenda.synced_at,
        "activities": [_serialize_activity(activity) for activity in agenda.activities],
    }


def serialize_unad(session: Session, user_id: str) -> dict[str, Any]:
    """
    Return the UNAD state of a user for the frontend store.

    Returns:
        Whether an account is linked, its settings, the campus profile and
        the followed agendas.
    """
    account: UnadAccount | None = session.get(UnadAccount, user_id)
    agendas: list[UnadAgenda] = list(
        session.scalars(
            select(UnadAgenda)
            .options(selectinload(UnadAgenda.activities))
            .where(UnadAgenda.user_id == user_id)
            .order_by(UnadAgenda.position)
        )
    )
    if account is None:
        return {"connected": False, "account": None, "profile": None, "agendas": []}
    return {
        "connected": True,
        "account": {
            "documentType": account.document_type,
            "document": account.document,
            "enabled": account.enabled,
            "intervalMinutes": account.interval_minutes,
            "deadlineDays": account.deadline_days,
            "lastSyncAt": account.last_sync_at,
            "lastError": account.last_error,
        },
        "profile": {
            "campusUserId": account.campus_user_id,
            "fullName": account.full_name,
            "firstName": account.first_name,
            "secondName": account.second_name,
            "firstSurname": account.first_surname,
            "secondSurname": account.second_surname,
            "institutionalEmail": account.institutional_email,
            "notificationEmail": account.notification_email,
            "personalEmail": account.personal_email,
            "phone": account.phone,
            "birthDate": account.birth_date,
            "maritalStatus": account.marital_status,
            "bloodType": account.blood_type,
            "zone": account.zone,
            "stratum": account.stratum,
            "address": account.address,
            "updatedAt": account.profile_updated_at,
        },
        "agendas": [_serialize_agenda(agenda) for agenda in agendas],
    }


def _require_account(session: Session, user_id: str) -> UnadAccount:
    """Return the linked account of a user or fail when there is none."""
    account: UnadAccount | None = session.get(UnadAccount, user_id)
    if account is None:
        raise ApiError("unad_not_connected")
    return account


def connect(document_type: str, document: str, password: str) -> dict[str, Any]:
    """
    Link the UNAD Campus account of the signed-in user.

    The credentials are verified by signing in and reading the profile
    before anything is stored. The password goes to the system credential
    manager. Linking counts as the first synchronization, so the service
    does not sign in again until the interval elapses.

    Returns:
        The UNAD state of the user.
    """
    clean_document: str = (document or "").strip()
    if document_type not in DOCUMENT_TYPES:
        raise ApiError("unad_invalid_document")
    if not clean_document.isdigit() or not password:
        raise ApiError("unad_invalid_document")
    with session_scope() as session:
        user_id: str = require_user(session).id
    profile: CampusProfile = verify_credentials(document_type, clean_document, password)
    credentials.store_unad_password(user_id, password)
    with session_scope() as session:
        account: UnadAccount | None = session.get(UnadAccount, user_id)
        if account is None:
            account = UnadAccount(
                user_id=user_id,
                document=clean_document,
                enabled=True,
                interval_minutes=30,
                deadline_days=2,
                last_error="",
            )
            session.add(account)
        account.document_type = document_type
        account.document = clean_document
        account.enabled = True
        account.last_error = ""
        account.last_sync_at = now_ms()
        apply_profile(account, profile)
        session.flush()
        state: dict[str, Any] = serialize_unad(session, user_id)
    log("SUCCESS", Tags.UNAD, f"UNAD account linked for {user_id}")
    return state


def disconnect() -> None:
    """Unlink the UNAD account, removing its agendas, profile and stored password."""
    with session_scope() as session:
        user_id: str = require_user(session).id
        account: UnadAccount | None = session.get(UnadAccount, user_id)
        if account is not None:
            session.delete(account)
        for agenda in session.scalars(select(UnadAgenda).where(UnadAgenda.user_id == user_id)):
            session.delete(agenda)
    credentials.delete_unad_password(user_id)
    log("INFO", Tags.UNAD, f"UNAD account unlinked for {user_id}")


def update_settings(patch: dict[str, Any]) -> dict[str, Any]:
    """
    Change whether the service runs, how often it syncs and the deadline lead time.

    Args:
        patch: Any of ``enabled``, ``intervalMinutes`` and ``deadlineDays``.

    Returns:
        The UNAD state of the user.
    """
    with session_scope() as session:
        user_id: str = require_user(session).id
        account: UnadAccount = _require_account(session, user_id)
        if "enabled" in patch:
            account.enabled = bool(patch["enabled"])
        if "intervalMinutes" in patch:
            minutes: int = int(patch["intervalMinutes"])
            if not MIN_INTERVAL_MINUTES <= minutes <= MAX_INTERVAL_MINUTES:
                raise ApiError("unad_invalid_interval")
            account.interval_minutes = minutes
        if "deadlineDays" in patch:
            days: int = int(patch["deadlineDays"])
            if not 0 <= days <= MAX_DEADLINE_DAYS:
                raise ApiError("unad_invalid_deadline")
            if days != account.deadline_days:
                account.deadline_days = days
                for agenda in session.scalars(
                    select(UnadAgenda)
                    .options(selectinload(UnadAgenda.activities))
                    .where(UnadAgenda.user_id == user_id)
                ):
                    for activity in agenda.activities:
                        activity.notified_deadline = False
        session.flush()
        state: dict[str, Any] = serialize_unad(session, user_id)
    unad_service.request_sync()
    return state


def add_agenda(url: str) -> dict[str, Any]:
    """
    Follow a course agenda and download it right away.

    Args:
        url: Agenda page hosted by UNAD, ending in ``<code>.htm``.

    Returns:
        The stored agenda with its activities.
    """
    clean_url: str = (url or "").strip()
    code: str | None = extract_agenda_code(clean_url)
    if code is None:
        raise ApiError("unad_invalid_agenda_url")
    with session_scope() as session:
        user_id: str = require_user(session).id
        _require_account(session, user_id)
        duplicate: UnadAgenda | None = session.scalar(
            select(UnadAgenda).where(UnadAgenda.user_id == user_id, UnadAgenda.code == code)
        )
        if duplicate is not None:
            raise ApiError("unad_agenda_exists")
    parsed: CourseAgenda = fetch_agenda(clean_url, code)
    with session_scope() as session:
        count: int = (
            session.scalar(
                select(func.count()).select_from(UnadAgenda).where(UnadAgenda.user_id == user_id)
            )
            or 0
        )
        agenda: UnadAgenda = UnadAgenda(
            id=new_id("ua"),
            user_id=user_id,
            code=code,
            url=clean_url,
            color=_AGENDA_COLORS[count % len(_AGENDA_COLORS)],
            position=count,
            synced_at=None,
            activities=[],
        )
        session.add(agenda)
        for notice in apply_agenda(agenda, parsed, read_language(session)):
            add_notification(session, user_id, notice.title, notice.text, "unad")
        session.flush()
        result: dict[str, Any] = _serialize_agenda(agenda)
    log("SUCCESS", Tags.UNAD, f"Agenda {code} followed with {len(parsed.activities)} activities")
    unad_service.request_sync()
    return result


def remove_agenda(agenda_id: str) -> None:
    """Stop following an agenda and delete its activities."""
    with session_scope() as session:
        agenda: UnadAgenda | None = session.scalar(
            select(UnadAgenda).where(
                UnadAgenda.user_id == require_user(session).id, UnadAgenda.id == agenda_id
            )
        )
        if agenda is None:
            raise ApiError("unad_agenda_not_found")
        session.delete(agenda)


def sync_now() -> dict[str, Any]:
    """
    Synchronize the profile and the agendas immediately.

    Returns:
        The error code of the run, empty on success, and the agendas refreshed.
    """
    with session_scope() as session:
        user_id: str = require_user(session).id
        _require_account(session, user_id)
    return sync_user(user_id)
