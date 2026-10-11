"""
Application snapshot, backup import and data wipe API.
"""

# Standard library
from __future__ import annotations
from datetime import date
from typing import Any

# Third-party
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

# Project imports
from desktop.api.auth_api import current_user, delete_all_credentials
from desktop.api.settings_api import read_language, read_theme
from desktop.api.task_api import apply_task_patch, clear_tasks, resolve_tags
from desktop.core.errors import ApiError
from desktop.database.engine import reset_database, session_scope
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
)
from desktop.database.seed import DEFAULT_LIST_ICON, DEFAULT_TAGS, INBOX_LIST_ID
from desktop.database.serializers import QUADRANTS, build_snapshot
from desktop.utills.dates import add_days_iso, new_id, now_ms, today_iso
from desktop.utills.logger import log, Tags


def get_snapshot() -> dict[str, Any]:
    """Return the full application state for the frontend store."""
    with session_scope() as session:
        return build_snapshot(
            session, current_user(session), read_theme(session), read_language(session)
        )


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


def _import_lists(session: Session, items: list[Any]) -> None:
    """Insert the lists of a backup, guaranteeing that at least one exists."""
    seen: set[str] = set()
    for index, item in enumerate(items):
        list_id: str = str(item.get("id") or new_id("l"))
        if list_id in seen:
            continue
        seen.add(list_id)
        session.add(
            TaskList(
                id=list_id,
                name=str(item.get("name") or list_id),
                description=str(item.get("description") or ""),
                color=str(item.get("color") or "#616161"),
                icon=str(item.get("icon") or DEFAULT_LIST_ICON),
                position=index,
            )
        )
    if not seen:
        session.add(TaskList(id=INBOX_LIST_ID, name="Inbox", icon=DEFAULT_LIST_ICON, position=0))
    session.flush()


def _import_tasks(session: Session, items: list[Any]) -> None:
    """Insert the tasks of a backup preserving their order."""
    seen: set[str] = set()
    for index, item in enumerate(items):
        title: str = str(item.get("title") or "").strip()
        task_id: str = str(item.get("id") or new_id("t"))
        if not title or task_id in seen:
            continue
        seen.add(task_id)
        deleted: bool = bool(item.get("deleted"))
        task: Task = Task(
            id=task_id,
            title=title,
            list_id=INBOX_LIST_ID,
            created_at=int(item.get("createdAt") or now_ms()),
            position=index,
            deleted=deleted,
            deleted_at=item.get("deletedAt") if deleted else None,
        )
        session.add(task)
        patch: dict[str, Any] = {key: value for key, value in item.items() if key != "deleted"}
        apply_task_patch(session, task, {**patch, "title": title, "list": item.get("list")})
        session.flush()


def _import_habits(session: Session, items: list[Any]) -> None:
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
                id=str(item.get("id") or new_id("h")),
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


def _import_misc(session: Session, data: dict[str, Any]) -> None:
    """Insert matrix notes, countdowns, Pomodoro sessions and notifications of a backup."""
    matrix: Any = data.get("matrix") or {}
    for quadrant in QUADRANTS:
        for index, text in enumerate(_as_list(matrix.get(quadrant))):
            session.add(MatrixNote(quadrant=quadrant, text=str(text), position=index))
    for item in _as_list(data.get("countdowns")):
        session.add(
            Countdown(
                id=new_id("c"),
                title=str(item.get("title") or ""),
                date=str(item.get("date") or today_iso()),
                created_at=int(item.get("created") or now_ms()),
            )
        )
    for item in _as_list(data.get("pomoLog")):
        session.add(
            PomodoroSession(
                id=new_id("p"),
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
                title=str(item.get("title") or ""),
                text=str(item.get("text") or ""),
                kind=str(item.get("kind") or "system"),
                unread=bool(item.get("unread", True)),
                created_at=int(item.get("createdAt") or base - index),
            )
        )


def import_backup(data: dict[str, Any]) -> None:
    """
    Replace the stored collections with the contents of a JSON backup.

    Accounts, credentials and preferences are kept untouched.

    Args:
        data: Parsed backup exported by the application.
    """
    if not isinstance(data, dict) or not isinstance(data.get("tasks"), list):
        raise ApiError("invalid_backup")
    if not isinstance(data.get("lists"), list):
        raise ApiError("invalid_backup")
    with session_scope() as session:
        session.execute(delete(PomodoroSession))
        clear_tasks(session)
        for model in (HabitCheck, Habit, MatrixNote, Countdown, Notification, Tag, TaskList):
            session.execute(delete(model))
        session.flush()
        session.expunge_all()
        _import_lists(session, data["lists"])
        resolve_tags(session, _as_list(data.get("tags")) or list(DEFAULT_TAGS))
        session.flush()
        _import_tasks(session, data["tasks"])
        _import_habits(session, _as_list(data.get("habits")))
        _import_misc(session, data)
        task_count: int = len(list(session.scalars(select(Task.id))))
    log("SUCCESS", Tags.DATABASE, f"Backup imported: {task_count} tasks")


def wipe_data() -> None:
    """Delete every account, credential and record, leaving the starter data."""
    delete_all_credentials()
    reset_database()
