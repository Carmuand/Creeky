"""
UNAD Campus synchronization service.

Signs in to the campus with the credentials of the signed-in user, reads
the profile, scrapes the followed agendas, detects changes and reminds of
activities that open or are about to close. It runs on a daemon thread
and only publishes events for the frontend.
"""

# Standard library
from __future__ import annotations
import threading
from dataclasses import dataclass, field
from datetime import date, datetime

# Third-party
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

# Project imports
from desktop.api.auth_api import current_user
from desktop.api.notification_api import add_notification, desktop_enabled
from desktop.api.settings_api import read_language
from desktop.core import credentials
from desktop.core.errors import ApiError
from desktop.core.events import events
from desktop.core.messages import translate
from desktop.core.notices import send_desktop_notice
from desktop.database.engine import session_scope
from desktop.database.models import UnadAccount, UnadActivity, UnadAgenda
from desktop.unad.client import CampusClient, CampusUnreachable
from desktop.unad.parser import parse_agenda, parse_profile
from desktop.unad.schemas import AgendaActivity, CampusProfile, CourseAgenda
from desktop.utills.dates import now_ms, today_iso
from desktop.utills.logger import log, Tags

MIN_INTERVAL_MINUTES: int = 5
MAX_INTERVAL_MINUTES: int = 1440
MAX_DEADLINE_DAYS: int = 14

_TICK_SECONDS: float = 60.0
_FIRST_TICK_DELAY_SECONDS: float = 8.0
_PROFILE_FIELDS: tuple[str, ...] = (
    "campus_user_id",
    "full_name",
    "first_name",
    "second_name",
    "first_surname",
    "second_surname",
    "institutional_email",
    "notification_email",
    "personal_email",
    "phone",
    "birth_date",
    "marital_status",
    "blood_type",
    "zone",
    "stratum",
    "address",
)
_ACTIVITY_FIELDS: tuple[str, ...] = (
    "section",
    "moment",
    "rac",
    "name",
    "description",
    "activity_type",
    "weight",
    "start_raw",
    "end_raw",
    "starts_at",
    "ends_at",
    "alert",
    "feedback",
)

_sync_lock: threading.Lock = threading.Lock()


@dataclass
class _Notice:
    """Notification produced by a sync or a reminder pass."""

    category: str
    title: str
    text: str


@dataclass
class _Fetched:
    """Data downloaded from the campus during one sync."""

    profile: CampusProfile | None = None
    agendas: dict[str, CourseAgenda] = field(default_factory=dict)
    error: str = ""


def format_moment(moment: str) -> str:
    """Return ``YYYY-MM-DDTHH:MM`` as ``DD/MM/YYYY HH:MM`` for messages."""
    try:
        return datetime.fromisoformat(moment).strftime("%d/%m/%Y %H:%M")
    except ValueError:
        return moment


def apply_profile(account: UnadAccount, profile: CampusProfile) -> None:
    """Copy the profile read from the campus onto the stored account."""
    for name in _PROFILE_FIELDS:
        setattr(account, name, getattr(profile, name))
    account.profile_updated_at = now_ms()


def verify_credentials(document_type: str, document: str, password: str) -> CampusProfile:
    """
    Sign in to the campus and read the profile to prove the credentials work.

    Raises:
        ApiError: ``unad_invalid_credentials`` when the campus rejects them,
            ``unad_unreachable`` when it cannot be reached and
            ``unad_profile_unreadable`` when the profile page changed.
    """
    client: CampusClient = CampusClient()
    try:
        if not client.login(document_type, document, password):
            raise ApiError("unad_invalid_credentials")
        return parse_profile(client.fetch_profile_html())
    except CampusUnreachable as error:
        log("ERROR", Tags.UNAD, f"Campus unreachable: {error}")
        raise ApiError("unad_unreachable") from error
    except ValueError as error:
        raise ApiError("unad_profile_unreadable") from error
    finally:
        client.close()


