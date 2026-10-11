"""
Task lists and tags API.
"""

# Standard library
from __future__ import annotations
from typing import Any

# Third-party
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

# Project imports
from desktop.api.task_api import fallback_list_id
from desktop.core.errors import ApiError
from desktop.database.engine import session_scope
from desktop.database.models import Tag, Task, TaskList
from desktop.database.seed import DEFAULT_LIST_ICON
from desktop.database.serializers import serialize_list
from desktop.utills.dates import new_id, now_ms

_DEFAULT_COLOR: str = "#616161"


def _get_list(session: Session, list_id: str) -> TaskList:
    """Return a list or fail when it does not exist."""
    task_list: TaskList | None = session.get(TaskList, list_id)
    if task_list is None:
        raise ApiError("list_not_found")
    return task_list


def _apply_list_fields(task_list: TaskList, payload: dict[str, Any]) -> None:
    """Copy the editable fields present in a payload onto a list."""
    if "name" in payload:
        name: str = str(payload["name"] or "").strip()
        if not name:
            raise ApiError("name_required")
        task_list.name = name
    if "description" in payload:
        task_list.description = str(payload["description"] or "").strip()
    if "color" in payload:
        task_list.color = str(payload["color"] or _DEFAULT_COLOR)
    if "icon" in payload:
        task_list.icon = str(payload["icon"] or DEFAULT_LIST_ICON)


def create_list(payload: dict[str, Any]) -> dict[str, Any]:
    """Create a task list placed after the existing ones."""
    with session_scope() as session:
        last_position: int = session.scalar(select(func.max(TaskList.position))) or 0
        task_list: TaskList = TaskList(
            id=new_id("l"),
            name="",
            color=_DEFAULT_COLOR,
            icon=DEFAULT_LIST_ICON,
            position=last_position + 1,
        )
        _apply_list_fields(task_list, {"name": payload.get("name"), **payload})
        session.add(task_list)
        session.flush()
        return serialize_list(task_list)


def update_list(list_id: str, patch: dict[str, Any]) -> dict[str, Any]:
    """Update the given fields of a task list."""
    with session_scope() as session:
        task_list: TaskList = _get_list(session, list_id)
        _apply_list_fields(task_list, patch)
        return serialize_list(task_list)


def delete_list(list_id: str) -> int:
    """
    Delete a list, sending its active tasks to the trash.

    The tasks are reassigned to the inbox, or to the first remaining list,
    so they stay restorable.

    Returns:
        The number of tasks moved to the trash.
    """
    with session_scope() as session:
        task_list: TaskList = _get_list(session, list_id)
        target: str | None = fallback_list_id(session, excluded=list_id)
        if target is None:
            raise ApiError("last_list")
        moved: int = 0
        timestamp: int = now_ms()
        for task in session.scalars(select(Task).where(Task.list_id == list_id)):
            if not task.deleted:
                task.deleted = True
                task.deleted_at = timestamp
                moved += 1
            task.list_id = target
        session.flush()
        session.delete(task_list)
        return moved


def create_tag(name: str) -> str:
    """Create a tag and return its normalized name."""
    clean: str = (name or "").strip().lower()
    if not clean:
        raise ApiError("name_required")
    with session_scope() as session:
        if session.scalar(select(Tag).where(Tag.name == clean)) is not None:
            raise ApiError("tag_exists")
        last_position: int = session.scalar(select(func.max(Tag.position))) or 0
        session.add(Tag(name=clean, position=last_position + 1))
    return clean


def rename_tag(name: str, new_name: str) -> dict[str, Any]:
    """
    Rename a tag, merging it into an existing tag with the new name.

    Returns:
        The final name and whether a merge happened.
    """
    clean: str = (new_name or "").strip().lower()
    if not clean:
        raise ApiError("name_required")
    with session_scope() as session:
        tag: Tag | None = session.scalar(
            select(Tag).options(selectinload(Tag.tasks)).where(Tag.name == name)
        )
        if tag is None:
            raise ApiError("tag_not_found")
        if clean == tag.name:
            return {"name": clean, "merged": False}
        target: Tag | None = session.scalar(
            select(Tag).options(selectinload(Tag.tasks)).where(Tag.name == clean)
        )
        if target is None:
            tag.name = clean
            return {"name": clean, "merged": False}
        for task in list(tag.tasks):
            if task not in target.tasks:
                target.tasks.append(task)
        session.delete(tag)
        return {"name": clean, "merged": True}


def delete_tag(name: str) -> None:
    """Delete a tag and detach it from every task."""
    with session_scope() as session:
        tag: Tag | None = session.scalar(select(Tag).where(Tag.name == name))
        if tag is None:
            raise ApiError("tag_not_found")
        session.delete(tag)


def delete_unused_tags() -> int:
    """Delete the tags that no task uses and return how many were removed."""
    with session_scope() as session:
        unused: list[Tag] = list(session.scalars(select(Tag).where(~Tag.tasks.any())))
        for tag in unused:
            session.delete(tag)
        return len(unused)
