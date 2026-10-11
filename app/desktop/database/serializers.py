"""
Conversion of database rows into the JSON shapes consumed by the frontend.
"""

# Standard library
from __future__ import annotations
import json
from typing import Any

# Third-party
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

# Project imports
from desktop.database.models import (
    Countdown,
    EmailLink,
    Habit,
    MatrixNote,
    Notification,
    PomodoroSession,
    Tag,
    Task,
    TaskList,
    User,
)
from desktop.database.seed import INBOX_ALIAS
from desktop.utills.dates import add_days_iso, iso_week_key, monday_of, today_iso

QUADRANTS: tuple[str, ...] = ("q1", "q2", "q3", "q4")


def habit_streak(dates: set[str]) -> int:
    """Return the number of consecutive checked days ending today or yesterday."""
    day: str = today_iso()
    if day not in dates:
        day = add_days_iso(day, -1)
    streak: int = 0
    while day in dates:
        streak += 1
        day = add_days_iso(day, -1)
    return streak


def serialize_user(user: User) -> dict[str, Any]:
    """Return the public profile of a user."""
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "created": user.created_at,
        "avatar": user.avatar,
        "onboarded": user.onboarded,
    }


def serialize_task(task: Task) -> dict[str, Any]:
    """Return a task with its tags, repeat days and Pomodoro blocks."""
    list_id: str = INBOX_ALIAS if task.task_list.is_inbox else task.list_id
    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "list": list_id,
        "priority": task.priority,
        "due": task.due,
        "dueTime": task.due_time,
        "duration": task.duration,
        "repeat": sorted(day.weekday for day in task.repeat_days),
        "remindBefore": task.remind_before,
        "reminder": task.reminder,
        "reminded": task.reminded,
        "quadrant": task.quadrant,
        "pomo": task.pomodoro_count,
        "pomodoroBlocks": [
            {"type": block.type, "duration": block.duration} for block in task.pomodoro_blocks
        ],
        "done": task.done,
        "deleted": task.deleted,
        "deletedAt": task.deleted_at,
        "createdAt": task.created_at,
        "tags": [tag.name for tag in sorted(task.tags, key=lambda tag: tag.position)],
    }


def serialize_list(task_list: TaskList) -> dict[str, Any]:
    """Return a task list, exposing the inbox under its fixed alias."""
    return {
        "id": INBOX_ALIAS if task_list.is_inbox else task_list.id,
        "name": task_list.name,
        "description": task_list.description,
        "color": task_list.color,
        "icon": task_list.icon,
    }


def serialize_habit(habit: Habit) -> dict[str, Any]:
    """Return a habit with its current week flags, history and streak."""
    dates: set[str] = {check.date for check in habit.checks}
    today: str = today_iso()
    monday: str = monday_of(today)
    streak: int = habit_streak(dates)
    return {
        "id": habit.id,
        "name": habit.name,
        "streak": streak,
        "best": max(habit.best_streak, streak),
        "days": [1 if add_days_iso(monday, offset) in dates else 0 for offset in range(7)],
        "history": {day: 1 for day in sorted(dates)},
        "week": iso_week_key(today),
        "notify": habit.notify,
        "notifyTime": habit.notify_time,
        "lastPing": habit.last_ping,
    }


def serialize_countdown(countdown: Countdown) -> dict[str, Any]:
    """Return a countdown."""
    return {
        "id": countdown.id,
        "title": countdown.title,
        "date": countdown.date,
        "created": countdown.created_at,
    }


def serialize_pomodoro_session(entry: PomodoroSession) -> dict[str, Any]:
    """Return a finished Pomodoro session."""
    return {
        "id": entry.id,
        "date": entry.date,
        "ts": entry.timestamp,
        "mode": entry.mode,
        "minutes": entry.minutes,
        "task": entry.task_title,
    }


