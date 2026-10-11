"""
Application snapshot, encrypted backup export and import, and account wipe API.
"""

# Standard library
from __future__ import annotations
from datetime import date
from pathlib import Path
from typing import Any

# Third-party
import webview
from sqlalchemy import delete
from sqlalchemy.orm import Session

# Project imports
from desktop.api.auth_api import current_user, delete_account, require_user
from desktop.api.notification_api import DESKTOP_CATEGORIES, read_preferences
from desktop.api.settings_api import (
    read_focus,
    read_language,
    read_sidebar_collapsed,
    read_theme,
)
from desktop.api.task_api import apply_task_patch, resolve_tags
from desktop.api.unad_api import serialize_unad
from desktop.core.backup_crypto import decrypt_backup, encrypt_backup, generate_recovery_key
from desktop.core.errors import ApiError
from desktop.database.engine import session_scope
from desktop.database.models import (
    Countdown,
    Habit,
    HabitCheck,
    MatrixNote,
    Notification,
    PomodoroSession,
    Tag,
    Task,
    TaskList,
    User,
)
from desktop.database.seed import DEFAULT_LIST_ICON, DEFAULT_TAGS, INBOX_ALIAS
from desktop.database.serializers import (
    QUADRANTS,
    build_collections,
    empty_collections,
    serialize_user,
)
from desktop.utills.dates import add_days_iso, new_id, now_ms, today_iso
from desktop.utills.logger import log, Tags

BACKUP_FILENAME: str = "creeky-backup.dat"
_BACKUP_FILE_TYPES: tuple[str, ...] = ("Creeky backup (*.dat)",)
_BACKUP_FORMAT: int = 1


def get_snapshot() -> dict[str, Any]:
    """Return the application state of the signed-in user for the frontend store."""
    with session_scope() as session:
        user: User | None = current_user(session)
        collections: dict[str, Any] = (
            build_collections(session, user.id) if user is not None else empty_collections()
        )
        return {
            "user": serialize_user(user) if user is not None else None,
            **collections,
            "focus": read_focus(session, user.id) if user is not None else None,
            "unad": serialize_unad(session, user.id)
            if user is not None
            else {"connected": False, "account": None, "profile": None, "agendas": []},
            "notificationPrefs": read_preferences(session, user.id)
            if user is not None
            else {category: True for category in DESKTOP_CATEGORIES},
            "settings": {
                "theme": read_theme(session),
                "language": read_language(session),
                "sidebarCollapsed": read_sidebar_collapsed(session),
            },
        }


def _pick_path(dialog_type: Any, save_filename: str = "") -> Path | None:
    """Show a native file dialog and return the chosen path, or None when cancelled."""
    if not webview.windows:
        raise ApiError("dialog_unavailable")
    chosen: Any = webview.windows[0].create_file_dialog(
        dialog_type, save_filename=save_filename, file_types=_BACKUP_FILE_TYPES
    )
    if not chosen:
        return None
    return Path(chosen if isinstance(chosen, str) else chosen[0])


def export_backup() -> dict[str, Any]:
    """
    Save an encrypted backup of the signed-in user's data.

    A native dialog asks where to store the file. A new recovery key is
    generated for every backup and returned once; it is never stored.

    Returns:
        ``cancelled`` when the dialog was dismissed, otherwise the file
        path, its size in bytes and the recovery key.
    """
    with session_scope() as session:
        user: User = require_user(session)
        document: dict[str, Any] = {
            "format": _BACKUP_FORMAT,
            "exportedAt": now_ms(),
            **build_collections(session, user.id),
        }
    path: Path | None = _pick_path(webview.FileDialog.SAVE, BACKUP_FILENAME)
    if path is None:
        return {"cancelled": True}
    recovery_key: str = generate_recovery_key()
    blob: bytes = encrypt_backup(document, recovery_key)
    try:
        path.write_bytes(blob)
    except OSError as error:
        log("ERROR", Tags.DATABASE, f"Could not write backup: {error!r}")
        raise ApiError("backup_write_failed") from error
    log("SUCCESS", Tags.DATABASE, f"Encrypted backup written to {path}")
    return {"cancelled": False, "path": str(path), "size": len(blob), "key": recovery_key}