def fetch_agenda(url: str, code: str) -> CourseAgenda:
    """
    Download and parse one agenda page.

    Raises:
        ApiError: ``unad_unreachable`` or ``unad_agenda_unreadable``.
    """
    client: CampusClient = CampusClient()
    try:
        return parse_agenda(client.fetch_agenda_html(url), code)
    except CampusUnreachable as error:
        raise ApiError("unad_unreachable") from error
    except ValueError as error:
        raise ApiError("unad_agenda_unreadable") from error
    finally:
        client.close()


def apply_agenda(
    agenda: UnadAgenda, parsed: CourseAgenda, language: str
) -> list[_Notice]:
    """
    Store a freshly parsed agenda and describe what changed.

    Activities are matched by section and name. A matched activity keeps
    its reminder flags unless its dates moved.

    Returns:
        Change notices; a first sync yields a single summary notice.
    """
    first_sync: bool = agenda.synced_at is None
    agenda.name = parsed.name
    agenda.credits = parsed.credits
    agenda.period = parsed.period
    agenda.synced_at = now_ms()
    course: str = parsed.name or agenda.code
    notices: list[_Notice] = []
    title: str = translate(language, "unad_title")
    existing: dict[tuple[str, str], UnadActivity] = {
        (activity.section, activity.name): activity for activity in agenda.activities
    }
    kept: set[tuple[str, str]] = set()

    for position, item in enumerate(parsed.activities):
        key: tuple[str, str] = (item.section, item.name)
        kept.add(key)
        stored: UnadActivity | None = existing.get(key)
        if stored is None:
            agenda.activities.append(_new_activity(item, position))
            if not first_sync:
                notices.append(
                    _Notice(
                        "unad_changes",
                        title,
                        translate(
                            language,
                            "unad_activity_new",
                            course=course,
                            name=item.name,
                            end=format_moment(item.ends_at) or item.end_raw,
                        ),
                    )
                )
            continue
        moved: bool = stored.starts_at != item.starts_at or stored.ends_at != item.ends_at
        if stored.starts_at != item.starts_at:
            stored.notified_opening = False
        if stored.ends_at != item.ends_at:
            stored.notified_deadline = False
        for name in _ACTIVITY_FIELDS:
            setattr(stored, name, getattr(item, name))
        stored.position = position
        if moved:
            notices.append(
                _Notice(
                    "unad_changes",
                    title,
                    translate(
                        language,
                        "unad_activity_changed",
                        course=course,
                        name=item.name,
                        start=format_moment(item.starts_at) or item.start_raw,
                        end=format_moment(item.ends_at) or item.end_raw,
                    ),
                )
            )

    for key, stored in existing.items():
        if key in kept:
            continue
        agenda.activities.remove(stored)
        notices.append(
            _Notice(
                "unad_changes",
                title,
                translate(language, "unad_activity_removed", course=course, name=stored.name),
            )
        )

    if first_sync:
        return [
            _Notice(
                "unad_changes",
                title,
                translate(
                    language, "unad_agenda_added", course=course, count=len(parsed.activities)
                ),
            )
        ]
    return notices


def _new_activity(item: AgendaActivity, position: int) -> UnadActivity:
    """Build a stored activity from a parsed one."""
    activity: UnadActivity = UnadActivity(
        position=position, notified_opening=False, notified_deadline=False
    )
    for name in _ACTIVITY_FIELDS:
        setattr(activity, name, getattr(item, name))
    return activity


