"""
Background reminder scheduler.

Checks the signed-in user's due task reminders and pending daily habits,
stores a notification
for each one, shows it natively when the user enabled that category and
emits events for the frontend.
"""

# Standard library
from __future__ import annotations
import threading
from datetime import datetime

# Third-party
from sqlalchemy import select
from sqlalchemy.orm import selectinload

# Project imports
from desktop.api.auth_api import current_user
from desktop.api.notification_api import add_notification, desktop_enabled
from desktop.api.settings_api import read_language
from desktop.config import config
from desktop.core.events import events
from desktop.core.messages import translate
from desktop.core.notices import send_desktop_notice
from desktop.database.engine import session_scope
from desktop.database.models import Habit, Task, User
from desktop.database.serializers import habit_streak
from desktop.utills.dates import current_time_hm, today_iso
from desktop.utills.logger import log, Tags

_FIRST_CHECK_DELAY_SECONDS: float = 3.0

PendingNotice = tuple[str, str]


def _collect_task_reminders(language: str, tasks: list[Task]) -> list[PendingNotice]:
    """Mark due task reminders as fired and return their texts."""
    notices: list[PendingNotice] = []
    now: datetime = datetime.now()
    for task in tasks:
        try:
            due_at: datetime = datetime.fromisoformat(task.reminder)
        except ValueError:
            continue
        if due_at > now:
            continue
        task.reminded = True
        when: str = f"{task.due} {task.due_time}".strip()
        text: str = (
            translate(language, "task_reminder_text", title=task.title, when=when)
            if when
            else translate(language, "task_reminder_text_undated", title=task.title)
        )
        notices.append((translate(language, "task_reminder_title"), text))
    return notices


def _collect_habit_reminders(language: str, habits: list[Habit]) -> list[PendingNotice]:
    """Mark pending habits as pinged for today and return their texts."""
    notices: list[PendingNotice] = []
    today: str = today_iso()
    current_time: str = current_time_hm()
    for habit in habits:
        dates: set[str] = {check.date for check in habit.checks}
        if habit.last_ping == today or today in dates:
            continue
        if current_time < (habit.notify_time or "09:00"):
            continue
        habit.last_ping = today
        notices.append(
            (
                translate(language, "habit_reminder_title", name=habit.name),
                translate(language, "habit_reminder_text", streak=habit_streak(dates)),
            )
        )
    return notices


def check_reminders() -> None:
    """Run one reminder pass over the tasks and habits of the signed-in user."""
    with session_scope() as session:
        user: User | None = current_user(session)
        if user is None:
            return
        language: str = read_language(session)
        tasks: list[Task] = list(
            session.scalars(
                select(Task).where(
                    Task.user_id == user.id,
                    Task.deleted.is_(False),
                    Task.done.is_(False),
                    Task.reminded.is_(False),
                    Task.reminder != "",
                )
            )
        )
        habits: list[Habit] = list(
            session.scalars(
                select(Habit)
                .options(selectinload(Habit.checks))
                .where(Habit.user_id == user.id, Habit.notify.is_(True))
            )
        )
        task_notices: list[PendingNotice] = _collect_task_reminders(language, tasks)
        habit_notices: list[PendingNotice] = _collect_habit_reminders(language, habits)
        for title, text in task_notices + habit_notices:
            add_notification(session, user.id, title, text, "reminder")
            session.flush()
        desktop_notices: list[PendingNotice] = []
        if desktop_enabled(session, user.id, "tasks"):
            desktop_notices.extend(task_notices)
        if desktop_enabled(session, user.id, "habits"):
            desktop_notices.extend(habit_notices)

    if not task_notices and not habit_notices:
        return
    for title, text in desktop_notices:
        send_desktop_notice(title, text)
    events.emit("data:changed", {"source": "reminders"})
    events.emit("reminder:fired", {"tasks": len(task_notices), "habits": len(habit_notices)})
    log(
        "INFO",
        Tags.SCHEDULER,
        f"Reminders fired: {len(task_notices)} task(s), {len(habit_notices)} habit(s)",
    )


class ReminderScheduler:
    """Runs the reminder check periodically on a daemon thread."""

    def __init__(self) -> None:
        self._thread: threading.Thread | None = None
        self._stop: threading.Event = threading.Event()

    def start(self) -> None:
        """Start the periodic checks."""
        if self._thread is not None:
            return
        self._thread = threading.Thread(target=self._run, name="creeky-reminders", daemon=True)
        self._thread.start()
        log("INFO", Tags.SCHEDULER, "Reminder scheduler started")

    def stop(self) -> None:
        """Stop the periodic checks."""
        self._stop.set()

    def _run(self) -> None:
        """Check reminders until the scheduler is stopped."""
        delay: float = _FIRST_CHECK_DELAY_SECONDS
        while not self._stop.wait(delay):
            delay = float(config.reminder_interval_seconds)
            try:
                check_reminders()
            except Exception as error:
                log("ERROR", Tags.SCHEDULER, f"Reminder check failed: {error!r}")


scheduler: ReminderScheduler = ReminderScheduler()