def _as_list(value: Any) -> list[Any]:
    """Return the value when it is a list, otherwise an empty list."""
    return value if isinstance(value, list) else []


def _week_monday(week_key: Any) -> str | None:
    """Return the Monday of a ``YYYY-Wnn`` week identifier."""
    try:
        year_text, week_text = str(week_key).split("-W")
        return date.fromisocalendar(int(year_text), int(week_text), 1).isoformat()
    except ValueError:
        return None


def _clear_user_data(session: Session, user_id: str) -> None:
    """Delete every collection owned by a user, keeping the account itself."""
    for model in (PomodoroSession, Task, TaskList, Tag, Habit, MatrixNote, Countdown, Notification):
        session.execute(delete(model).where(model.user_id == user_id))
    session.flush()
    session.expire_all()


def _import_lists(session: Session, user_id: str, items: list[Any]) -> dict[str, str]:
    """
    Insert the lists of a backup, guaranteeing that one inbox exists.

    Returns:
        The new list identifier for each identifier used in the backup.
    """
    mapping: dict[str, str] = {}
    for index, item in enumerate(items):
        source_id: str = str(item.get("id") or "")
        if not source_id or source_id in mapping:
            continue
        mapping[source_id] = new_id("l")
        session.add(
            TaskList(
                id=mapping[source_id],
                user_id=user_id,
                is_inbox=source_id == INBOX_ALIAS,
                name=str(item.get("name") or source_id),
                description=str(item.get("description") or ""),
                color=str(item.get("color") or "#616161"),
                icon=str(item.get("icon") or DEFAULT_LIST_ICON),
                position=index,
            )
        )
    if INBOX_ALIAS not in mapping:
        mapping[INBOX_ALIAS] = new_id("l")
        session.add(
            TaskList(
                id=mapping[INBOX_ALIAS],
                user_id=user_id,
                is_inbox=True,
                name="Inbox",
                description="",
                color="#212121",
                icon=DEFAULT_LIST_ICON,
                position=-1,
            )
        )
    session.flush()
    return mapping


def _import_tasks(
    session: Session, user_id: str, items: list[Any], lists: dict[str, str]
) -> None:
    """Insert the tasks of a backup preserving their order."""
    for index, item in enumerate(items):
        title: str = str(item.get("title") or "").strip()
        if not title:
            continue
        deleted: bool = bool(item.get("deleted"))
        task: Task = Task(
            id=new_id("t"),
            user_id=user_id,
            title=title,
            list_id=lists.get(str(item.get("list") or ""), lists[INBOX_ALIAS]),
            created_at=int(item.get("createdAt") or now_ms()),
            position=index,
            deleted=deleted,
            deleted_at=item.get("deletedAt") if deleted else None,
        )
        session.add(task)
        patch: dict[str, Any] = {
            key: value for key, value in item.items() if key not in ("deleted", "list")
        }
        apply_task_patch(session, task, {**patch, "title": title})
        session.flush()


def _import_habits(session: Session, user_id: str, items: list[Any]) -> None:
    """Insert the habits of a backup, merging week flags and history into checks."""
    for index, item in enumerate(items):
        dates: set[str] = {
            str(day) for day, done in (item.get("history") or {}).items() if done
        }
        monday: str | None = _week_monday(item.get("week"))
        if monday is not None:
            for offset, done in enumerate(_as_list(item.get("days"))[:7]):
                if done:
                    dates.add(add_days_iso(monday, offset))
        session.add(
            Habit(
                id=new_id("h"),
                user_id=user_id,
                name=str(item.get("name") or ""),
                best_streak=int(item.get("best") or item.get("streak") or 0),
                notify=bool(item.get("notify", True)),
                notify_time=str(item.get("notifyTime") or "09:00"),
                last_ping=str(item.get("lastPing") or ""),
                position=index,
                checks=[HabitCheck(date=day) for day in sorted(dates)],
            )
        )
        session.flush()


