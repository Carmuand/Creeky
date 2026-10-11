"""
Tasks API. Every call works on the data of the signed-in user.
"""

# Standard library
from __future__ import annotations
from typing import Any

# Third-party
from sqlalchemy import func, select
from sqlalchemy.orm import Session

# Project imports
from desktop.api.auth_api import require_user
from desktop.core.errors import ApiError
from desktop.database.engine import session_scope
from desktop.database.models import PomodoroBlock, Tag, Task, TaskList, TaskRepeatDay
from desktop.database.seed import INBOX_ALIAS
from desktop.database.serializers import serialize_task
from desktop.utills.dates import new_id, now_ms

PRIORITIES: tuple[str, ...] = ("high", "medium", "low", "none")
BLOCK_TYPES: tuple[str, ...] = ("focus", "shortBreak", "longBreak")

_TEXT_FIELDS: dict[str, str] = {
    "title": "title",
    "description": "description",
    "due": "due",
    "dueTime": "due_time",
    "reminder": "reminder",
    "quadrant": "quadrant",
}
_INT_FIELDS: dict[str, str] = {
    "duration": "duration",
    "remindBefore": "remind_before",
    "pomo": "pomodoro_count",
}
_BOOL_FIELDS: dict[str, str] = {"reminded": "reminded", "done": "done"}


def normalize_tag_names(names: Any) -> list[str]:
    """Return unique, trimmed, lowercase tag names in their original order."""
    if not isinstance(names, list):
        return []
    result: list[str] = []
    for raw in names:
        name: str = str(raw or "").strip().lower()
        if name and name not in result:
            result.append(name)
    return result


def resolve_tags(session: Session, user_id: str, names: Any) -> list[Tag]:
    """Return the user's tags with the given names, creating the missing ones."""
    clean: list[str] = normalize_tag_names(names)
    if not clean:
        return []
    existing: dict[str, Tag] = {
        tag.name: tag
        for tag in session.scalars(
            select(Tag).where(Tag.user_id == user_id, Tag.name.in_(clean))
        )
    }
    next_position: int = (
        session.scalar(select(func.max(Tag.position)).where(Tag.user_id == user_id)) or 0
    ) + 1
    tags: list[Tag] = []
    for name in clean:
        tag: Tag | None = existing.get(name)
        if tag is None:
            tag = Tag(user_id=user_id, name=name, position=next_position)
            next_position += 1
            session.add(tag)
        tags.append(tag)
    return tags


def find_list(session: Session, user_id: str, list_id: Any) -> TaskList | None:
    """Return one of the user's lists, resolving the inbox alias."""
    if not isinstance(list_id, str) or not list_id:
        return None
    if list_id == INBOX_ALIAS:
        return session.scalar(
            select(TaskList).where(TaskList.user_id == user_id, TaskList.is_inbox.is_(True))
        )
    return session.scalar(
        select(TaskList).where(TaskList.user_id == user_id, TaskList.id == list_id)
    )


def fallback_list(session: Session, user_id: str, excluded: str | None = None) -> TaskList | None:
    """Return the user's inbox, or their first list, ignoring the excluded one."""
    lists: list[TaskList] = [
        task_list
        for task_list in session.scalars(
            select(TaskList).where(TaskList.user_id == user_id).order_by(TaskList.position)
        )
        if task_list.id != excluded
    ]
    inbox: TaskList | None = next((item for item in lists if item.is_inbox), None)
    return inbox or (lists[0] if lists else None)


def _resolve_list(session: Session, user_id: str, list_id: Any) -> TaskList:
    """Return a valid list of the user, falling back when the requested one is missing."""
    task_list: TaskList | None = find_list(session, user_id, list_id) or fallback_list(
        session, user_id
    )
    if task_list is None:
        raise ApiError("list_not_found")
    return task_list


