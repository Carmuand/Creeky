"""
Public API class exposed to the frontend through the pywebview bridge.

Every data method returns a result envelope: ``{"ok": True, "data": ...}``
or ``{"ok": False, "error": code}``.
"""

# Standard library
from __future__ import annotations
from typing import Any

# Project imports
from desktop.api import (
    auth_api,
    backup_api,
    habit_api,
    list_api,
    notification_api,
    planner_api,
    settings_api,
    task_api,
    window_api,
)
from desktop.core.errors import bridge_method


class Api:
    """Bridge API exposed to the React frontend via pywebview."""

    def ping(self) -> str:
        """Health-check called by the frontend on startup."""
        return window_api.ping()

    def minimize_window(self) -> None:
        """Minimize the pywebview window."""
        return window_api.minimize_window()

    def close_window(self) -> None:
        """Destroy the pywebview window and exit the application."""
        return window_api.close_window()

    @bridge_method
    def get_window_sizes(self) -> dict[str, Any]:
        """Return the window sizes that fit the current monitor."""
        return window_api.get_window_sizes()

    @bridge_method
    def set_window_size(self, width: int, height: int) -> dict[str, int]:
        """Resize the window to an allowed size and persist it."""
        return window_api.set_window_size(width, height)

    @bridge_method
    def get_snapshot(self) -> dict[str, Any]:
        """Return the full application state."""
        return backup_api.get_snapshot()

    @bridge_method
    def import_backup(self, data: dict[str, Any]) -> None:
        """Replace the stored collections with a JSON backup."""
        return backup_api.import_backup(data)

    @bridge_method
    def wipe_data(self) -> None:
        """Delete every account, credential and record."""
        return backup_api.wipe_data()

    def get_theme(self) -> dict[str, str]:
        """Return the active theme for the pre-render theme script."""
        return settings_api.get_theme()

    @bridge_method
    def set_theme(self, theme: str) -> dict[str, str]:
        """Persist the active theme."""
        return settings_api.set_theme(theme)

    @bridge_method
    def set_language(self, language: str) -> dict[str, str]:
        """Persist the active language."""
        return settings_api.set_language(language)

    @bridge_method
    def set_focus(self, focus: dict[str, Any] | None) -> None:
        """Persist or clear the Pomodoro focus task."""
        return settings_api.set_focus(focus)

    @bridge_method
    def sign_up(self, name: str, email: str, password: str) -> dict[str, Any]:
        """Create an account and start a session."""
        return auth_api.sign_up(name, email, password)

    @bridge_method
    def sign_in(self, email: str, password: str) -> dict[str, Any]:
        """Verify credentials and start a session."""
        return auth_api.sign_in(email, password)

    @bridge_method
    def sign_out(self) -> None:
        """End the active session."""
        return auth_api.sign_out()

    @bridge_method
    def update_profile(self, name: str, email: str, password: str | None = None) -> dict[str, Any]:
        """Update the signed-in user's profile."""
        return auth_api.update_profile(name, email, password)

    @bridge_method
    def set_avatar(self, data_url: str | None) -> dict[str, Any]:
        """Set or remove the signed-in user's photo."""
        return auth_api.set_avatar(data_url)

    @bridge_method
    def create_task(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Create a task."""
        return task_api.create_task(payload)

    @bridge_method
    def update_task(self, task_id: str, patch: dict[str, Any]) -> dict[str, Any]:
        """Update fields of a task."""
        return task_api.update_task(task_id, patch)

    @bridge_method
    def delete_task(self, task_id: str) -> None:
        """Permanently delete a task."""
        return task_api.delete_task(task_id)

    @bridge_method
    def empty_trash(self) -> int:
        """Permanently delete every trashed task."""
        return task_api.empty_trash()

    @bridge_method
    def create_list(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Create a task list."""
        return list_api.create_list(payload)

    @bridge_method
    def update_list(self, list_id: str, patch: dict[str, Any]) -> dict[str, Any]:
        """Update fields of a task list."""
        return list_api.update_list(list_id, patch)

    @bridge_method
    def delete_list(self, list_id: str) -> int:
        """Delete a list, sending its tasks to the trash."""
        return list_api.delete_list(list_id)

    @bridge_method
    def create_tag(self, name: str) -> str:
        """Create a tag."""
        return list_api.create_tag(name)

    @bridge_method
    def rename_tag(self, name: str, new_name: str) -> dict[str, Any]:
        """Rename or merge a tag."""
        return list_api.rename_tag(name, new_name)

    @bridge_method
    def delete_tag(self, name: str) -> None:
        """Delete a tag."""
        return list_api.delete_tag(name)

    @bridge_method
    def delete_unused_tags(self) -> int:
        """Delete the tags no task uses."""
        return list_api.delete_unused_tags()

    @bridge_method
    def create_habit(self, name: str) -> dict[str, Any]:
        """Create a habit."""
        return habit_api.create_habit(name)

    @bridge_method
    def update_habit(self, habit_id: str, patch: dict[str, Any]) -> dict[str, Any]:
        """Update fields of a habit."""
        return habit_api.update_habit(habit_id, patch)

    @bridge_method
    def toggle_habit_day(self, habit_id: str, day: str) -> dict[str, Any]:
        """Check or uncheck a habit on a date."""
        return habit_api.toggle_habit_day(habit_id, day)

    @bridge_method
    def delete_habit(self, habit_id: str) -> None:
        """Delete a habit."""
        return habit_api.delete_habit(habit_id)

    @bridge_method
    def add_matrix_notes(self, notes: list[dict[str, Any]], skip_existing: bool = False) -> int:
        """Append notes to Eisenhower quadrants."""
        return planner_api.add_matrix_notes(notes, skip_existing)

    @bridge_method
    def delete_matrix_note(self, quadrant: str, index: int) -> None:
        """Delete a note from a quadrant."""
        return planner_api.delete_matrix_note(quadrant, index)

    @bridge_method
    def move_matrix_note(self, quadrant: str, index: int, target: str) -> None:
        """Move a note to another quadrant."""
        return planner_api.move_matrix_note(quadrant, index, target)

    @bridge_method
    def create_countdown(self, title: str, date: str) -> dict[str, Any]:
        """Create a countdown."""
        return planner_api.create_countdown(title, date)

    @bridge_method
    def update_countdown(self, countdown_id: str, title: str, date: str) -> dict[str, Any]:
        """Update a countdown."""
        return planner_api.update_countdown(countdown_id, title, date)

    @bridge_method
    def delete_countdown(self, countdown_id: str) -> None:
        """Delete a countdown."""
        return planner_api.delete_countdown(countdown_id)

    @bridge_method
    def log_pomodoro_session(
        self, mode: str, minutes: int, task_id: str | None = None, task_title: str | None = None
    ) -> dict[str, Any]:
        """Record a finished Pomodoro session."""
        return planner_api.log_pomodoro_session(mode, minutes, task_id, task_title)

    @bridge_method
    def delete_pomodoro_session(self, session_id: str) -> None:
        """Delete a Pomodoro session from the history."""
        return planner_api.delete_pomodoro_session(session_id)

    @bridge_method
    def create_notifications(self, items: list[dict[str, Any]]) -> int:
        """Store notifications produced by frontend actions."""
        return notification_api.create_notifications(items)

    @bridge_method
    def mark_notification_read(self, notification_id: str) -> None:
        """Mark one notification as read."""
        return notification_api.mark_notification_read(notification_id)

    @bridge_method
    def mark_all_notifications_read(self) -> None:
        """Mark every notification as read."""
        return notification_api.mark_all_notifications_read()

    @bridge_method
    def save_email_link(self, provider: str, email: str) -> dict[str, Any]:
        """Link an email address to a provider."""
        return notification_api.save_email_link(provider, email)

    @bridge_method
    def delete_email_link(self, provider: str) -> None:
        """Unlink a provider."""
        return notification_api.delete_email_link(provider)

    @bridge_method
    def mark_email_link_sent(self, provider: str) -> None:
        """Record that a backup was sent through a provider."""
        return notification_api.mark_email_link_sent(provider)