def serialize_notification(notification: Notification) -> dict[str, Any]:
    """Return an in-app notification."""
    return {
        "id": notification.id,
        "title": notification.title,
        "text": notification.text,
        "createdAt": notification.created_at,
        "unread": notification.unread,
        "kind": notification.kind,
    }


def serialize_email_link(link: EmailLink) -> dict[str, Any]:
    """Return a linked email provider."""
    return {
        "provider": link.provider,
        "email": link.email,
        "linkedAt": link.linked_at,
        "lastSentAt": link.last_sent_at,
    }


def parse_focus(raw: str | None) -> dict[str, str] | None:
    """Return the stored Pomodoro focus task, when valid."""
    if not raw:
        return None
    try:
        parsed: Any = json.loads(raw)
    except ValueError:
        return None
    if isinstance(parsed, dict) and isinstance(parsed.get("title"), str):
        return {"id": str(parsed.get("id") or ""), "title": parsed["title"]}
    return None


def empty_collections() -> dict[str, Any]:
    """Return the collections of a snapshot when nobody is signed in."""
    return {
        "tags": [],
        "tasks": [],
        "lists": [],
        "habits": [],
        "matrix": {quadrant: [] for quadrant in QUADRANTS},
        "countdowns": [],
        "pomoLog": [],
        "notifications": [],
        "emailLinks": [],
    }


def build_collections(session: Session, user_id: str) -> dict[str, Any]:
    """
    Return every collection owned by a user in the shapes used by the frontend.

    Args:
        session: Open database session.
        user_id: Identifier of the owner.

    Returns:
        A JSON-serializable dictionary with the user's collections.
    """
    tasks: list[Task] = list(
        session.scalars(
            select(Task)
            .where(Task.user_id == user_id)
            .options(
                selectinload(Task.task_list),
                selectinload(Task.tags),
                selectinload(Task.repeat_days),
                selectinload(Task.pomodoro_blocks),
            )
            .order_by(Task.position, Task.created_at.desc())
        )
    )
    habits: list[Habit] = list(
        session.scalars(
            select(Habit)
            .where(Habit.user_id == user_id)
            .options(selectinload(Habit.checks))
            .order_by(Habit.position)
        )
    )
    notes: list[MatrixNote] = list(
        session.scalars(
            select(MatrixNote)
            .where(MatrixNote.user_id == user_id)
            .order_by(MatrixNote.position, MatrixNote.id)
        )
    )
    return {
        "tags": list(
            session.scalars(
                select(Tag.name).where(Tag.user_id == user_id).order_by(Tag.position, Tag.id)
            )
        ),
        "tasks": [serialize_task(task) for task in tasks],
        "lists": [
            serialize_list(task_list)
            for task_list in session.scalars(
                select(TaskList).where(TaskList.user_id == user_id).order_by(TaskList.position)
            )
        ],
        "habits": [serialize_habit(habit) for habit in habits],
        "matrix": {
            quadrant: [note.text for note in notes if note.quadrant == quadrant]
            for quadrant in QUADRANTS
        },
        "countdowns": [
            serialize_countdown(countdown)
            for countdown in session.scalars(
                select(Countdown)
                .where(Countdown.user_id == user_id)
                .order_by(Countdown.created_at)
            )
        ],
        "pomoLog": [
            serialize_pomodoro_session(entry)
            for entry in session.scalars(
                select(PomodoroSession)
                .where(PomodoroSession.user_id == user_id)
                .order_by(PomodoroSession.timestamp.desc())
            )
        ],
        "notifications": [
            serialize_notification(notification)
            for notification in session.scalars(
                select(Notification)
                .where(Notification.user_id == user_id)
                .order_by(Notification.created_at.desc(), Notification.id.desc())
            )
        ],
        "emailLinks": [
            serialize_email_link(link)
            for link in session.scalars(
                select(EmailLink).where(EmailLink.user_id == user_id).order_by(EmailLink.linked_at)
            )
        ],
    }
