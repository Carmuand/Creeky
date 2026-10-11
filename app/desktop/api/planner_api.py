"""
Eisenhower matrix notes, countdowns and Pomodoro sessions API. Every call
works on the data of the signed-in user.
"""

# Standard library
from __future__ import annotations
from typing import Any

# Third-party
from sqlalchemy import func, select
from sqlalchemy.orm import Session

# Project imports
from desktop.api.auth_api import require_user
from desktop.api.notification_api import desktop_enabled
from desktop.api.settings_api import read_language
from desktop.core.errors import ApiError
from desktop.core.messages import translate
from desktop.core.notices import send_desktop_notice
from desktop.database.engine import session_scope
from desktop.database.models import Countdown, MatrixNote, PomodoroSession, Task
from desktop.database.serializers import (
    QUADRANTS,
    serialize_countdown,
    serialize_pomodoro_session,
)
from desktop.utills.dates import new_id, now_ms, today_iso

POMODORO_MODES: tuple[str, ...] = ("focus", "break")


def _quadrant_notes(session: Session, quadrant: str) -> list[MatrixNote]:
    """Return the signed-in user's notes of a quadrant in display order."""
    if quadrant not in QUADRANTS:
        raise ApiError("invalid_quadrant")
    return list(
        session.scalars(
            select(MatrixNote)
            .where(
                MatrixNote.user_id == require_user(session).id,
                MatrixNote.quadrant == quadrant,
            )
            .order_by(MatrixNote.position, MatrixNote.id)
        )
    )


def _note_at(session: Session, quadrant: str, index: int) -> MatrixNote:
    """Return the note at a position within a quadrant."""
    notes: list[MatrixNote] = _quadrant_notes(session, quadrant)
    if not 0 <= index < len(notes):
        raise ApiError("note_not_found")
    return notes[index]


def _next_note_position(session: Session, quadrant: str) -> int:
    """Return the position that places a note last in a quadrant."""
    last: int | None = session.scalar(
        select(func.max(MatrixNote.position)).where(
            MatrixNote.user_id == require_user(session).id, MatrixNote.quadrant == quadrant
        )
    )
    return (last if last is not None else -1) + 1


def add_matrix_notes(notes: list[dict[str, Any]], skip_existing: bool = False) -> int:
    """
    Append notes to their quadrants.

    Args:
        notes: Items with ``quadrant`` and ``text``.
        skip_existing: Whether texts already present in the quadrant are ignored.

    Returns:
        The number of notes actually added.
    """
    added: int = 0
    with session_scope() as session:
        for item in notes:
            quadrant: str = str(item.get("quadrant") or "")
            text: str = str(item.get("text") or "").strip()
            if not text:
                continue
            existing: set[str] = {note.text for note in _quadrant_notes(session, quadrant)}
            if skip_existing and text in existing:
                continue
            session.add(
                MatrixNote(
                    user_id=require_user(session).id,
                    quadrant=quadrant,
                    text=text,
                    position=_next_note_position(session, quadrant),
                )
            )
            session.flush()
            added += 1
    return added


def delete_matrix_note(quadrant: str, index: int) -> None:
    """Delete the note at a position within a quadrant."""
    with session_scope() as session:
        session.delete(_note_at(session, quadrant, int(index)))


def move_matrix_note(quadrant: str, index: int, target: str) -> None:
    """Move a note to the end of another quadrant."""
    with session_scope() as session:
        note: MatrixNote = _note_at(session, quadrant, int(index))
        if target not in QUADRANTS:
            raise ApiError("invalid_quadrant")
        note.position = _next_note_position(session, target)
        note.quadrant = target


def _get_countdown(session: Session, countdown_id: str) -> Countdown:
    """Return one of the signed-in user's countdowns or fail when it is missing."""
    countdown: Countdown | None = session.scalar(
        select(Countdown).where(
            Countdown.user_id == require_user(session).id, Countdown.id == countdown_id
        )
    )
    if countdown is None:
        raise ApiError("countdown_not_found")
    return countdown


def create_countdown(title: str, date: str) -> dict[str, Any]:
    """Create a countdown towards a target date."""
    clean: str = (title or "").strip()
    if not clean or not date:
        raise ApiError("title_required")
    with session_scope() as session:
        countdown: Countdown = Countdown(
            id=new_id("c"),
            user_id=require_user(session).id,
            title=clean,
            date=date,
            created_at=now_ms(),
        )
        session.add(countdown)
        session.flush()
        return serialize_countdown(countdown)


def update_countdown(countdown_id: str, title: str, date: str) -> dict[str, Any]:
    """Update a countdown's title and target date."""
    clean: str = (title or "").strip()
    if not clean or not date:
        raise ApiError("title_required")
    with session_scope() as session:
        countdown: Countdown = _get_countdown(session, countdown_id)
        countdown.title = clean
        countdown.date = date
        return serialize_countdown(countdown)


def delete_countdown(countdown_id: str) -> None:
    """Delete a countdown."""
    with session_scope() as session:
        session.delete(_get_countdown(session, countdown_id))


def log_pomodoro_session(
    mode: str, minutes: int, task_id: str | None = None, task_title: str | None = None
) -> dict[str, Any]:
    """
    Record a finished Pomodoro session.

    A focus session linked to an existing task also increases that task's
    completed session count. A desktop notification announces the end of
    the session when the user enabled that category.

    Returns:
        The stored session and, when a task was credited, its title and count.
    """
    if mode not in POMODORO_MODES:
        raise ApiError("invalid_mode")
    with session_scope() as session:
        user_id: str = require_user(session).id
        task: Task | None = (
            session.scalar(select(Task).where(Task.user_id == user_id, Task.id == task_id))
            if task_id
            else None
        )
        if task is not None and task.deleted:
            task = None
        entry: PomodoroSession = PomodoroSession(
            id=new_id("p"),
            user_id=user_id,
            date=today_iso(),
            timestamp=now_ms(),
            mode=mode,
            minutes=int(minutes),
            task_id=task.id if task is not None else None,
            task_title=task_title or (task.title if task is not None else None),
        )
        session.add(entry)
        session.flush()
        credited: dict[str, Any] | None = None
        if mode == "focus" and task is not None:
            task.pomodoro_count += 1
            credited = {"id": task.id, "title": task.title, "pomo": task.pomodoro_count}
        result: dict[str, Any] = {"session": serialize_pomodoro_session(entry), "task": credited}
        notify: bool = desktop_enabled(session, user_id, "pomodoro")
        language: str = read_language(session)
        focused_title: str | None = entry.task_title
    if notify:
        send_desktop_notice(
            translate(language, "pomodoro_focus_title" if mode == "focus" else "pomodoro_break_title"),
            translate(language, "pomodoro_task_text", minutes=int(minutes), title=focused_title)
            if focused_title
            else translate(language, "pomodoro_text", minutes=int(minutes)),
        )
    return result


def delete_pomodoro_session(session_id: str) -> None:
    """Delete a Pomodoro session from the history."""
    with session_scope() as session:
        entry: PomodoroSession | None = session.scalar(
            select(PomodoroSession).where(
                PomodoroSession.user_id == require_user(session).id,
                PomodoroSession.id == session_id,
            )
        )
        if entry is None:
            raise ApiError("session_not_found")
        session.delete(entry)
