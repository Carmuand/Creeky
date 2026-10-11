"""
Habits API. Every call works on the data of the signed-in user.
"""

# Standard library
from __future__ import annotations
from datetime import date
from typing import Any

# Third-party
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

# Project imports
from desktop.api.auth_api import require_user
from desktop.core.errors import ApiError
from desktop.database.engine import session_scope
from desktop.database.models import Habit, HabitCheck
from desktop.database.serializers import habit_streak, serialize_habit
from desktop.utills.dates import new_id, today_iso


def _get_habit(session: Session, habit_id: str) -> Habit:
    """Return one of the signed-in user's habits with its checks, or fail when it is missing."""
    habit: Habit | None = session.scalar(
        select(Habit)
        .options(selectinload(Habit.checks))
        .where(Habit.user_id == require_user(session).id, Habit.id == habit_id)
    )
    if habit is None:
        raise ApiError("habit_not_found")
    return habit


def create_habit(name: str) -> dict[str, Any]:
    """Create a habit with a daily reminder at nine in the morning."""
    clean: str = (name or "").strip()
    if not clean:
        raise ApiError("name_required")
    with session_scope() as session:
        user_id: str = require_user(session).id
        last_position: int = (
            session.scalar(select(func.max(Habit.position)).where(Habit.user_id == user_id)) or 0
        )
        habit: Habit = Habit(
            id=new_id("h"), user_id=user_id, name=clean, position=last_position + 1, checks=[]
        )
        session.add(habit)
        session.flush()
        return serialize_habit(habit)


def update_habit(habit_id: str, patch: dict[str, Any]) -> dict[str, Any]:
    """Update a habit's name, reminder switch or reminder time."""
    with session_scope() as session:
        habit: Habit = _get_habit(session, habit_id)
        if "name" in patch:
            name: str = str(patch["name"] or "").strip()
            if not name:
                raise ApiError("name_required")
            habit.name = name
        if "notify" in patch:
            habit.notify = bool(patch["notify"])
            if habit.notify:
                habit.last_ping = ""
        if "notifyTime" in patch and patch["notifyTime"]:
            habit.notify_time = str(patch["notifyTime"])
            habit.last_ping = ""
        return serialize_habit(habit)


def toggle_habit_day(habit_id: str, day: str) -> dict[str, Any]:
    """Check or uncheck a habit on the given ISO date, never in the future."""
    try:
        date.fromisoformat(day)
    except (TypeError, ValueError) as error:
        raise ApiError("invalid_date") from error
    if day > today_iso():
        raise ApiError("future_date")
    with session_scope() as session:
        habit: Habit = _get_habit(session, habit_id)
        existing: HabitCheck | None = next(
            (check for check in habit.checks if check.date == day), None
        )
        if existing is not None:
            habit.checks.remove(existing)
        else:
            habit.checks.append(HabitCheck(date=day))
        streak: int = habit_streak({check.date for check in habit.checks})
        habit.best_streak = max(habit.best_streak, streak)
        session.flush()
        return serialize_habit(habit)


def delete_habit(habit_id: str) -> None:
    """Delete a habit and its checks."""
    with session_scope() as session:
        session.delete(_get_habit(session, habit_id))
