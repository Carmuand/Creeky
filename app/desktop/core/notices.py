"""
Delivery of desktop notifications raised by background services.
"""

# Standard library
from __future__ import annotations

# Project imports
from desktop.api import window_api
from desktop.core.events import events
from desktop.core.notifier import notifier


def _on_notice_clicked() -> None:
    """Bring the window forward and ask the frontend to open the notifications view."""
    window_api.restore_window()
    events.emit("notification:clicked", {"view": "notifications"})


def send_desktop_notice(title: str, text: str) -> None:
    """
    Show a native notification that opens the notifications view when clicked.

    Args:
        title: Notification title.
        text: Notification body.
    """
    notifier.send(title, text, _on_notice_clicked)
