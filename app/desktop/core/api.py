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
    avatar_api,
    backup_api,
    habit_api,
    list_api,
    notification_api,
    planner_api,
    settings_api,
    sound_api,
    task_api,
    unad_api,
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
        """Hide the window when minimize on close is active; otherwise destroy it."""
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
    def export_backup(self) -> dict[str, Any]:
        """Save an encrypted backup and return its one-time recovery key."""
        return backup_api.export_backup()

    @bridge_method
    def import_backup(self, recovery_key: str) -> dict[str, Any]:
        """Restore an encrypted backup chosen through a native dialog."""
        return backup_api.import_backup(recovery_key)

    @bridge_method
    def wipe_data(self) -> None:
        """Delete the signed-in account with its data and credentials."""
        return backup_api.wipe_data()

    @bridge_method
    def set_sidebar_collapsed(self, collapsed: bool) -> dict[str, bool]:
        """Persist whether the sidebar is collapsed."""
        return settings_api.set_sidebar_collapsed(collapsed)

    @bridge_method
    def get_autostart(self) -> dict[str, bool]:
        """Return whether the application starts with Windows."""
        return settings_api.get_autostart()

    @bridge_method
    def set_autostart(self, enabled: bool) -> dict[str, bool]:
        """Register or unregister the application to start with Windows."""
        return settings_api.set_autostart(enabled)

    @bridge_method
    def list_sounds(self) -> list[dict[str, str]]:
        """Return the available alarm sounds."""
        return sound_api.list_sounds()

    @bridge_method
    def get_sound_data_url(self, name: str) -> dict[str, str]:
        """Return a sound file as a base64 data URL for playback."""
        return sound_api.get_sound_data_url(name)

    @bridge_method
    def pick_sound(self) -> dict[str, str] | dict[str, bool]:
        """Let the user choose an audio file through a native dialog and store it."""
        return sound_api.pick_sound()

    @bridge_method
    def set_sound_trim(self, name: str, trim_start: float, trim_end: float) -> dict[str, Any]:
        """Persist the trim range of an imported sound."""
        return sound_api.set_sound_trim(name, trim_start, trim_end)

    @bridge_method
    def rename_sound(self, name: str, label: str) -> dict[str, str]:
        """Rename the display label of an imported sound."""
        return sound_api.rename_sound(name, label)

    @bridge_method
    def delete_sound(self, name: str) -> dict[str, bool]:
        """Delete an imported sound and its metadata."""
        return sound_api.delete_sound(name)

    @bridge_method
    def get_startup_options(self) -> dict[str, bool]:
        """Return the startup behavior preferences."""
        return settings_api.get_startup_options()

    @bridge_method
    def set_start_minimized(self, enabled: bool) -> dict[str, bool]:
        """Persist whether the app starts minimized with Windows."""
        return settings_api.set_start_minimized(enabled)

    @bridge_method
    def set_minimize_on_close(self, enabled: bool) -> dict[str, bool]:
        """Persist whether closing the window keeps the app in the tray."""
        return settings_api.set_minimize_on_close(enabled)

    @bridge_method
    def get_pomodoro_alarm(self) -> dict[str, Any]:
        """Return the Pomodoro alarm preferences."""
        return settings_api.get_pomodoro_alarm()

    @bridge_method
    def set_pomodoro_alarm_enabled(self, enabled: bool) -> dict[str, bool]:
        """Persist whether the Pomodoro alarm plays on session completion."""
        return settings_api.set_pomodoro_alarm_enabled(enabled)

    @bridge_method
    def set_pomodoro_alarm_volume(self, volume: int) -> dict[str, int]:
        """Persist the Pomodoro alarm volume, clamped to the 0-100 range."""
        return settings_api.set_pomodoro_alarm_volume(volume)

    @bridge_method
    def set_pomodoro_alarm_sound(self, sound: str) -> dict[str, str]:
        """Persist the file name of the Pomodoro alarm sound."""
        return settings_api.set_pomodoro_alarm_sound(sound)

    @bridge_method
    def set_pomodoro_alarm_repeat(self, enabled: bool) -> dict[str, bool]:
        """Persist whether the Pomodoro alarm repeats."""
        return settings_api.set_pomodoro_alarm_repeat(enabled)

    @bridge_method
    def set_pomodoro_alarm_repeat_count(self, count: int) -> dict[str, int]:
        """Persist the number of alarm repetitions."""
        return settings_api.set_pomodoro_alarm_repeat_count(count)

    @bridge_method
    def set_pomodoro_alarm_repeat_duration(self, seconds: int) -> dict[str, int]:
        """Persist the alarm repeat duration in seconds."""
        return settings_api.set_pomodoro_alarm_repeat_duration(seconds)

    @bridge_method
    def list_sounds(self) -> list[dict[str, str]]:
        """Return the available alarm sounds."""
        return sound_api.list_sounds()

    @bridge_method
    def get_sound_data_url(self, name: str) -> dict[str, str]:
        """Return a sound file as a base64 data URL for playback."""
        return sound_api.get_sound_data_url(name)

    @bridge_method
    def pick_sound(self) -> dict[str, str] | dict[str, bool]:
        """Let the user choose an audio file through a native dialog and store it."""
        return sound_api.pick_sound()

    @bridge_method
    def set_onboarded(self, onboarded: bool) -> dict[str, Any]:
        """Record whether the signed-in user finished the guided tour."""
        return auth_api.set_onboarded(onboarded)

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
    def pick_avatar(self) -> dict[str, Any]:
        """Choose a profile photo through a native dialog and store it."""
        return avatar_api.pick_avatar()

    @bridge_method
    def pick_avatar_raw(self) -> dict[str, Any]:
        """Let the user choose a photo and return it as a data URL."""
        return avatar_api.pick_avatar_raw()

    @bridge_method
    def set_avatar(self, data_url: str) -> dict[str, Any]:
        """Store a cropped profile photo provided as a data URL."""
        return avatar_api.set_avatar(data_url)

    @bridge_method
    def get_avatar(self) -> dict[str, str | None]:
        """Return the profile photo of the signed-in user as a data URL."""
        return avatar_api.get_avatar()

    @bridge_method
    def remove_avatar(self) -> dict[str, Any]:
        """Remove the profile photo of the signed-in user."""
        return avatar_api.remove_avatar()

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

    @bridge_method
    def set_notification_preference(self, category: str, enabled: bool) -> dict[str, bool]:
        """Turn the desktop notifications of a category on or off."""
        return notification_api.set_notification_preference(category, enabled)

    @bridge_method
    def unad_connect(self, document_type: str, document: str, password: str) -> dict[str, Any]:
        """Verify and link the UNAD Campus account of the signed-in user."""
        return unad_api.connect(document_type, document, password)

    @bridge_method
    def unad_disconnect(self) -> None:
        """Unlink the UNAD Campus account."""
        return unad_api.disconnect()

    @bridge_method
    def unad_update_settings(self, patch: dict[str, Any]) -> dict[str, Any]:
        """Change the UNAD service switch, sync interval or deadline lead time."""
        return unad_api.update_settings(patch)

    @bridge_method
    def unad_add_agenda(self, url: str) -> dict[str, Any]:
        """Follow a course agenda."""
        return unad_api.add_agenda(url)

    @bridge_method
    def unad_remove_agenda(self, agenda_id: str) -> None:
        """Stop following a course agenda."""
        return unad_api.remove_agenda(agenda_id)

    @bridge_method
    def unad_sync_now(self) -> dict[str, Any]:
        """Synchronize the UNAD profile and agendas immediately."""
        return unad_api.sync_now()
