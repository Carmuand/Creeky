"""
Task lists and tags API. Every call works on the data of the signed-in user.
"""

# Standard library
from __future__ import annotations
from typing import Any

# Third-party
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

# Project imports
from desktop.api.auth_api import require_user
from desktop.api.task_api import fallback_list, find_list
from desktop.core.errors import ApiError
from desktop.database.engine import session_scope
from desktop.database.models import Tag, Task, TaskList
from desktop.database.seed import DEFAULT_LIST_ICON
from desktop.database.serializers import serialize_list
from desktop.utills.dates import new_id, now_ms

_DEFAULT_COLOR: str = "#616161"


def _get_list(session: Session, user_id: str, list_id: str) -> TaskList:
    """Return one of the user's lists or fail when it does not exist."""
    task_list: TaskList | None = find_list(session, user_id, list_id)
    if task_list is None:
        raise ApiError("list_not_found")
    return task_list


def _get_tag(session: Session, user_id: str, name: str) -> Tag | None:
    """Return one of the user's tags with its tasks loaded."""
    return session.scalar(
        select(Tag)
        .options(selectinload(Tag.tasks))
        .where(Tag.user_id == user_id, Tag.name == name)
    )


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
        user_id: str = require_user(session).id
        last_position: int = (
            session.scalar(select(func.max(TaskList.position)).where(TaskList.user_id == user_id))
            or 0
        )
        task_list: TaskList = TaskList(
            id=new_id("l"),
            user_id=user_id,
            is_inbox=False,
            name="",
            description="",
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
        task_list: TaskList = _get_list(session, require_user(session).id, list_id)
        _apply_list_fields(task_list, patch)
        return serialize_list(task_list)


def delete_list(list_id: str) -> int:
    """
    Delete a list, sending its active tasks to the trash.

    The tasks are reassigned to the inbox, or to the first remaining list,
    so they stay restorable. When the inbox itself is deleted, that
    remaining list becomes the new inbox.

    Returns:
        The number of tasks moved to the trash.
    """
    with session_scope() as session:
        user_id: str = require_user(session).id
        task_list: TaskList = _get_list(session, user_id, list_id)
        target: TaskList | None = fallback_list(session, user_id, excluded=task_list.id)
        if target is None:
            raise ApiError("last_list")
        moved: int = 0
        timestamp: int = now_ms()
        for task in session.scalars(select(Task).where(Task.list_id == task_list.id)):
            if not task.deleted:
                task.deleted = True
                task.deleted_at = timestamp
                moved += 1
            task.list_id = target.id
        if task_list.is_inbox:
            task_list.is_inbox = False
            target.is_inbox = True
        session.flush()
        session.expire(task_list, ["tasks"])
        session.delete(task_list)
        return moved


def create_tag(name: str) -> str:
    """Create a tag and return its normalized name."""
    clean: str = (name or "").strip().lower()
    if not clean:
        raise ApiError("name_required")
    with session_scope() as session:
        user_id: str = require_user(session).id
        if _get_tag(session, user_id, clean) is not None:
            raise ApiError("tag_exists")
        last_position: int = (
            session.scalar(select(func.max(Tag.position)).where(Tag.user_id == user_id)) or 0
        )
        session.add(Tag(user_id=user_id, name=clean, position=last_position + 1))
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
        user_id: str = require_user(session).id
        tag: Tag | None = _get_tag(session, user_id, name)
        if tag is None:
            raise ApiError("tag_not_found")
        if clean == tag.name:
            return {"name": clean, "merged": False}
        target: Tag | None = _get_tag(session, user_id, clean)
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
        tag: Tag | None = _get_tag(session, require_user(session).id, name)
        if tag is None:
            raise ApiError("tag_not_found")
        session.delete(tag)


def delete_unused_tags() -> int:
    """Delete the tags that no task uses and return how many were removed."""
    with session_scope() as session:
        user_id: str = require_user(session).id
        unused: list[Tag] = list(
            session.scalars(select(Tag).where(Tag.user_id == user_id, ~Tag.tasks.any()))
        )
        for tag in unused:
            session.delete(tag)
        return len(unused)
