"""
Backend-to-frontend event bus.

The backend never calls frontend functions or evaluates JavaScript. Each
event is published on the shared pywebview state object and the frontend
listens for its change notifications.
"""

# Standard library
from __future__ import annotations
import threading
from typing import Any

# Third-party
import webview

# Project imports
from desktop.utills.logger import log, Tags

EVENT_STATE_KEY: str = "creeky_event"


class EventBus:
    """Publishes named events that the frontend subscribes to."""

    def __init__(self) -> None:
        self._window: webview.Window | None = None
        self._lock: threading.Lock = threading.Lock()
        self._sequence: int = 0

    def attach(self, window: webview.Window) -> None:
        """Bind the window whose shared state carries the events."""
        self._window = window

    def emit(self, name: str, payload: dict[str, Any] | None = None) -> None:
        """
        Publish an event for the frontend.

        Args:
            name: Event name, such as ``data:changed``.
            payload: JSON-serializable data delivered with the event.
        """
        window: webview.Window | None = self._window
        if window is None:
            return
        with self._lock:
            self._sequence += 1
            message: dict[str, Any] = {
                "id": self._sequence,
                "name": name,
                "payload": payload or {},
            }
            try:
                window.state[EVENT_STATE_KEY] = message
            except Exception as error:
                log("ERROR", Tags.EVENTS, f"Could not emit {name}: {error!r}")


events: EventBus = EventBus()