def _collect_reminders(
    session: Session, account: UnadAccount, language: str
) -> list[_Notice]:
    """Mark activities that open today or close soon as reminded and return their notices."""
    today: date = date.fromisoformat(today_iso())
    notices: list[_Notice] = []
    agendas: list[UnadAgenda] = list(
        session.scalars(
            select(UnadAgenda)
            .options(selectinload(UnadAgenda.activities))
            .where(UnadAgenda.user_id == account.user_id)
        )
    )
    for agenda in agendas:
        course: str = agenda.name or agenda.code
        for activity in agenda.activities:
            if not activity.notified_opening and activity.starts_at:
                opens: date = date.fromisoformat(activity.starts_at[:10])
                if opens <= today:
                    activity.notified_opening = True
                    if opens == today:
                        notices.append(
                            _Notice(
                                "unad_opening",
                                translate(language, "unad_opening_title"),
                                translate(
                                    language,
                                    "unad_opening",
                                    name=activity.name,
                                    course=course,
                                    end=format_moment(activity.ends_at) or activity.end_raw,
                                ),
                            )
                        )
            if not activity.notified_deadline and activity.ends_at:
                days_left: int = (date.fromisoformat(activity.ends_at[:10]) - today).days
                if days_left < 0:
                    activity.notified_deadline = True
                elif days_left <= account.deadline_days:
                    activity.notified_deadline = True
                    text: str = (
                        translate(
                            language,
                            "unad_deadline_today",
                            name=activity.name,
                            course=course,
                            time=activity.ends_at[11:],
                        )
                        if days_left == 0
                        else translate(
                            language,
                            "unad_deadline",
                            name=activity.name,
                            course=course,
                            days=days_left,
                            end=format_moment(activity.ends_at),
                        )
                    )
                    notices.append(
                        _Notice("unad_deadline", translate(language, "unad_deadline_title"), text)
                    )
    return notices


def _publish(session: Session, user_id: str, notices: list[_Notice]) -> list[_Notice]:
    """Store the notices in the app and return those that also go to the desktop."""
    desktop: list[_Notice] = []
    for notice in notices:
        add_notification(session, user_id, notice.title, notice.text, "unad")
        session.flush()
        if desktop_enabled(session, user_id, notice.category):
            desktop.append(notice)
    return desktop


def _download(account: UnadAccount, agendas: list[tuple[str, str, str]]) -> _Fetched:
    """
    Download the profile and the agendas of an account.

    Args:
        account: Linked account with the document used to sign in.
        agendas: Identifier, URL and code of each followed agenda.
    """
    fetched: _Fetched = _Fetched()
    password: str | None = credentials.read_unad_password(account.user_id)
    client: CampusClient = CampusClient()
    try:
        try:
            if not password or not client.login(account.document_type, account.document, password):
                fetched.error = "unad_invalid_credentials"
            else:
                fetched.profile = parse_profile(client.fetch_profile_html())
        except CampusUnreachable as error:
            log("ERROR", Tags.UNAD, f"Campus unreachable: {error}")
            fetched.error = "unad_unreachable"
        except ValueError:
            fetched.error = "unad_profile_unreadable"
        for agenda_id, url, code in agendas:
            try:
                fetched.agendas[agenda_id] = parse_agenda(client.fetch_agenda_html(url), code)
            except CampusUnreachable as error:
                log("ERROR", Tags.UNAD, f"Agenda {code} unreachable: {error}")
                fetched.error = fetched.error or "unad_unreachable"
            except ValueError:
                log("ERROR", Tags.UNAD, f"Agenda {code} could not be parsed")
                fetched.error = fetched.error or "unad_agenda_unreadable"
    finally:
        client.close()
    return fetched