def get_task(session: Session, user_id: str, task_id: str) -> Task:
    """Return one of the user's tasks or fail when it does not exist."""
    task: Task | None = session.scalar(
        select(Task).where(Task.user_id == user_id, Task.id == task_id)
    )
    if task is None:
        raise ApiError("task_not_found")
    return task


def apply_task_patch(session: Session, task: Task, patch: dict[str, Any]) -> None:
    """
    Apply the frontend fields present in a patch to a task.

    Args:
        session: Open database session.
        task: Task to modify.
        patch: Partial task using the frontend field names.
    """
    for key, attribute in _TEXT_FIELDS.items():
        if key in patch:
            setattr(task, attribute, str(patch[key] or ""))
    for key, attribute in _INT_FIELDS.items():
        if key in patch:
            setattr(task, attribute, int(patch[key] or 0))
    for key, attribute in _BOOL_FIELDS.items():
        if key in patch:
            setattr(task, attribute, bool(patch[key]))
    if "priority" in patch:
        task.priority = patch["priority"] if patch["priority"] in PRIORITIES else "none"
    if "list" in patch:
        task.task_list = _resolve_list(session, task.user_id, patch["list"])
    if "deleted" in patch:
        deleted: bool = bool(patch["deleted"])
        if deleted != bool(task.deleted):
            task.deleted_at = now_ms() if deleted else None
        task.deleted = deleted
    if "repeat" in patch:
        days: set[int] = {
            int(day) for day in (patch["repeat"] or []) if 0 <= int(day) <= 6
        }
        for repeat_day in list(task.repeat_days):
            if repeat_day.weekday in days:
                days.discard(repeat_day.weekday)
            else:
                task.repeat_days.remove(repeat_day)
        task.repeat_days.extend(TaskRepeatDay(weekday=day) for day in sorted(days))
    if "pomodoroBlocks" in patch:
        task.pomodoro_blocks = [
            PomodoroBlock(position=index, type=block["type"], duration=int(block["duration"]))
            for index, block in enumerate(patch["pomodoroBlocks"] or [])
            if block.get("type") in BLOCK_TYPES
        ]
    if "tags" in patch:
        task.tags = resolve_tags(session, task.user_id, patch["tags"])


def create_task(payload: dict[str, Any]) -> dict[str, Any]:
    """Create a task placed at the top of its list."""
    title: str = str(payload.get("title") or "").strip()
    if not title:
        raise ApiError("title_required")
    with session_scope() as session:
        user_id: str = require_user(session).id
        first_position: int = (
            session.scalar(select(func.min(Task.position)).where(Task.user_id == user_id)) or 0
        )
        task: Task = Task(
            id=new_id("t"),
            user_id=user_id,
            title=title,
            task_list=_resolve_list(session, user_id, payload.get("list")),
            created_at=now_ms(),
            position=first_position - 1,
        )
        session.add(task)
        patch: dict[str, Any] = {key: value for key, value in payload.items() if key != "list"}
        apply_task_patch(session, task, {**patch, "title": title})
        session.flush()
        return serialize_task(task)


def update_task(task_id: str, patch: dict[str, Any]) -> dict[str, Any]:
    """Update the given fields of a task."""
    with session_scope() as session:
        task: Task = get_task(session, require_user(session).id, task_id)
        if "title" in patch and not str(patch["title"] or "").strip():
            raise ApiError("title_required")
        apply_task_patch(session, task, patch)
        session.flush()
        return serialize_task(task)


def delete_task(task_id: str) -> None:
    """Permanently delete a task."""
    with session_scope() as session:
        session.delete(get_task(session, require_user(session).id, task_id))


def empty_trash() -> int:
    """Permanently delete every task in the trash and return how many were removed."""
    with session_scope() as session:
        user_id: str = require_user(session).id
        trashed: list[Task] = list(
            session.scalars(select(Task).where(Task.user_id == user_id, Task.deleted.is_(True)))
        )
        for task in trashed:
            session.delete(task)
        return len(trashed)