def _import_misc(session: Session, user_id: str, data: dict[str, Any]) -> None:
    """Insert matrix notes, countdowns, Pomodoro sessions and notifications of a backup."""
    matrix: Any = data.get("matrix") or {}
    for quadrant in QUADRANTS:
        for index, text in enumerate(_as_list(matrix.get(quadrant))):
            session.add(
                MatrixNote(user_id=user_id, quadrant=quadrant, text=str(text), position=index)
            )
    for item in _as_list(data.get("countdowns")):
        session.add(
            Countdown(
                id=new_id("c"),
                user_id=user_id,
                title=str(item.get("title") or ""),
                date=str(item.get("date") or today_iso()),
                created_at=int(item.get("created") or now_ms()),
            )
        )
    for item in _as_list(data.get("pomoLog")):
        session.add(
            PomodoroSession(
                id=new_id("p"),
                user_id=user_id,
                date=str(item.get("date") or today_iso()),
                timestamp=int(item.get("ts") or now_ms()),
                mode="focus" if item.get("mode") == "focus" else "break",
                minutes=int(item.get("minutes") or 0),
                task_title=item.get("task") or None,
            )
        )
    base: int = now_ms()
    for index, item in enumerate(_as_list(data.get("notifications"))):
        session.add(
            Notification(
                id=new_id("n"),
                user_id=user_id,
                title=str(item.get("title") or ""),
                text=str(item.get("text") or ""),
                kind=str(item.get("kind") or "system"),
                unread=bool(item.get("unread", True)),
                created_at=int(item.get("createdAt") or base - index),
            )
        )


def restore_backup(data: dict[str, Any]) -> int:
    """
    Replace the signed-in user's collections with the contents of a backup.

    The account, its credentials and the preferences are kept untouched.

    Args:
        data: Decrypted backup document.

    Returns:
        The number of tasks imported.
    """
    if not isinstance(data.get("tasks"), list) or not isinstance(data.get("lists"), list):
        raise ApiError("invalid_backup")
    with session_scope() as session:
        user_id: str = require_user(session).id
        _clear_user_data(session, user_id)
        lists: dict[str, str] = _import_lists(session, user_id, data["lists"])
        resolve_tags(session, user_id, _as_list(data.get("tags")) or list(DEFAULT_TAGS))
        session.flush()
        _import_tasks(session, user_id, data["tasks"], lists)
        _import_habits(session, user_id, _as_list(data.get("habits")))
        _import_misc(session, user_id, data)
    return len(data["tasks"])


def import_backup(recovery_key: str) -> dict[str, Any]:
    """
    Restore an encrypted backup chosen through a native dialog.

    Args:
        recovery_key: Key the user received when the backup was exported.

    Returns:
        ``cancelled`` when the dialog was dismissed, otherwise the number
        of tasks imported.
    """
    with session_scope() as session:
        require_user(session)
    path: Path | None = _pick_path(webview.FileDialog.OPEN)
    if path is None:
        return {"cancelled": True}
    try:
        blob: bytes = path.read_bytes()
    except OSError as error:
        log("ERROR", Tags.DATABASE, f"Could not read backup: {error!r}")
        raise ApiError("invalid_backup") from error
    tasks: int = restore_backup(decrypt_backup(blob, recovery_key))
    log("SUCCESS", Tags.DATABASE, f"Backup imported: {tasks} tasks")
    return {"cancelled": False, "tasks": tasks}


def wipe_data() -> None:
    """Delete the signed-in account together with its data and credentials."""
    delete_account()