def sync_user(user_id: str) -> dict[str, object]:
    """
    Run a full synchronization for a user.

    Returns:
        The error code of the run (empty on success) and the number of
        agendas refreshed.
    """
    with _sync_lock:
        with session_scope() as session:
            account: UnadAccount | None = session.get(UnadAccount, user_id)
            if account is None:
                raise ApiError("unad_not_connected")
            session.expunge(account)
            agendas: list[tuple[str, str, str]] = [
                (agenda.id, agenda.url, agenda.code)
                for agenda in session.scalars(
                    select(UnadAgenda).where(UnadAgenda.user_id == user_id)
                )
            ]
        fetched: _Fetched = _download(account, agendas)

        with session_scope() as session:
            stored: UnadAccount | None = session.get(UnadAccount, user_id)
            if stored is None:
                raise ApiError("unad_not_connected")
            language: str = read_language(session)
            notices: list[_Notice] = []
            if fetched.profile is not None:
                apply_profile(stored, fetched.profile)
            if (
                fetched.error == "unad_invalid_credentials"
                and stored.last_error != "unad_invalid_credentials"
            ):
                notices.append(
                    _Notice(
                        "unad_changes",
                        translate(language, "unad_title"),
                        translate(language, "unad_login_failed"),
                    )
                )
            for agenda in session.scalars(
                select(UnadAgenda)
                .options(selectinload(UnadAgenda.activities))
                .where(UnadAgenda.user_id == user_id)
            ):
                parsed: CourseAgenda | None = fetched.agendas.get(agenda.id)
                if parsed is not None:
                    notices.extend(apply_agenda(agenda, parsed, language))
            session.flush()
            notices.extend(_collect_reminders(session, stored, language))
            stored.last_sync_at = now_ms()
            stored.last_error = fetched.error
            desktop: list[_Notice] = _publish(session, user_id, notices)

    for notice in desktop:
        send_desktop_notice(notice.title, notice.text)
    events.emit("data:changed", {"source": "unad"})
    log(
        "INFO" if not fetched.error else "WARNING",
        Tags.UNAD,
        f"Sync finished: {len(fetched.agendas)} agenda(s), error={fetched.error or 'none'}",
    )
    return {"error": fetched.error, "agendas": len(fetched.agendas)}


def check_reminders(user_id: str) -> None:
    """Remind a user of activities that open today or close soon, without contacting the campus."""
    with session_scope() as session:
        account: UnadAccount | None = session.get(UnadAccount, user_id)
        if account is None or not account.enabled:
            return
        notices: list[_Notice] = _collect_reminders(session, account, read_language(session))
        desktop: list[_Notice] = _publish(session, user_id, notices)
    if not notices:
        return
    for notice in desktop:
        send_desktop_notice(notice.title, notice.text)
    events.emit("data:changed", {"source": "unad"})


class UnadService:
    """Periodically syncs the UNAD data of the signed-in user on a daemon thread."""

    def __init__(self) -> None:
        self._thread: threading.Thread | None = None
        self._stop: threading.Event = threading.Event()
        self._wake: threading.Event = threading.Event()

    def start(self) -> None:
        """Start the periodic synchronization."""
        if self._thread is not None:
            return
        self._thread = threading.Thread(target=self._run, name="creeky-unad", daemon=True)
        self._thread.start()
        log("INFO", Tags.UNAD, "UNAD service started")

    def stop(self) -> None:
        """Stop the periodic synchronization."""
        self._stop.set()
        self._wake.set()

    def request_sync(self) -> None:
        """Ask the service to evaluate the schedule right away."""
        self._wake.set()

    def _due_user(self) -> tuple[str | None, bool]:
        """Return the signed-in user with an enabled account and whether a sync is due."""
        with session_scope() as session:
            user = current_user(session)
            if user is None:
                return None, False
            account: UnadAccount | None = session.get(UnadAccount, user.id)
            if account is None or not account.enabled:
                return None, False
            elapsed_ms: int = now_ms() - (account.last_sync_at or 0)
            return user.id, elapsed_ms >= account.interval_minutes * 60_000

    def _run(self) -> None:
        """Sync when the interval elapsed and check reminders every tick."""
        delay: float = _FIRST_TICK_DELAY_SECONDS
        while True:
            self._wake.wait(delay)
            self._wake.clear()
            if self._stop.is_set():
                return
            delay = _TICK_SECONDS
            try:
                user_id, due = self._due_user()
                if user_id is None:
                    continue
                if due:
                    sync_user(user_id)
                else:
                    check_reminders(user_id)
            except Exception as error:
                log("ERROR", Tags.UNAD, f"UNAD service pass failed: {error!r}")


unad_service: UnadService = UnadService()
